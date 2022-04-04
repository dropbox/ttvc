import {VisuallyCompleteCalculator} from './visually_complete_calculator.js';
import {ajaxIdleObservable} from './observables.js';

export function getTTVC(callback: (ms: number) => void) {
  const calculator = new VisuallyCompleteCalculator();
  calculator.start();
  calculator.getVC(callback);

  window.addEventListener('locationchange', () => calculator.start());
}

export const incrementAjaxCount = () => ajaxIdleObservable.increment();
export const decrementAjaxCount = () => ajaxIdleObservable.decrement();
