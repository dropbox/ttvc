import {getNetworkIdleObservable} from './networkIdleObservable.js';
import {
  getVisuallyCompleteCalculator,
  MetricSubscriber,
  VisuallyCompleteCalculator,
} from './visuallyCompleteCalculator.js';

type TtvcOptions = {
  idleTimeout?: number;
};

/** A duration in ms to wait before declaring the page idle. */
export let IDLE_TIMEOUT = 200;

let calculator: VisuallyCompleteCalculator;

/**
 *  Start ttvc and begin monitoring network activity and visual changes.
 */
export const init = (options?: TtvcOptions) => {
  // apply options
  if (options?.idleTimeout) IDLE_TIMEOUT = options.idleTimeout;

  calculator = getVisuallyCompleteCalculator();
  void calculator.start();
  window.addEventListener('locationchange', () => void calculator.start(performance.now()));
};

/**
 * Subscribe to notifications about TTVC metrics.
 *
 * NOTE: init() must be called before registering a TTVC subscriber.
 *
 * @example
 * const unsubscribe = getTTVC(ms => console.log(ms));
 *
 * @param callback Triggered once for each navigation instance.
 * @returns A function that unsubscribes the callback from this metric.
 */
export const getTTVC = (callback: MetricSubscriber) => calculator?.getTTVC(callback);

export const incrementAjaxCount = getNetworkIdleObservable().incrementAjaxCount;
export const decrementAjaxCount = getNetworkIdleObservable().decrementAjaxCount;
