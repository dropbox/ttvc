import {Logger} from './util/logger';

export type Message = 'IDLE' | 'BUSY';
type Subscriber = (message: Message) => void;
type ResourceLoadingElement = HTMLScriptElement | HTMLLinkElement | HTMLImageElement;

/**
 * Alerts subscribers to the presence or absence of pending AJAX requests
 *
 * Use `increment` and `decrement` public methods to instrument your AJAX
 * requests.
 */
class AjaxIdleObservable {
  private pendingRequests = 0;
  private subscribers = new Set<Subscriber>();

  private next = (message: Message) => {
    Logger.debug('AjaxIdleObservable.next()', message);
    this.subscribers.forEach((subscriber) => subscriber(message));
  };

  /** call this whenever an instrumented AJAX request is triggered */
  increment = () => {
    if (this.pendingRequests === 0) {
      this.next('BUSY');
    }
    this.pendingRequests += 1;
  };

  /** call this whenever an instrumented AJAX request is resolved */
  decrement = () => {
    if (this.pendingRequests === 1) {
      this.next('IDLE');
    }
    this.pendingRequests = Math.max(this.pendingRequests - 1, 0);
    if (this.pendingRequests < 10) {
      Logger.debug(
        'AjaxIdleObservable.decrement()',
        '::',
        'pendingRequests =',
        this.pendingRequests
      );
    }
  };

  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    const unsubscribe = () => {
      this.subscribers.delete(subscriber);
    };
    return unsubscribe;
  };
}

/** Alerts subscribers to the presence or absence of pending resources */
class ResourceLoadingIdleObservable {
  private pendingResources = new Set<ResourceLoadingElement>();
  private subscribers = new Set<Subscriber>();

  constructor() {
    // watch out for SSR
    if (window?.MutationObserver) {
      window.addEventListener('load', () => {
        // watch for added or updated script tags
        const o = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (
                node instanceof HTMLScriptElement ||
                node instanceof HTMLLinkElement ||
                node instanceof HTMLImageElement
              ) {
                this.add(node);
              } else if (node.hasChildNodes() && node instanceof HTMLElement) {
                // images may be mounted within large subtrees, this is less
                // common with link/script elements
                node.querySelectorAll('img').forEach(this.add);
              }
            });
          });
        });

        // watch for new tags added anywhere in the document
        o.observe(window.document.documentElement, {childList: true, subtree: true});

        // as resources load, remove them from pendingResources
        ['load', 'error'].forEach((eventType) => {
          window.document.addEventListener(
            eventType,
            (event) => {
              if (
                event.target instanceof HTMLScriptElement ||
                event.target instanceof HTMLLinkElement ||
                event.target instanceof HTMLImageElement
              ) {
                this.remove(event.target);
              }
            },
            {capture: true}
          );
        });
      });
    }
  }

  private next = (message: Message) => {
    Logger.debug('ResourceLoadingIdleObservable.next()', message);
    this.subscribers.forEach((subscriber) => subscriber(message));
  };

  private add = (element: ResourceLoadingElement) => {
    // if element is an image and it's complete, ignore it
    if (element instanceof HTMLImageElement && element.complete) {
      return;
    }

    if (this.pendingResources.size === 0) {
      this.next('BUSY');
    }
    this.pendingResources.add(element);
  };

  private remove = (element: ResourceLoadingElement) => {
    this.pendingResources.delete(element);
    if (this.pendingResources.size === 0) {
      this.next('IDLE');
    }
    if (this.pendingResources.size < 10) {
      Logger.debug(
        'ResourceLoadingIdleObservable.remove()',
        '::',
        'pendingResources =',
        this.pendingResources
      );
    }
  };

  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    const unsubscribe = () => {
      this.subscribers.delete(subscriber);
    };
    return unsubscribe;
  };
}

/**
 * DO NOT INTIALIZE THIS CLASS DIRECTLY. Use getNetworkIdleObservable instead.
 *
 * Alerts subscribers to the presence or absence of _any_ observable network
 * activity. Combines the functionalities of AjaxIdleObservable and
 * ScriptLoadingIdleObservable.
 */
export class NetworkIdleObservable {
  private ajaxIdleObservable = new AjaxIdleObservable();
  private resourceLoadingIdleObservable = new ResourceLoadingIdleObservable();
  private subscribers = new Set<Subscriber>();

  // idle state
  private ajaxIdle = true;
  private scriptLoadingIdle = true;

  constructor() {
    this.ajaxIdleObservable.subscribe(this.handleUpdate('AJAX'));
    this.resourceLoadingIdleObservable.subscribe(this.handleUpdate('RESOURCE_LOADING'));
  }

  private handleUpdate = (source: 'AJAX' | 'RESOURCE_LOADING') => (message: Message) => {
    const wasIdle = this.ajaxIdle && this.scriptLoadingIdle;

    // update state
    if (source === 'AJAX') {
      this.ajaxIdle = message === 'IDLE';
    }
    if (source === 'RESOURCE_LOADING') {
      this.scriptLoadingIdle = message === 'IDLE';
    }

    // if this is a change, notify subscribers
    const isIdle = this.ajaxIdle && this.scriptLoadingIdle;
    if (wasIdle !== isIdle) {
      this.next(isIdle ? 'IDLE' : 'BUSY');
    }
  };

  private next = (message: Message) => {
    Logger.debug('NetworkIdleObservable.next()', message);
    this.subscribers.forEach((subscriber) => subscriber(message));
  };

  /**
   * Call this to notify ttvc that an AJAX request has just begun.
   *
   * Instrument your site's AJAX requests with `incrementAjaxCount` and
   * `decrementAjaxCount` to ensure that ttvc is not reported early.
   */
  incrementAjaxCount = () => this.ajaxIdleObservable.increment();

  /**
   * Call this to notify ttvc that an AJAX request has just resolved.
   *
   * Instrument your site's AJAX requests with `incrementAjaxCount` and
   * `decrementAjaxCount` to ensure that ttvc is not reported early.
   */
  decrementAjaxCount = () => this.ajaxIdleObservable.decrement();

  isIdle = () => {
    return this.ajaxIdle && this.scriptLoadingIdle;
  };

  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    const unsubscribe = () => {
      this.subscribers.delete(subscriber);
    };
    return unsubscribe;
  };
}

// expose observable as a singleton
let networkIdleObservable: NetworkIdleObservable;
export const getNetworkIdleObservable = () => {
  if (!networkIdleObservable) {
    networkIdleObservable = new NetworkIdleObservable();
  }
  return networkIdleObservable;
};
