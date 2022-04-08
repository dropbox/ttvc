export type InViewportMutationObserverCallback = (mutation: TimestampedMutationRecord) => void;
export type TimestampedMutationRecord = MutationRecord & {timestamp: number};

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
  private mutations: Map<Node, TimestampedMutationRecord> = new Map();

  constructor({callback}: {callback: InViewportMutationObserverCallback}) {
    this.callback = callback;
    this.mutationObserver = new MutationObserver(this.mutationObserverCallback);
    this.intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback);
  }

  public observe(target: HTMLElement) {
    this.mutationObserver.observe(target, this.mutationObserverConfig);
  }

  public disconnect() {
    this.mutationObserver.disconnect();
    this.intersectionObserver.disconnect();
  }

  private mutationObserverCallback: MutationCallback = (mutations) => {
    mutations.forEach((mutation: TimestampedMutationRecord) => {
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
      // console.log(entry);
      if (entry.isIntersecting && this.mutations.has(entry.target)) {
        const mutation = this.mutations.get(entry.target);
        this.callback(mutation);
      }
      this.mutations.delete(entry.target);
      this.intersectionObserver.unobserve(entry.target);
    });
  };
}
