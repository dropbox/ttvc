import {AddAnnotationType, AnnotationNameEnum} from './annotations.js';

export const enum MutationReason {
  STYLE_ATTRIBUTE_MODIFIED = 'STYLE_ATTRIBUTE_MODIFIED',
  HIDDEN_ATTRIBUTE_MODIFIED = 'HIDDEN_ATTRIBUTE_MODIFIED',
  DOM_NODE_ADDED = 'DOM_NODE_ADDED',
  IMAGE_ATTRIBUTE_MODIFIED = 'IMAGE_ATTRIBUTE_MODIFIED',
  IMAGE_DOM_NODE_ADDED = 'IMAGE_DOM_NODE_ADDED',
}

export const enum HTMLAttribute {
  ATTRIBUTE_NAME = 'data-visuallycomplete',
  IGNORE_VALUE = 'IGNORE',
}

export type InViewportMutationObserverCallback = (mutation: Mutation) => void;

export interface InViewportMutationObserverParams {
  /** The callback that will be invoked when an in-viewport mutation occurs */
  callback: InViewportMutationObserverCallback;
  /** A function to add annotations while observing */
  addAnnotation?: AddAnnotationType;
  /** MutationObserver class, used for testing */
  MutationObserverClass?: typeof MutationObserver;
  /** IntersectionObserver class, used for testing */
  IntersectionObserverClass?: typeof IntersectionObserver;
}

// This set is needed to be access it by different classes in order to track images loading progression
const loadingImages: Set<HTMLElement | null> = new Set();

/**
 * The InViewportMutationObserver class listens for DOM mutations that happen on a visible DOM
 * node that has entered the viewport at least once while observing.
 *
 * Given a DOM Node A, the MutationObserver will listen for all mutations underneath it. Let's
 * say 2 children are added, one which is currently in the viewport "B" and one which is not in
 * the viewport "C". The MutationObserver callback receives the newly added B and C and applies
 * the IntersectionObserver on both of them.  Since B is in the viewport, the
 * IntersectionObserver will call the callback for B soon after. If, some time C is scrolled
 * into the viewport or otherwise made visible, the callback for C will be invoked.
 *
 *                        MutationObserver.observe(A)
 *  *B added (in viewport)* /                  \ *C added (not in viewport)*
 *           MutationCallback(B)                MutationCallback(C)
 *                    |                                  |
 *      IntersectionObserver.observe(B)       IntersectionObserver.observe(C)
 *                    |                                  | *if C becomes visible in viewport*
 *        IntersectionCallback(B)                IntersectionCallback(C)
 *
 * In this way we can know when elements are visible in the viewport without having to use
 * getBoundingClientRect/getComputedStyles which would otherwise be expensive.
 */
export class InViewportMutationObserver {
  private callback: InViewportMutationObserverCallback;
  private intersectionObserver: IntersectionObserver;
  private intersectionImageObserver: IntersectionObserver;
  private mutationObserver: MutationObserver;
  private pendingMutations: Map<HTMLElement, Mutation> = new Map();
  private mutationObserverConfig: MutationObserverInit = {
    attributeFilter: ['hidden', 'style', 'src'],
    attributeOldValue: true,
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  };
  private isObserving = false;
  private addAnnotation: AddAnnotationType;
  private supportsVisibilityState: boolean;
  private intersectionsScheduledCount = 0;
  private mutatationsObservedCount = 0;
  private intersectionsObservedCount = 0;
  private totalMutationCallbackLatencyOverhead = 0;
  private totalIntersectionCallbackLatencyOverhead = 0;
  private pageHasImages = false;
  public wasDocumentHiddenAtSomePoint = false;

  constructor(params: InViewportMutationObserverParams) {
    this.callback = params.callback;
    const MutationObserverClass = params.MutationObserverClass ?? MutationObserver;
    const IntersectionObserverClass = params.IntersectionObserverClass ?? IntersectionObserver;
    this.mutationObserver = new MutationObserverClass(this.mutationObserverCallback);
    this.intersectionObserver = new IntersectionObserverClass(this.intersectionObserverCallback);
    // We are using a separate observer to filter images in the viewport, we wanted to decouple this codeflow to help with readability and performance to avoid adding unexpected side effects from the previous one
    this.intersectionImageObserver = new IntersectionObserver(
      this.imageIntersectionObserverCallback
    );
    this.supportsVisibilityState =
      document.visibilityState !== undefined || document.hidden !== undefined;
    this.addAnnotation = params.addAnnotation ?? (() => {});
  }

  private loadingImagesPromise = new Promise((resolve, reject) => {
    const handleImageLoadOrError = (event: Event) => {
      this.intersectionImageObserver.unobserve(event.target as HTMLElement);
      loadingImages.delete(event.target as HTMLElement);
      if (loadingImages.size === 0) {
        resolve(performance.now());
        window.document.removeEventListener('load', handleImageLoadOrError);
        window.document.removeEventListener('error', handleImageLoadOrError);
      }
    };
    window.document.addEventListener('load', handleImageLoadOrError, {capture: true});
    window.document.addEventListener('error', handleImageLoadOrError, {capture: true});
  });

  /**
   * This function will wait for all images to load and will return the time when they finished loading
   */
  public waitForLoadingImages = () => {
    if (!this.pageHasImages) {
      return Promise.resolve(0);
    }
    return this.loadingImagesPromise;
  };

  public observe(target: HTMLElement) {
    this.isObserving = true;
    this.mutationObserver.observe(target, this.mutationObserverConfig);
  }

  public disconnect() {
    if (this.isObserving) {
      this.isObserving = false;
      this.addAnnotations();
      this.mutationObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.pendingMutations.clear();
      this.intersectionImageObserver.disconnect();
    }
  }

  private mutationObserverCallback = (mutationRecords: MutationRecord[]) => {
    const beforeProcessingTime = performance.now();

    this.mutatationsObservedCount += mutationRecords.length;
    const mutations =
      InViewportMutationRecordToMutationsProcessor.processMutationRecords(mutationRecords);

    mutations.forEach((mutation: Mutation) => {
      if (this.isDocumentHidden()) {
        /** Design decision: when the document is hidden, consider all mutations as in viewport */
        this.callback(mutation);
      } else {
        this.scheduleIntersectionObservation(mutation);
      }
    });

    this.totalMutationCallbackLatencyOverhead += performance.now() - beforeProcessingTime;
  };

  private intersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
    const beforeProcessingTime = performance.now();

    this.intersectionsObservedCount += entries.length;
    entries.forEach((entry) => {
      const target = entry.target;

      if (entry.isIntersecting) {
        this.intersectionObserver.unobserve(target);

        if (target instanceof HTMLElement && this.pendingMutations.get(target)) {
          const mutation = this.pendingMutations.get(target)!;
          mutation.intersectionObserverEntry = entry;

          /**
           * The entries passed into the intersection callback can contain multiple entries for
           * the same element. The pendingMutations logic ensures we dont call the callback
           * multiple times in that case.
           */
          this.pendingMutations.delete(target);
          this.callback(mutation);
        }
      }
    });

    this.totalIntersectionCallbackLatencyOverhead += performance.now() - beforeProcessingTime;
  };

  private imageIntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.pageHasImages = true;
        loadingImages.add(entry.target as HTMLElement);
      }
    });
  };

  private scheduleIntersectionObservation(mutation: Mutation) {
    this.intersectionsScheduledCount++;
    this.pendingMutations.set(mutation.target, mutation);
    this.intersectionObserver.observe(mutation.target);

    //Find image nodes and adds them to set
    //Part 1. Find all img elms that children of targetWrapepr.element
    const childrenElms = mutation.target.querySelectorAll('img');
    //Part 2. Check if that element is complete all ready
    childrenElms.forEach((img) => {
      //Part 3. If not add element to set
      if (img && !img.complete) {
        this.intersectionImageObserver.observe(img);
      }
    });
  }

  private addAnnotations() {
    this.addAnnotation(
      AnnotationNameEnum.VC_INTERSECTIONS_SCHEDULED_COUNT,
      this.intersectionsScheduledCount
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_MUTATIONS_OBSERVED_COUNT,
      this.mutatationsObservedCount
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_INTERSECTIONS_OBSERVED_COUNT,
      this.intersectionsObservedCount
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_TOTAL_MUTATION_CALLBACK_LATENCY_OVERHEAD_MS,
      this.totalMutationCallbackLatencyOverhead
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_TOTAL_INTERSECTION_CALLBACK_LATENCY_OVERHEAD_MS,
      this.totalIntersectionCallbackLatencyOverhead
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_TOTAL_CALLBACK_LATENCY_OVERHEAD_MS,
      this.totalMutationCallbackLatencyOverhead + this.totalIntersectionCallbackLatencyOverhead
    );
    this.addAnnotation(
      AnnotationNameEnum.VC_ELEMENTS_SCHEDULED_FOR_OBSERVATION_BUT_NOT_OBSERVED_COUNT,
      this.pendingMutations.size
    );
  }

  /** This function made public for testing */
  public isDocumentHidden() {
    const isHidden =
      this.supportsVisibilityState && document.visibilityState !== undefined
        ? document.visibilityState === 'hidden'
        : document.hidden;

    if (isHidden && !this.wasDocumentHiddenAtSomePoint) {
      this.wasDocumentHiddenAtSomePoint = true;
    }

    return isHidden;
  }
}

export class InViewportMutationRecordToMutationsProcessor {
  mutationRecord: MutationRecord;
  elementWrapper: ElementWrapper;

  constructor(mutationRecord: MutationRecord) {
    this.mutationRecord = mutationRecord;
    this.elementWrapper = ElementWrapperFactory.makeElementWrapper(
      mutationRecord.target as HTMLElement
    );
  }

  static processMutationRecords(mutationRecords: MutationRecord[]) {
    const mutations = [];

    for (const mutationRecord of mutationRecords) {
      mutations.push(
        ...new InViewportMutationRecordToMutationsProcessor(mutationRecord).toMutations()
      );
    }

    return mutations;
  }

  private toMutations(): Mutation[] {
    if (!this.elementWrapper.isInRenderTree()) {
      return [];
    } else if (this.didAddNodes()) {
      return this.findMutationsWithinNodeList(this.mutationRecord.addedNodes);
    } else if (this.didModifyHiddenAttribute()) {
      return [this.toMutation(MutationReason.HIDDEN_ATTRIBUTE_MODIFIED)];
    } else if (this.didModifyStyleAttribute()) {
      return [this.toMutation(MutationReason.STYLE_ATTRIBUTE_MODIFIED)];
    } else if (this.didModifyImageAttributes()) {
      return [this.toMutation(MutationReason.IMAGE_ATTRIBUTE_MODIFIED)];
    }

    return [];
  }

  private toMutation(reason: MutationReason) {
    return new Mutation(this.elementWrapper, reason);
  }

  private didAddNodes() {
    return this.mutationRecord.type === 'childList' && this.mutationRecord.addedNodes?.length;
  }

  private didModifyHiddenAttribute() {
    return this.mutationRecord.attributeName === 'hidden' && !this.elementWrapper.isHidden;
  }

  private didModifyStyleAttribute() {
    return (
      this.mutationRecord.attributeName === 'style' &&
      this.elementWrapper.doesStyleHideElement(this.mutationRecord.oldValue) &&
      !this.elementWrapper.doesStyleHideElement()
    );
  }

  private didModifyImageAttributes() {
    return (
      this.elementWrapper.element.tagName === 'IMG' && this.mutationRecord.attributeName === 'src'
    );
  }

  private findMutationsWithinNodeList(nodeList: NodeList) {
    const mutations: Mutation[] = [];

    ElementWrapperFactory.fromNodeList(nodeList).forEach((elementWrapper) => {
      mutations.push(new Mutation(elementWrapper, MutationReason.DOM_NODE_ADDED));
    });

    return mutations;
  }
}

export class Mutation {
  timestamp: number;
  reason: MutationReason;
  target: HTMLElement;
  targetWrapper: ElementWrapper;
  intersectionObserverEntry: IntersectionObserverEntry;

  constructor(targetWrapper: ElementWrapper, reason: MutationReason) {
    this.reason = reason;
    this.timestamp = performance.now();
    this.targetWrapper = targetWrapper;
    this.target = targetWrapper.element;
  }
}

/**
 * The ElementWrapper class is a light wrapper around an HTMLElement to provide some useful
 * functionalilty for determining visibility and visual completeness.
 */
class ElementWrapper {
  element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  get isIgnored() {
    const attributeValue = (
      this.element.getAttribute(HTMLAttribute.ATTRIBUTE_NAME) || ''
    ).toLowerCase();

    return attributeValue === HTMLAttribute.IGNORE_VALUE.toLowerCase();
  }

  get isHidden() {
    return this.doesStyleHideElement() || this.element.hasAttribute('hidden');
  }

  get isHTMLElement() {
    return this.element instanceof HTMLElement;
  }

  /**
   * isInRenderTree scans up the tree to see if any ancestor DOM nodes are hidden.
   * It does not rely on computed styles for performance reasons, so it may produce some false
   * positives, but these can be filtered out at a higher level (e.g. via IntersectionObserver).
   */
  isInRenderTree() {
    let currElement: HTMLElement | null = this.element;

    while (currElement) {
      const wrapper = ElementWrapperFactory.makeElementWrapper(currElement);

      if (!wrapper.isHTMLElement || wrapper.isHidden || wrapper.isIgnored) {
        return false;
      }

      currElement = currElement.parentElement;
    }

    return true;
  }

  doesStyleHideElement(styleAttribute: string | null | undefined = undefined) {
    if (styleAttribute === undefined) {
      styleAttribute = this.element.getAttribute('style');
    }

    if (styleAttribute === null || styleAttribute === '') {
      return false;
    }
    styleAttribute = styleAttribute.replace(/ /g, '');

    return (
      styleAttribute.includes('visibility:hidden') ||
      styleAttribute.includes('display:none') ||
      styleAttribute.includes('content-visibility:hidden')
    );
  }
}

export class ElementWrapperFactory {
  static fromNodeList(nodeList: NodeList): ElementWrapper[] {
    return Array.from(nodeList)
      .map((element) => this.makeElementWrapper(element as HTMLElement))
      .filter((elementWrapper) => {
        return elementWrapper.isInRenderTree();
      });
  }

  static makeElementWrapper(element: HTMLElement): ElementWrapper {
    return new ElementWrapper(element);
  }
}
