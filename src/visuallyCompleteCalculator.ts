import {InViewportMutationObserver, TimestampedMutationRecord} from './inViewportMutationObserver';
import {waitForPageLoad} from './util';
import {requestAllIdleCallback} from './requestAllIdleCallback';
import {InViewportImageObserver} from './inViewportImageObserver';
import {Logger} from './util/logger';
import {getActivationStart, getNavigationType} from './navigationEntry';

export type NavigationType =
  | NavigationTimingType
  // Navigation was triggered with a script operation, e.g. in a single page application.
  | 'script';

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

    // the most recent visual update; this can be either a mutation or a load event target
    lastVisibleChange?: HTMLElement | TimestampedMutationRecord;

    navigationType: NavigationType;
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
  private activeMeasurementIndex?: number; // only one measurement should be active at a time

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
      if ((mutation.timestamp ?? 0) >= (this.lastMutation?.timestamp ?? 0)) {
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

  /** abort the current TTVC measurement */
  cancel() {
    Logger.info(
      'VisuallyCompleteCalculator.cancel()',
      '::',
      'index =',
      this.activeMeasurementIndex
    );
    this.activeMeasurementIndex = undefined;
  }

  /** begin measuring a new navigation */
  async start(start = 0, isBfCacheRestore = false) {
    const navigationIndex = (this.navigationCount += 1);
    this.activeMeasurementIndex = navigationIndex;
    Logger.info('VisuallyCompleteCalculator.start()', '::', 'index =', navigationIndex);

    const activationStart = getActivationStart();
    if (activationStart > start) {
      start = activationStart;
    }

    // setup
    const cancel = () => {
      if (this.activeMeasurementIndex === navigationIndex) {
        this.activeMeasurementIndex = undefined;
      }
    };

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

    // if this navigation's measurment hasn't been cancelled, record it.
    if (navigationIndex === this.activeMeasurementIndex) {
      // identify timestamp of last visible change
      const end = Math.max(start, this.lastImageLoadTimestamp, this.lastMutation?.timestamp ?? 0);

      const navigationType = isBfCacheRestore
        ? 'back_forward'
        : activationStart > 0
        ? 'prerender'
        : start > 0
        ? 'script'
        : getNavigationType();

      // report result to subscribers
      this.next({
        start,
        end,
        duration: end - start,
        detail: {
          navigationType,
          didNetworkTimeOut,
          lastVisibleChange:
            this.lastImageLoadTimestamp > (this.lastMutation?.timestamp ?? 0)
              ? this.lastImageLoadTarget
              : this.lastMutation,
        },
      });
    } else {
      Logger.debug(
        'VisuallyCompleteCalculator: Measurement discarded',
        '::',
        'index =',
        navigationIndex
      );
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
      this.lastMutation?.timestamp ?? 0,
      '::',
      'index =',
      this.activeMeasurementIndex
    );
    Logger.info('TTVC:', measurement, '::', 'index =', this.activeMeasurementIndex);
    this.subscribers.forEach((subscriber) => subscriber(measurement));
  }

  /** subscribe to Visually Complete metrics */
  onTTVC = (subscriber: MetricSubscriber) => {
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
