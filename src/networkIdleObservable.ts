import {MINIMUM_IDLE_MS} from './constants';

export type Message = 'IDLE' | 'BUSY';
type Subscriber = (message: Message) => void;

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
    this.pendingRequests -= 1;
    if (this.pendingRequests === 0) {
      this.next('IDLE');
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

/** Alerts subscribers to the presence or absence of pending script resources */
class ScriptLoadingIdleObservable {
  private pendingScripts = new Set<HTMLScriptElement | HTMLLinkElement>();
  private subscribers = new Set<Subscriber>();

  constructor() {
    // watch out for SSR
    if (window?.MutationObserver) {
      window.addEventListener('load', () => {
        // watch for added or updated script tags
        const o = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
                this.add(node);
              }
            });
          });
        });

        // watch for new tags added as direct children of <head> and <body> tags
        o.observe(window.document.head, {childList: true});
        o.observe(window.document.body, {childList: true});

        // as scripts load, remove them from pendingScripts
        ['load', 'error'].forEach((eventType) => {
          window.document.addEventListener(
            eventType,
            (event) => {
              if (
                event.target instanceof HTMLScriptElement ||
                event.target instanceof HTMLLinkElement
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
    this.subscribers.forEach((subscriber) => subscriber(message));
  };

  private add = (script: HTMLScriptElement | HTMLLinkElement) => {
    if (this.pendingScripts.size === 0) {
      this.next('BUSY');
    }
    this.pendingScripts.add(script);
  };

  private remove = (script: HTMLScriptElement | HTMLLinkElement) => {
    // console.log('pending scripts:', this.pendingScripts.size);
    this.pendingScripts.delete(script);
    if (this.pendingScripts.size === 0) {
      this.next('IDLE');
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
 * Alerts subscribers to the presence or absence of _any_ observable network
 * activity. Combines the functionalities of AjaxIdleObservable and
 * ScriptLoadingIdleObservable.
 */
class NetworkIdleObservable {
  private ajaxIdleObservable = getAjaxIdleObservable();
  private scriptLoadingIdleObservable = getScriptLoadingIdleObservable();
  private subscribers = new Set<Subscriber>();

  // idle state
  private ajaxIdle = true;
  private scriptLoadingIdle = true;
  private idleTimeout?: number = undefined;

  constructor() {
    this.ajaxIdleObservable.subscribe(this.handleUpdate('AJAX'));
    this.scriptLoadingIdleObservable.subscribe(this.handleUpdate('SCRIPT_LOADING'));
  }

  private handleUpdate = (source: 'AJAX' | 'SCRIPT_LOADING') => (message: Message) => {
    const wasIdle = this.ajaxIdle && this.scriptLoadingIdle;

    // update state
    if (source === 'AJAX') {
      this.ajaxIdle = message === 'IDLE';
    }
    if (source === 'SCRIPT_LOADING') {
      this.scriptLoadingIdle = message === 'IDLE';
    }

    // if this is a change, notify subscribers
    const isIdle = this.ajaxIdle && this.scriptLoadingIdle;
    if (wasIdle !== isIdle) {
      if (isIdle) {
        this.idleTimeout = window.setTimeout(() => this.next('IDLE'), MINIMUM_IDLE_MS);
      } else {
        if (this.idleTimeout != null) {
          window.clearTimeout(this.idleTimeout);
          this.idleTimeout = undefined;
        } else {
          this.next('BUSY');
        }
      }
      // this.next(isIdle ? 'IDLE' : 'BUSY');
    }
  };

  private next = (message: Message) => {
    // console.log('NETWORK', message);
    this.subscribers.forEach((subscriber) => subscriber(message));
  };

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

// observable singletons
let ajaxIdleObservable: AjaxIdleObservable;
let scriptLoadingIdleObservable: ScriptLoadingIdleObservable;
let networkIdleObservable: NetworkIdleObservable;

const getAjaxIdleObservable = () => {
  if (!ajaxIdleObservable) {
    ajaxIdleObservable = new AjaxIdleObservable();
  }
  return ajaxIdleObservable;
};
const getScriptLoadingIdleObservable = () => {
  if (!scriptLoadingIdleObservable) {
    scriptLoadingIdleObservable = new ScriptLoadingIdleObservable();
  }
  return scriptLoadingIdleObservable;
};
export const getNetworkIdleObservable = () => {
  if (!networkIdleObservable) {
    networkIdleObservable = new NetworkIdleObservable();
  }
  return networkIdleObservable;
};

/**
 * Call this to notify ttvc that an AJAX request has just begun.
 *
 * Instrument your site's AJAX requests with `incrementAjaxCount` and
 * `decrementAjaxCount` to ensure that ttvc is not reported early.
 */
export const incrementAjaxCount = () => getAjaxIdleObservable().increment();

/**
 * Call this to notify ttvc that an AJAX request has just resolved.
 *
 * Instrument your site's AJAX requests with `incrementAjaxCount` and
 * `decrementAjaxCount` to ensure that ttvc is not reported early.
 */
export const decrementAjaxCount = () => getAjaxIdleObservable().decrement();
