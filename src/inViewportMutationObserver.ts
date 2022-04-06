export type InViewportMutationObserverCallback = (mutation: MutationRecord) => void;

// TODO: Consider adopting ES6 Observable interface
// TODO: Consider flattening this class into the module scope.

export class InViewportMutationObserver {
  private callback: InViewportMutationObserverCallback;
  private intersectionObserver: IntersectionObserver;
  private mutationObserver: MutationObserver;
  private mutationObserverConfig: MutationObserverInit = {
    attributeFilter: ['hidden', 'style', 'src'],
    attributeOldValue: true,
    attributes: true,
    childList: true,
    subtree: true,
  };
  private mutations: WeakMap<Node, MutationRecord> = new WeakMap();
  private loadingImages: Set<HTMLElement | null> = new Set();
  private lastImageLoadTimestamp = 0;
  private imageLoadCallback?: () => void;

  constructor({callback}: {callback: InViewportMutationObserverCallback}) {
    this.callback = callback;
    this.mutationObserver = new MutationObserver(this.mutationObserverCallback);
    this.intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback);

    window.document.addEventListener('load', this.handleImageLoadOrError, {capture: true});
    window.document.addEventListener('error', this.handleImageLoadOrError, {capture: true});
  }

  private handleImageLoadOrError = (event) => {
    if (this.loadingImages.has(event.target)) {
      this.lastImageLoadTimestamp = performance.now();
    }
    this.loadingImages.delete(event.target as HTMLElement);
    if (this.loadingImages.size === 0) {
      this.imageLoadCallback?.();
    }
  };

  /**
   * This function will wait for all images to load and will return the time when they finished loading
   * TODO: Decouple this from InViewportMutationObserver
   */
  public waitForLoadingImages = (): Promise<number> => {
    if (this.loadingImages.size === 0) {
      return Promise.resolve(this.lastImageLoadTimestamp);
    }
    return new Promise((resolve) => {
      this.imageLoadCallback = () => resolve(this.lastImageLoadTimestamp);
    });
  };

  public observe(target: HTMLElement) {
    // this.isObserving = true;
    this.mutationObserver.observe(target, this.mutationObserverConfig);
  }

  public disconnect() {
    this.mutationObserver.disconnect();
    this.intersectionObserver.disconnect();
  }

  private mutationObserverCallback: MutationCallback = (mutations) => {
    mutations.forEach((mutation) => {
      console.log(mutation);
      // @ts-ignore FIXME
      mutation.timestamp = performance.now();

      let target: Element | null = null;
      if (mutation.target instanceof Element) target = mutation.target;
      if (mutation.target instanceof Text) target = mutation.target.parentElement;

      switch (mutation.type) {
        case 'childList':
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.intersectionObserver.observe(node);
              this.mutations.set(node, mutation);
            }
            if (node instanceof Text) {
              this.intersectionObserver.observe(node.parentElement);
              this.mutations.set(node.parentElement, mutation);
            }
          });
          break;
        case 'attributes':
        default:
          this.intersectionObserver.observe(target);
          this.mutations.set(target, mutation);
      }
    });
  };

  private intersectionObserverCallback: IntersectionObserverCallback = (entries) => {
    entries.forEach((entry) => {
      console.log(entry);
      if (entry.isIntersecting && this.mutations.has(entry.target)) {
        const mutation = this.mutations.get(entry.target)!;
        this.mutations.delete(entry.target);
        this.callback(mutation);

        if (mutation.target instanceof HTMLElement) {
          // Find image nodes and adds them to set
          // Part 1. Find all img elms that children of targetWrapper.element
          const imgs = mutation.target.querySelectorAll('img');
          imgs.forEach((img) => {
            // Part 2. Check if that element is complete already
            if (img && !img.complete) {
              // Part 3. If not, add element to set
              this.loadingImages.add(img);
            }
          });
        }
      }
    });
  };
}
