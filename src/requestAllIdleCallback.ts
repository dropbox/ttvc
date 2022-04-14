import {IDLE_TIMEOUT} from './index';
import {Message, getNetworkIdleObservable} from './networkIdleObservable';
import {requestIdleCallback} from './utils';
import {Logger} from './utils/logger';

/**
 * Request a callback when the CPU and network have both been simultaneously
 * idle for IDLE_TIMEOUT.
 *
 * NOTE: will only trigger once
 */
export function requestAllIdleCallback(callback: () => void) {
  const networkIdleObservable = getNetworkIdleObservable();

  // state
  let networkIdle = networkIdleObservable.isIdle();
  let timeout: number | null = null;

  const handleNetworkChange = (message: Message) => {
    networkIdle = message === 'IDLE';

    if (networkIdle) {
      requestIdleCallback(handleCpuIdle);
    } else {
      window.clearTimeout(timeout);
      timeout = null;
    }
  };

  const handleCpuIdle = () => {
    Logger.debug('requestAllIdleCallback.handleCpuIdle()');
    if (networkIdle && !timeout) {
      handleAllIdle();
    }
  };

  const handleAllIdle = () => {
    timeout = window.setTimeout(() => {
      Logger.info('requestAllIdleCallback: ALL IDLE');
      callback();
      unsubscribe();
    }, IDLE_TIMEOUT);
  };

  const unsubscribe = networkIdleObservable.subscribe(handleNetworkChange);

  // base case
  if (networkIdle) {
    handleNetworkChange('IDLE');
  }
}
