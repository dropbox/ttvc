import {Logger} from './util/logger';

export type InViewportMutationObserverCallback = (mutation: TimestampedMutationRecord) => void;
export interface TimestampedMutationRecord extends MutationRecord {timestamp: number};

/**
 * Instantiate this class to monitor mutation events that occur *within the
 * viewport*.
 *
 * This class is modeled after the standard MutationObserver API, but does not
 * report mutations that did not occur within the viewport.
 *
 * @example
 * const observer = new InViewportMutationObserver((mutation) => {
 *   // do something with the mutation
 * });
 *
 * // begin watching for visible mutations to the body element
 * observer.observe(document.body);
 *
 * // stop watching for mutations
 * observer.disconnect();
 */
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

  constructor(callback: InViewportMutationObserverCallback) {
    this.callback = callback;
    this.mutationObserver = new MutationObserver(this.mutationObserverCallback);
    this.intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback);
  }

  public observe(target: HTMLElement) {
    Logger.info('InViewportMutationObserver.observe()', '::', 'target =', target);
    this.mutationObserver.observe(target, this.mutationObserverConfig);
  }

  public disconnect() {
    Logger.info('InViewportMutationObserver.disconnect()');
    this.mutationObserver.disconnect();
    this.intersectionObserver.disconnect();
  }

  private mutationObserverCallback: MutationCallback = (mutations) => {
    Logger.debug(
      'InViewportMutationObserver.mutationObserverCallback()',
      '::',
      'mutations =',
      mutations
    );
    mutations.forEach((mutation: MutationRecord) => {
      const timestampedMutation: TimestampedMutationRecord = {
        ...mutation,
        timestamp: performance.now(),
      };

      let target: Element | null = null;
      if (timestampedMutation.target instanceof Element) target = timestampedMutation.target;
      if (timestampedMutation.target instanceof Text) target = timestampedMutation.target.parentElement;

      switch (timestampedMutation.type) {
        case 'childList':
          timestampedMutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.intersectionObserver.observe(node);
              this.mutations.set(node, timestampedMutation);
            }
            if (node instanceof Text && node.parentElement != null) {
              this.intersectionObserver.observe(node.parentElement);
              this.mutations.set(node.parentElement, timestampedMutation);
            }
          });
          break;
        case 'attributes':
        default:
          this.intersectionObserver.observe(target!);
          this.mutations.set(target!, timestampedMutation);
      }
    });
  };

  private intersectionObserverCallback: IntersectionObserverCallback = (entries) => {
    Logger.debug(
      'InViewportMutationObserver.intersectionObserverCallback()',
      '::',
      'entries =',
      entries
    );
    entries.forEach((entry) => {
      if (entry.isIntersecting && this.mutations.has(entry.target)) {
        const mutation = this.mutations.get(entry.target);
        Logger.info('InViewportMutationObserver.callback()', '::', 'mutation =', mutation);
        this.callback(mutation!);
      }
      this.mutations.delete(entry.target);
      this.intersectionObserver.unobserve(entry.target);
    });
  };
}
