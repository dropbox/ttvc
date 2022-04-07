import {getNetworkIdleObservable} from './networkIdleObservable.js';
import {getVisuallyCompleteCalculator} from './visuallyCompleteCalculator.js';

export function getTTVC(callback: (ms: number) => void) {
  const calculator = getVisuallyCompleteCalculator();
  void calculator.start();
  calculator.getVC(callback);

  window.addEventListener('locationchange', () => void calculator.start());
}

export const incrementAjaxCount = getNetworkIdleObservable().incrementAjaxCount;
export const decrementAjaxCount = getNetworkIdleObservable().decrementAjaxCount;
