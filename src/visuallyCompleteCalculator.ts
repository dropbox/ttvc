import {InViewportMutationObserver} from './inViewportMutationObserver';
import {waitForPageLoad} from './util';
import {requestAllIdleCallback} from './requestAllIdleCallback';
import {InViewportImageObserver} from './inViewportImageObserver';
import {Logger} from './util/logger';

export type MetricSubscriber = (measurement: number) => void;

/**
 * TODO: Document
 */
class VisuallyCompleteCalculator {
  public debug = false;
  public idleTimeout = 200;

  private inViewportMutationObserver: InViewportMutationObserver;
  private inViewportImageObserver: InViewportImageObserver;

  // measurement state
  private lastMutationTimestamp = 0;
  private lastImageLoadTimestamp = 0;
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

    this.inViewportMutationObserver = new InViewportMutationObserver(
      (mutation) =>
        (this.lastMutationTimestamp = Math.max(this.lastMutationTimestamp, mutation.timestamp))
    );
    this.inViewportImageObserver = new InViewportImageObserver(
      (timestamp) =>
        (this.lastImageLoadTimestamp = Math.max(this.lastImageLoadTimestamp, timestamp))
    );
  }

  /** begin measuring a new navigation */
  async start(startTime = 0) {
    const navigationIndex = (this.navigationCount += 1);
    Logger.info('VisuallyCompleteCalculator.start()');

    // setup
    let shouldCancel = false;
    const cancel = () => (shouldCancel = true);

    this.inViewportImageObserver.observe();
    this.inViewportMutationObserver.observe(document.documentElement);
    window.addEventListener('pagehide', cancel);
    window.addEventListener('visibilitychange', cancel);
    window.addEventListener('locationchange', cancel);
    // attach user interaction listeners next tick (we don't want to pick up the SPA navigation click)
    window.setTimeout(() => {
      window.addEventListener('click', cancel);
      window.addEventListener('keydown', cancel);
    }, 0);

    // wait for page to be definitely DONE
    // - wait for window.on("load")
    await waitForPageLoad();
    // - wait for simultaneous network and CPU idle
    await new Promise<void>(requestAllIdleCallback);

    if (!shouldCancel) {
      // identify timestamp of last visible change
      const lastVisibleUpdate = Math.max(this.lastImageLoadTimestamp, this.lastMutationTimestamp);
      // report result to subscribers
      this.next(lastVisibleUpdate - startTime);
    }

    // cleanup
    window.removeEventListener('pagehide', cancel);
    window.removeEventListener('visibilitychange', cancel);
    window.removeEventListener('locationchange', cancel);
    window.removeEventListener('click', cancel);
    window.removeEventListener('keydown', cancel);
    // only disconnect observers if this is the most recent navigation
    if (navigationIndex === this.navigationCount) {
      this.inViewportImageObserver.disconnect();
      this.inViewportMutationObserver.disconnect();
    }
  }

  private next(measurement: number) {
    Logger.debug(
      'VisuallyCompleteCalculator.next()',
      '::',
      'lastImageLoadTimestamp =',
      this.lastImageLoadTimestamp,
      'lastMutationTimestamp =',
      this.lastMutationTimestamp
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
