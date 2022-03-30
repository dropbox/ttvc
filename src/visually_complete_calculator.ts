import {InViewportMutationObserver, Mutation} from './in_viewport_mutation_observer.js';
import {AddAnnotationType, AnnotationNameEnum} from './annotations.js';
import {waitForPageLoad} from './utils.js';

declare const process: NodeJS.Process;

export interface VisuallyCompleteCalculatorParams {
  /** The root element to monitor for visual completeness */
  target: HTMLElement;
  /** The UNIX timestamp to compare the calculation against (e.g. navigation start time) */
  calculationStartTimestamp?: number;
  /** The InViewportMutationObserver class, only used for testing */
  InViewportMutationObserverClass?: typeof InViewportMutationObserver;
  /** additional metrics produced to provide insight into the calculation for logging. */
  addAnnotation?: AddAnnotationType;
}

/**
 * The VisuallyCompleteCalculator watches for any changes in the viewport for a given DOM node
 * and tracks the timestamp it occurs and uses those to determine when that DOM node became
 * visually complete.
 */
export class VisuallyCompleteCalculator {
  private hasInitialized = false;
  private hasUserInteractedWithPage = false;
  private target: HTMLElement;
  private calculationStartTimestamp: number;
  private mutations: Mutation[] = [];
  private inViewportMutationObserver: InViewportMutationObserver;
  private isSupportedEnvironment = VisuallyCompleteCalculator.isSupportedEnvironment();
  private addAnnotation: AddAnnotationType;
  /** DOM Events which we'll consider a user interaction */
  private userInteractionEvents: string[] = ['click'];

  /**
   * Determine whether the calculator should run in the current environment
   *
   * @param shouldLogMetric - gate used for rollout, passed in as an argument for testing
   */
  static isSupportedEnvironment() {
    return (
      window !== undefined &&
      'MutationObserver' in window &&
      'IntersectionObserver' in window &&
      typeof document.querySelectorAll === 'function' &&
      window.performance?.timing != null // use != to check against null AND undefined
    );
  }

  constructor(params: VisuallyCompleteCalculatorParams) {
    if (!this.isSupportedEnvironment) {
      return;
    }

    this.target = params.target;
    this.calculationStartTimestamp = params.calculationStartTimestamp ?? 0;
    this.addAnnotation = params.addAnnotation || (() => {});
    const InViewportMutationObserverClass =
      params.InViewportMutationObserverClass ?? InViewportMutationObserver;
    this.inViewportMutationObserver = new InViewportMutationObserverClass({
      callback: this.mutationObserverCallback,
      addAnnotation: this.addAnnotation,
    });
  }

  /** Initialize the calculator - this will start observing elements via mutation observer. */
  start(): void {
    if (!this.isSupportedEnvironment) {
      return;
    }

    this.hasInitialized = true;
    this.inViewportMutationObserver.observe(this.target);
    this.addEventListeners();
  }

  /**
   * Calculate the time of visually complete. The calculator is backwards looking, so it's up to
   * the caller to determine when it is safe to assume visually complete has occurred and to call
   * `attemptMeasurement` at that point.
   *
   * @returns the number of milliseconds between the last DOM mutation and the startTime
   */
  async attemptMeasurement(): Promise<number | null> {
    if (!this.isSupportedEnvironment) {
      return null;
    }

    if (!this.hasInitialized) {
      throw new Error('Programmer error: must call `start` before `attemptMeasurement`');
    }

    this.stopObserving();

    if (!this.mutations.length) {
      return null;
    }

    const lastImageTime = await this.inViewportMutationObserver.waitForLoadingImages();

    this.addAnnotation(
      AnnotationNameEnum.VC_IN_VIEWPORT_MUTATION_OBSERVED_COUNT,
      this.mutations.length
    );

    // Here we are returning the number of milliseconds from the last dom mutation to the given start timestamp
    // of the calculation

    if (
      this.hasUserInteractedWithPage ||
      this.inViewportMutationObserver.wasDocumentHiddenAtSomePoint
    ) {
      return null;
    }

    return typeof lastImageTime === 'number'
      ? Math.max(this.getLastDOMMutationTimestamp() - this.calculationStartTimestamp, lastImageTime)
      : this.getLastDOMMutationTimestamp() - this.calculationStartTimestamp;
  }

  private mutationObserverCallback = (mutation: Mutation) => {
    this.mutations.push(mutation);
  };

  private getLastDOMMutationTimestamp(): number {
    if (!this.mutations.length) {
      throw new Error(
        'Programmer error - getLastDOMMutationTimestamp should only be called if there are mutations'
      );
    }

    return Math.max(...this.mutations.map((mutation) => mutation.timestamp));
  }

  private stopObserving() {
    this.inViewportMutationObserver.disconnect();
    this.removeEventListeners();
  }

  private onUserInteraction = () => {
    if (!this.hasUserInteractedWithPage) {
      this.hasUserInteractedWithPage = true;
    }
    this.removeEventListeners();
  };

  private addEventListeners() {
    const events = this.userInteractionEvents;
    events.forEach((eventName) => {
      window.addEventListener(eventName, this.onUserInteraction);
    });
  }

  private removeEventListeners() {
    const events = this.userInteractionEvents;
    events.forEach((eventName) => {
      window.removeEventListener(eventName, this.onUserInteraction);
    });
  }
}

// Inherit the VisuallyCompleteCalculatorParams but make `target` optional
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type PageLoadVisuallyCompleteCalculatorParams = PartialBy<
  VisuallyCompleteCalculatorParams,
  'target'
>;

/**
 * Light wrapper around the VisuallyCompleteCalculator for use to monitor visual completeness of
 * a fresh page load.
 */
export class PageLoadVisuallyCompleteCalculator extends VisuallyCompleteCalculator {
  constructor(params: PageLoadVisuallyCompleteCalculatorParams = {}) {
    if (VisuallyCompleteCalculator.isSupportedEnvironment()) {
      super({
        ...params,
        target: document.querySelector('body')!,
      });
    } else {
      // If the environment isn't supported, we can't reliably select a DOM node
      // and start time. We still need to initialize the class however,
      // otherwise we'll trigger an uncaught exception.
      // @ts-ignore-next-line "target" cannot be defined in unsupported environments
      super(params);
    }
  }

  async attemptMeasurement() {
    await waitForPageLoad();
    return super.attemptMeasurement();
  }
}
