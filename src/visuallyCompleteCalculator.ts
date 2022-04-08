import {InViewportMutationObserver} from './inViewportMutationObserver';
import {waitForPageLoad} from './utils';
import {requestAllIdleCallback} from './requestAllIdleCallback';
import {InViewportImageObserver} from './inViewportImageObserver';

type MetricSubscriber = (measurement: number) => void;

/**
 * TODO: Document
 */
class VisuallyCompleteCalculator {
  private inViewportMutationObserver: InViewportMutationObserver;
  private inViewportImageObserver: InViewportImageObserver;

  // measurement state
  private startTime = 0;
  private lastMutationTimestamp = 0;
  private lastImageLoadTimestamp = 0;
  private subscribers = new Set<MetricSubscriber>();
  private shouldCancel = false;

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

    this.inViewportMutationObserver = new InViewportMutationObserver({
      callback: (mutation) =>
        (this.lastMutationTimestamp = Math.max(this.lastMutationTimestamp, mutation.timestamp)),
    });
    this.inViewportImageObserver = new InViewportImageObserver(
      (timestamp) =>
        (this.lastImageLoadTimestamp = Math.max(this.lastImageLoadTimestamp, timestamp))
    );
  }

  /** begin measuring a new navigation */
  async start(time = 0) {
    // setup
    this.inViewportImageObserver.observe();
    this.inViewportMutationObserver.observe(document.documentElement);
    window.addEventListener('click', this.cancel);
    window.addEventListener('keydown', this.cancel);
    window.addEventListener('pagehide', this.cancel);
    window.addEventListener('visibilitychange', this.cancel);
    this.shouldCancel = false;

    // save start timestamp
    this.startTime = time;

    // wait for page to be definitely DONE
    // - wait for window.on("load")
    await waitForPageLoad();
    console.log('PAGE LOAD');
    // - wait for simultaneous network and CPU idle
    await new Promise<void>(requestAllIdleCallback);
    console.log('ALL IDLE');

    if (!this.shouldCancel) {
      // identify timestamp of last visible change
      const lastVisibleUpdate = Math.max(this.lastImageLoadTimestamp, this.lastMutationTimestamp);
      // report result to subscribers
      this.next(lastVisibleUpdate - this.startTime);
    }

    // cleanup
    this.inViewportImageObserver.disconnect();
    this.inViewportMutationObserver.disconnect();
    window.removeEventListener('click', this.cancel);
    window.removeEventListener('keydown', this.cancel);
    window.removeEventListener('pagehide', this.cancel);
    window.removeEventListener('visibilitychange', this.cancel);
    this.lastMutationTimestamp = 0;
    this.lastImageLoadTimestamp = 0;
    this.startTime = 0;
  }

  private next(measurement: number) {
    this.subscribers.forEach((subscriber) => subscriber(measurement));
  }

  private cancel = () => {
    this.shouldCancel = true;
  };

  /** subscribe to Visually Complete metrics */
  getVC = (subscriber: MetricSubscriber) => {
    // register subscriber callback
    this.subscribers.add(subscriber);

    // return an unsubscribe function
    return () => this.subscribers.delete(subscriber);
  };
}

// export calculator singleton
let calculator: VisuallyCompleteCalculator;
export const getVisuallyCompleteCalculator = () => {
  if (!calculator) {
    calculator = new VisuallyCompleteCalculator();
  }
  return calculator;
};
