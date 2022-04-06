import {getVisuallyCompleteCalculator} from './visuallyCompleteCalculator.js';

export {incrementAjaxCount, decrementAjaxCount} from './networkIdleObservable.js';

export function getTTVC(callback: (ms: number) => void) {
  const calculator = getVisuallyCompleteCalculator();
  calculator.start();
  calculator.getVC(callback);

  window.addEventListener('locationchange', () => calculator.start());
}
