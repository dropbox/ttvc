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

    // the most recent visual update; this can be either a mutation or a load event target
    lastVisibleChange?: HTMLElement | TimestampedMutationRecord;
  };
};

export const enum CancellationReason {
  NEW_NAVIGATION = 'NEW_NAVIGATION',
  PAGE_BACKGROUNDED = 'PAGE_BACKGROUNDED',
  USER_INTERACTION = 'USER_INTERACTION',
}

export type MetricSubscriber = (measurement: Metric) => void;
export type CancellationSubscriber = (reason: CancellationReason) => void;

/**
 * TODO: Document
 */
class VisuallyCompleteCalculator {
  public debug = false;
  public idleTimeout = 200;

  private inViewportMutationObserver: InViewportMutationObserver;
  private inViewportImageObserver: InViewportImageObserver;

  private subscribers = new Set<MetricSubscriber>();
  private cancellationSubscribers = new Set<CancellationSubscriber>();

  // measurement state
  private lastMutation?: TimestampedMutationRecord;
  private lastImageLoadTimestamp = -1;
  private lastImageLoadTarget?: HTMLElement;
  private navigationCount = 0;
  private cancellations = new Map<number, CancellationReason>();

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
  cancel(reason: CancellationReason) {
    Logger.debug('VisuallyCompleteCalculator.cancel()');
    if (!this.cancellations.get(this.navigationCount)) {
      this.cancellations.set(this.navigationCount, reason);
    }
  }

  /** begin measuring a new navigation */
  async start(start = 0) {
    const navigationIndex = (this.navigationCount += 1);
    Logger.info('VisuallyCompleteCalculator.start()');

    // setup
    const cancel = (reason: CancellationReason) => {
      if (!this.cancellations.has(navigationIndex)) {
        this.cancellations.set(navigationIndex, reason);
      }
    };

    const cancelInteraction = () => cancel(CancellationReason.USER_INTERACTION);
    const cancelBackgrounded = () => cancel(CancellationReason.PAGE_BACKGROUNDED);

    this.inViewportImageObserver.observe();
    this.inViewportMutationObserver.observe(document.documentElement);
    window.addEventListener('pagehide', cancelBackgrounded);
    window.addEventListener('visibilitychange', cancelBackgrounded);
    // attach user interaction listeners next tick (we don't want to pick up the SPA navigation click)
    window.setTimeout(() => {
      window.addEventListener('click', cancelInteraction);
      window.addEventListener('keydown', cancelInteraction);
    }, 0);

    // wait for page to be definitely DONE
    // - wait for window.on("load")
    await waitForPageLoad();
    // - wait for simultaneous network and CPU idle
    const didNetworkTimeOut = await new Promise<boolean>(requestAllIdleCallback);

    // if this navigation's measurement hasn't been cancelled, record it.
    const cancellationReason = this.cancellations.get(navigationIndex);
    this.cancellations.delete(navigationIndex);
    if (navigationIndex !== this.navigationCount) {
      this.nextCancellation(CancellationReason.NEW_NAVIGATION);
    } else if (cancellationReason) {
      this.nextCancellation(cancellationReason);
    } else {
      // identify timestamp of last visible change
      const end = Math.max(start, this.lastImageLoadTimestamp, this.lastMutation?.timestamp ?? 0);

      // report result to subscribers
      this.next({
        start,
        end,
        duration: end - start,
        detail: {
          didNetworkTimeOut,
          lastVisibleChange:
            this.lastImageLoadTimestamp > (this.lastMutation?.timestamp ?? 0)
              ? this.lastImageLoadTarget
              : this.lastMutation,
        },
      });
    }

    // cleanup
    window.removeEventListener('pagehide', cancelBackgrounded);
    window.removeEventListener('visibilitychange', cancelBackgrounded);
    window.removeEventListener('click', cancelInteraction);
    window.removeEventListener('keydown', cancelInteraction);

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

  private nextCancellation(reason: CancellationReason) {
    Logger.debug(
      'VisuallyCompleteCalculator.nextCancellation()',
      '::',
      'cancellationreason =',
      reason
    );
    this.cancellationSubscribers.forEach((subscriber) => subscriber(reason));
  }

  /** subscribe to Visually Complete metrics */
  getTTVC = (subscriber: MetricSubscriber, cancellationSubscriber?: CancellationSubscriber) => {
    // register subscriber callback
    this.subscribers.add(subscriber);
    if (cancellationSubscriber) {
      this.cancellationSubscribers.add(cancellationSubscriber);
    }

    // return an unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
      if (cancellationSubscriber) {
        this.cancellationSubscribers.delete(cancellationSubscriber);
      }
    };
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
