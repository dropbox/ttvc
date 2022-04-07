import {getNetworkIdleObservable} from './networkIdleObservable.js';
import {getVisuallyCompleteCalculator} from './visuallyCompleteCalculator.js';

export function getTTVC(callback: (ms: number) => void) {
  const calculator = getVisuallyCompleteCalculator();
  calculator.start();
  calculator.getVC(callback);

  window.addEventListener('locationchange', () => calculator.start());
}

export const incrementAjaxCount = getNetworkIdleObservable().incrementAjaxCount;
export const decrementAjaxCount = getNetworkIdleObservable().decrementAjaxCount;
