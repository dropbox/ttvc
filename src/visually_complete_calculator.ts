import {InViewportMutationObserver} from './in_viewport_mutation_observer';
import {waitForPageLoad} from './utils';
import {requestAllIdleCallback} from './observables';

// declare const process: NodeJS.Process;

type MetricSubscriber = (measurement: number) => void;

/**
 * TODO: Document
 */
export class VisuallyCompleteCalculator {
  private inViewportMutationObserver: InViewportMutationObserver;

  // measurement state
  private startTime = 0;
  private lastMutationTimestamp = 0;
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
    // TODO: report exception if env not supported
    if (!VisuallyCompleteCalculator.isSupportedEnvironment()) {
      throw new Error('VisuallyCompleteCalculator: This browser/runtime is not supported.');
    }

    this.inViewportMutationObserver = new InViewportMutationObserver({
      callback: (mutation) =>
        // @ts-ignore FIXME
        (this.lastMutationTimestamp = Math.max(this.lastMutationTimestamp, mutation.timestamp)),
    });
  }

  /** begin measuring a new navigation */
  async start(time: number = 0) {
    // setup
    this.inViewportMutationObserver.observe(document.body);
    window.addEventListener('click', this.cancel);
    window.addEventListener('keydown', this.cancel);
    window.addEventListener('pagehide', this.cancel);
    window.addEventListener('visibilitychange', this.cancel);
    this.shouldCancel = false;

    // save start timestamp
    this.startTime = time;

    try {
      // wait for page to be definitely DONE
      // - wait for window.on("load")
      await waitForPageLoad();
      // console.log('PAGE LOAD');
      if (this.shouldCancel) throw 'cancel';

      // - wait for simultaneous network and CPU idle
      await new Promise<void>((resolve) => requestAllIdleCallback(resolve));
      // console.log('ALL IDLE');
      if (this.shouldCancel) throw 'cancel';

      // - wait for loading images
      const lastImageLoaded = await this.inViewportMutationObserver.waitForLoadingImages();
      // console.log('NAVIGATION DONE');
      if (this.shouldCancel) throw 'cancel';

      // identify timestamp of last visible change
      const lastVisibleUpdate = Math.max(lastImageLoaded, this.lastMutationTimestamp);

      // report result to subscribers
      this.next(lastVisibleUpdate - this.startTime);
    } catch (e) {
      // abort computation of ttvc and do nothing
    }

    // cleanup
    this.inViewportMutationObserver.disconnect();
    this.startTime = 0;
    this.lastMutationTimestamp = 0;
    window.removeEventListener('click', this.cancel);
    window.removeEventListener('keydown', this.cancel);
    window.removeEventListener('pagehide', this.cancel);
    window.removeEventListener('visibilitychange', this.cancel);
  }

  private next(measurement: number) {
    this.subscribers.forEach((subscriber) => subscriber(measurement));
  }

  private cancel = (event: Event) => {
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
