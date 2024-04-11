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

/**
 * TTVC `Metric` type uses `PerformanceMeasure` type as it's guideline
 * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMeasure
 */
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

/**
 * At the moment, the only error that can occur is measurement cancellation
 */
export type CancellationError = {
  // time since timeOrigin that the navigation was triggered
  start: number;

  // time since timeOrigin that cancellation occurred
  end: number;

  // the difference between start and end
  duration: number;

  // reason for cancellation
  cancellationReason: CancellationReason;

  // Optional type of event that triggered cancellation
  eventType?: string;

  // Optional target of event that triggered cancellation
  eventTarget?: EventTarget;

  // the most recent visual update; this can be either a mutation or a load event target
  lastVisibleChange?: HTMLElement | TimestampedMutationRecord;

  navigationType: NavigationType;
};

export const enum CancellationReason {
  // navigation has occurred
  NEW_NAVIGATION = 'NEW_NAVIGATION',

  // page was put in background
  VISIBILITY_CHANGE = 'VISIBILITY_CHANGE',

  // user interaction occurred
  USER_INTERACTION = 'USER_INTERACTION',

  // new TTVC measurement started, overwriting an unfinished one
  NEW_MEASUREMENT = 'NEW_MEASUREMENT',

  // manual cancellation via API happened
  MANUAL_CANCELLATION = 'MANUAL_CANCELLATION',
}

export type MetricSuccessSubscriber = (measurement: Metric) => void;
export type MetricErrorSubscriber = (error: CancellationError) => void;

/**
 * Represents a single observation of TTVC measurement, along with its index
 * in a session, it's state and a method to cancel the measurement
 *
 * Observation might result in a successful measurement of TTVC or a failure to capture it
 */
export type Observation = {
  index: number;
  state: ObservationState;
  cancel: (cancellationReason: CancellationReason, e?: Event) => void;
};
const enum ObservationState {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Core of the TTVC calculation that ties viewport observers and network monitoring
 * into a singleton that facilitates communication of TTVC metric measurement and error
 * information to subscribers.
 */
class VisuallyCompleteCalculator {
  // configuration
  public debug = false;
  public idleTimeout = 200;

  // observers
  private inViewportMutationObserver: InViewportMutationObserver;
  private inViewportImageObserver: InViewportImageObserver;

  // measurement state
  private lastMutation?: TimestampedMutationRecord;
  private lastImageLoadTimestamp = -1;
  private lastImageLoadTarget?: HTMLElement;
  private navigationCount = 0;

  // map of TTVC observations
  private observations = new Map<number, Observation>();

  // subscribers
  private successSubscribers = new Set<MetricSuccessSubscriber>();
  private errorSubscribers = new Set<MetricErrorSubscriber>();

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

  /**
   * expose a method to abort the current TTVC measurement
   * @param e - optionally, an event that triggered cancellation
   */
  cancel(e?: Event) {
    const mostRecentMeasurement = this.observations.get(this.observations.size);
    if (mostRecentMeasurement && mostRecentMeasurement.state === ObservationState.ACTIVE) {
      mostRecentMeasurement.cancel(CancellationReason.MANUAL_CANCELLATION, e);
      mostRecentMeasurement.state = ObservationState.CANCELLED;
    }
  }

  /**
   * Begin measuring a new navigation
   *
   * This async function encompasses an entire TTVC measurement, from the time it is triggered
   * to the moment it is finished or cancelled
   *
   * @param start
   * @param isBfCacheRestore
   */
  async start(start = 0, isBfCacheRestore = false) {
    const navigationIndex = (this.navigationCount += 1);
    Logger.info('VisuallyCompleteCalculator.start()', '::', 'index =', navigationIndex);

    const previousMeasurement = this.observations.get(navigationIndex - 1);
    if (previousMeasurement && previousMeasurement.state === ObservationState.ACTIVE) {
      previousMeasurement.cancel(CancellationReason.NEW_MEASUREMENT);
    }

    let navigationType: NavigationType = isBfCacheRestore
      ? 'back_forward'
      : start > 0
      ? 'script'
      : getNavigationType();

    const activationStart = getActivationStart();
    if (activationStart > start) {
      start = activationStart;
      navigationType = 'prerender';
    }

    /**
     * Set up a cancellation function for the current TTVC observation
     */
    const cancel = (cancellationReason: CancellationReason, e?: Event) => {
      const observation = this.observations.get(navigationIndex);

      if (!observation || observation.state !== ObservationState.ACTIVE) return;
      observation.state = ObservationState.CANCELLED;

      const end = performance.now();
      this.error(
        {
          start,
          end,
          duration: end - start,
          cancellationReason,
          navigationType,
          lastVisibleChange: this.getLastVisibleChange(),
          ...(e && {
            eventType: e.type,
            eventTarget: e.target || undefined,
          }),
        },
        observation
      );
    };

    const observation: Observation = {
      index: navigationIndex,
      state: ObservationState.ACTIVE,
      cancel,
    };
    this.observations.set(navigationIndex, observation);

    const cancelOnInteraction = (e: Event) => cancel(CancellationReason.USER_INTERACTION, e);
    const cancelOnNavigation = (e: Event) => cancel(CancellationReason.NEW_NAVIGATION, e);
    const cancelOnVisibilityChange = (e: Event) => cancel(CancellationReason.VISIBILITY_CHANGE, e);

    this.inViewportImageObserver.observe();
    this.inViewportMutationObserver.observe(document.documentElement);
    window.addEventListener('pagehide', cancelOnNavigation);
    window.addEventListener('visibilitychange', cancelOnVisibilityChange);
    // attach user interaction listeners next tick (we don't want to pick up the SPA navigation click)
    window.setTimeout(() => {
      window.addEventListener('click', cancelOnInteraction);
      window.addEventListener('keydown', cancelOnInteraction);
    }, 0);

    // wait for page to be definitely DONE
    // - wait for window.on("load")
    await waitForPageLoad();
    // - wait for simultaneous network and CPU idle
    const didNetworkTimeOut = await new Promise<boolean>(requestAllIdleCallback);

    // if current TTVC observation is still active (was not cancelled), record it
    if (observation.state === ObservationState.ACTIVE) {
      observation.state = ObservationState.COMPLETED;

      // identify timestamp of last visible change
      const end = Math.max(start, this.lastImageLoadTimestamp, this.lastMutation?.timestamp ?? 0);

      // report result to subscribers
      this.next(
        {
          start,
          end,
          duration: end - start,
          detail: {
            navigationType,
            didNetworkTimeOut,
            lastVisibleChange: this.getLastVisibleChange(),
          },
        },
        observation
      );
    } else {
      Logger.debug(
        'VisuallyCompleteCalculator: Measurement discarded',
        '::',
        'index =',
        navigationIndex
      );
    }

    // cleanup
    window.removeEventListener('pagehide', cancelOnNavigation);
    window.removeEventListener('visibilitychange', cancelOnVisibilityChange);
    window.removeEventListener('click', cancelOnInteraction);
    window.removeEventListener('keydown', cancelOnInteraction);
    // only disconnect observers if this is the most recent navigation
    if (navigationIndex === this.navigationCount) {
      this.inViewportImageObserver.disconnect();
      this.inViewportMutationObserver.disconnect();
    }
  }

  private next(measurement: Metric, observation: Observation) {
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
      observation.index
    );
    Logger.info('TTVC:', measurement, '::', 'index =', observation.index);
    this.successSubscribers.forEach((subscriber) => subscriber(measurement));
  }

  private error(error: CancellationError, observation: Observation) {
    Logger.debug(
      'VisuallyCompleteCalculator.error()',
      '::',
      'cancellationReason =',
      error.cancellationReason,
      '::',
      'eventType =',
      error.eventType || 'none',
      '::',
      'index =',
      observation.index
    );
    this.errorSubscribers.forEach((subscriber) => subscriber(error));
  }

  private getLastVisibleChange() {
    return this.lastImageLoadTimestamp > (this.lastMutation?.timestamp ?? 0)
      ? this.lastImageLoadTarget
      : this.lastMutation;
  }

  /** subscribe to Visually Complete metrics */
  onTTVC = (
    successSubscriber: MetricSuccessSubscriber,
    errorSubscriber?: MetricErrorSubscriber
  ) => {
    // register subscriber callbacks
    this.successSubscribers.add(successSubscriber);

    if (errorSubscriber) {
      this.errorSubscribers.add(errorSubscriber);
    }

    // return an unsubscribe function
    return () => {
      this.successSubscribers.delete(successSubscriber);

      if (errorSubscriber) {
        this.errorSubscribers.delete(errorSubscriber);
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
