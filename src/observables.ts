// track a count of in-flight APIv2 requests
type Message = 'IDLE' | 'BUSY';
type Subscriber = (message: Message) => void;

// wait for the network and CPU to be idle for this long before declaring the
// page done
const MINIMUM_IDLE_MS = 200;

// TODO: Instrument edison prefetches
// TODO: Review codebase for other AJAX helpers we may want to instrument

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
  private ajaxIdleObservable = ajaxIdleObservable;
  private scriptLoadingIdleObservable = scriptLoadingIdleObservable;
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

// initialize observable singletons
export const ajaxIdleObservable = new AjaxIdleObservable();
const scriptLoadingIdleObservable = new ScriptLoadingIdleObservable();
const networkIdleObservable = new NetworkIdleObservable();

/**
 * Request a callback when the CPU and network have both been simultaneously
 * idle for MINIMUM_IDLE_MS.
 *
 * NOTE: will only trigger once
 */
export async function requestAllIdleCallback(callback: () => void) {
  const state = {
    networkIdle: networkIdleObservable.isIdle(),
  };

  let timeout = null;

  const handleAllIdle = () => {
    timeout = setTimeout(() => {
      callback();
      unsubscribe();
    }, MINIMUM_IDLE_MS);
  };

  const handleNetworkChange = (message: Message) => {
    console.log('NETWORK', message);
    state.networkIdle = message === 'IDLE';

    if (state.networkIdle) {
      // window.setTimeout(() => {
      //   window.requestIdleCallback(() => {
      //     requestAnimationFrame(() => {
      //       handleCpuIdle();
      //     });
      //   });
      // }, MINIMUM_IDLE_MS);
      window.requestAnimationFrame(() => {
        window.requestIdleCallback(handleCpuIdle);
      });
    } else {
      window.clearTimeout(timeout);
    }
  };

  const handleCpuIdle = () => {
    if (state.networkIdle && !timeout) {
      handleAllIdle();
    }
  };

  const unsubscribe = networkIdleObservable.subscribe(handleNetworkChange);

  // base case
  if (state.networkIdle) {
    handleNetworkChange('IDLE');
  }
}
