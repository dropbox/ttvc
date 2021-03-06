import {getNetworkIdleObservable} from './networkIdleObservable';
import {TtvcOptions, setConfig} from './util/constants';
import {Logger} from './util/logger';
import {
  getVisuallyCompleteCalculator,
  MetricSubscriber,
  VisuallyCompleteCalculator,
} from './visuallyCompleteCalculator.js';

export type {TtvcOptions};
export type {Metric, MetricSubscriber} from './visuallyCompleteCalculator';

let calculator: VisuallyCompleteCalculator;

/**
 *  Start ttvc and begin monitoring network activity and visual changes.
 */
export const init = (options?: TtvcOptions) => {
  // apply options
  setConfig(options);

  Logger.info('init()');

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

/**
 * Begin measuring a new navigation.
 *
 * Call this method to notify ttvc that a new client-side navigation has begun.
 *
 * *DO NOT* call `start()` on initial pageload.
 *
 * If you don't have access to the TTVC library in your product code, you can
 * trigger the same behaviour by dispatching a custom 'locationchange' event
 * (See README.md for an example of usage).
 */
export const start = () => calculator?.start(performance.now());

/**
 * Call this to notify ttvc that an AJAX request has just begun.
 *
 * Instrument your site's AJAX requests with `incrementAjaxCount` and
 * `decrementAjaxCount` to ensure that ttvc is not reported early.
 *
 * For the most accurate results, `decrementAjaxCount` should be called
 * **exactly once** for each `incrementAjaxCount`.
 */
export const incrementAjaxCount = getNetworkIdleObservable().incrementAjaxCount;

/**
 * Call this to notify ttvc that an AJAX request has just resolved.
 *
 * Instrument your site's AJAX requests with `incrementAjaxCount` and
 * `decrementAjaxCount` to ensure that ttvc is not reported early.
 *
 * For the most accurate results, `decrementAjaxCount` should be called
 * **exactly once** for each `incrementAjaxCount`.
 */
export const decrementAjaxCount = getNetworkIdleObservable().decrementAjaxCount;
