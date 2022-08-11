import {InViewportMutationObserver, TimestampedMutationRecord} from './inViewportMutationObserver';
import {waitForPageLoad} from './util';
import {requestAllIdleCallback} from './requestAllIdleCallback';
import {InViewportImageObserver} from './inViewportImageObserver';
import {Logger} from './util/logger';

export type Metric = {
  // time since timeOrigin that the navigation was triggered
  // (this will be 0 for the initial pageload)
  start: number;

  // time since timeOrigin that ttvc was marked for the current navigation
  end: number;

  // the difference between start and end; this is the value of "TTVC"
  duration: number;

  // additional metadata related to the current navigation
  detail: {
    // if ttvc ignored a stalled network request, this value will be true
    didNetworkTimeOut: boolean;
    lastImageLoadTimestamp: number;
    lastImageLoadTarget?: HTMLElement;
    lastMutation?: TimestampedMutationRecord;
  };
};

export type MetricSubscriber = (measurement: Metric) => void;

/**
 * TODO: Document
 */
class VisuallyCompleteCalculator {
  public debug = false;
  public idleTimeout = 200;

  private inViewportMutationObserver: InViewportMutationObserver;
  private inViewportImageObserver: InViewportImageObserver;

  // measurement state
  private lastMutation?: TimestampedMutationRecord;
  private lastImageLoadTimestamp = -1;
  private lastImageLoadTarget?: HTMLElement;
  private subscribers = new Set<MetricSubscriber>();
  private navigationCount = 0;

  /**
   * Determine whether the calculator should run in the current environment
   */
  static isSupportedEnvironment() {
    return (
      window !== undefined &&
      'MutationObserver' in window &&
      'IntersectionObserver' in window &&
      typeof document.querySelectorAll === 'function' &&
      window.performance?.timing
    );
  }

  constructor() {
    if (!VisuallyCompleteCalculator.isSupportedEnvironment()) {
      throw new Error('VisuallyCompleteCalculator: This browser/runtime is not supported.');
    }

    this.inViewportMutationObserver = new InViewportMutationObserver((mutation) => {
      if (mutation.timestamp ?? 0 >= (this.lastMutation?.timestamp ?? 0)) {
        this.lastMutation = mutation;
      }
    });
    this.inViewportImageObserver = new InViewportImageObserver((timestamp, img) => {
      if (timestamp >= this.lastImageLoadTimestamp) {
        this.lastImageLoadTimestamp = timestamp;
        this.lastImageLoadTarget = img;
      }
    });
  }

  /** begin measuring a new navigation */
  async start(start = 0) {
    const navigationIndex = (this.navigationCount += 1);
    Logger.info('VisuallyCompleteCalculator.start()');

    // setup
    let shouldCancel = false;
    const cancel = () => (shouldCancel = true);

    this.inViewportImageObserver.observe();
    this.inViewportMutationObserver.observe(document.documentElement);
    window.addEventListener('pagehide', cancel);
    window.addEventListener('visibilitychange', cancel);
    // attach user interaction listeners next tick (we don't want to pick up the SPA navigation click)
    window.setTimeout(() => {
      window.addEventListener('click', cancel);
      window.addEventListener('keydown', cancel);
    }, 0);

    // wait for page to be definitely DONE
    // - wait for window.on("load")
    await waitForPageLoad();
    // - wait for simultaneous network and CPU idle
    const didNetworkTimeOut = await new Promise<boolean>(requestAllIdleCallback);

    // if this isn't the most recent navigation, abort
    if (navigationIndex !== this.navigationCount) {
      cancel();
    }

    if (!shouldCancel) {
      // identify timestamp of last visible change
      const end = Math.max(start, this.lastImageLoadTimestamp, this.lastMutation?.timestamp ?? 0);

      // report result to subscribers
      this.next({
        start,
        end,
        duration: end - start,
        detail: {
          didNetworkTimeOut,
          lastImageLoadTimestamp: this.lastImageLoadTimestamp,
          lastImageLoadTarget: this.lastImageLoadTarget,
          lastMutation: this.lastMutation,
        },
      });
    }

    // cleanup
    window.removeEventListener('pagehide', cancel);
    window.removeEventListener('visibilitychange', cancel);
    window.removeEventListener('click', cancel);
    window.removeEventListener('keydown', cancel);
    // only disconnect observers if this is the most recent navigation
    if (navigationIndex === this.navigationCount) {
      this.inViewportImageObserver.disconnect();
      this.inViewportMutationObserver.disconnect();
    }
  }

  private next(measurement: Metric) {
    if (measurement.end > Number.MAX_SAFE_INTEGER) {
      Logger.warn(
        'VisuallyCompleteCalculator.next()',
        '::',
        'This browser reported a time larger than MAX_SAFE_INTEGER. We are ignoring it.',
        '::',
        measurement
      );
      return;
    }

    Logger.debug(
      'VisuallyCompleteCalculator.next()',
      '::',
      'lastImageLoadTimestamp =',
      this.lastImageLoadTimestamp,
      'lastMutationTimestamp =',
      this.lastMutation?.timestamp ?? 0
    );
    Logger.info('TTVC:', measurement);
    this.subscribers.forEach((subscriber) => subscriber(measurement));
  }

  /** subscribe to Visually Complete metrics */
  getTTVC = (subscriber: MetricSubscriber) => {
    // register subscriber callback
    this.subscribers.add(subscriber);

    // return an unsubscribe function
    return () => this.subscribers.delete(subscriber);
  };
}

export type {VisuallyCompleteCalculator};

// export calculator singleton
let calculator: VisuallyCompleteCalculator;
export const getVisuallyCompleteCalculator = () => {
  if (!calculator) {
    calculator = new VisuallyCompleteCalculator();
  }
  return calculator;
};
