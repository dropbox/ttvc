import {MINIMUM_IDLE_MS} from './constants';
import {Message, getNetworkIdleObservable} from './networkIdleObservable';
import {requestIdleCallback} from './utils';

/**
 * Request a callback when the CPU and network have both been simultaneously
 * idle for MINIMUM_IDLE_MS.
 *
 * NOTE: will only trigger once
 */
export function requestAllIdleCallback(callback: () => void) {
  const networkIdleObservable = getNetworkIdleObservable();

  // state
  let networkIdle = networkIdleObservable.isIdle();
  let timeout: number | null = null;

  const handleNetworkChange = (message: Message) => {
    // console.log('NETWORK', message);
    networkIdle = message === 'IDLE';

    if (networkIdle) {
      requestIdleCallback(handleCpuIdle);
    } else {
      window.clearTimeout(timeout);
    }
  };

  const handleCpuIdle = () => {
    if (networkIdle && !timeout) {
      handleAllIdle();
    }
  };

  const handleAllIdle = () => {
    timeout = window.setTimeout(() => {
      callback();
      unsubscribe();
    }, MINIMUM_IDLE_MS);
  };

  const unsubscribe = networkIdleObservable.subscribe(handleNetworkChange);

  // base case
  if (networkIdle) {
    handleNetworkChange('IDLE');
  }
}
