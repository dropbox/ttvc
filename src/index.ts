import {getNetworkIdleObservable} from './networkIdleObservable.js';
import {getVisuallyCompleteCalculator} from './visuallyCompleteCalculator.js';

// Start monitoring initial pageload
// TODO: Should we ask library consumers to manually initialize?
const calculator = getVisuallyCompleteCalculator();
void calculator.start();
window.addEventListener('locationchange', () => void calculator.start());

/**
 * Subscribe to notifications about TTVC metrics.
 *
 * @example
 * const unsubscribe = getTTVC(ms => console.log(ms));
 *
 * @param callback Triggered once for each navigation instance.
 * @returns A function that unsubscribes the callback from this metric.
 */
export const getTTVC = calculator.getTTVC;

export const incrementAjaxCount = getNetworkIdleObservable().incrementAjaxCount;
export const decrementAjaxCount = getNetworkIdleObservable().decrementAjaxCount;
