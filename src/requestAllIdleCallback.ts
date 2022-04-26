import {CONFIG} from './util/constants';
import {Message, getNetworkIdleObservable} from './networkIdleObservable';
import {requestIdleCallback} from './util';
import {Logger} from './util/logger';

/**
 * Request a callback when the CPU and network have both been simultaneously
 * idle for IDLE_TIMEOUT.
 *
 * NOTE: will only trigger once
 */
export function requestAllIdleCallback(callback: (didNetworkTimeOut: boolean) => void) {
  const networkIdleObservable = getNetworkIdleObservable();

  // state
  let networkIdle = networkIdleObservable.isIdle();
  let timeout: number | undefined = undefined;

  const handleNetworkChange = (message: Message) => {
    networkIdle = message === 'IDLE';

    if (networkIdle) {
      requestIdleCallback(handleCpuIdle);
    } else {
      window.clearTimeout(timeout);
      timeout = undefined;
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
      // Did we have to clear a "hung" request from observable state?
      const didNetworkTimeOut = networkIdleObservable.didNetworkTimeOut();
      networkIdleObservable.resetDidNetworkTimeOut();

      Logger.info('requestAllIdleCallback: ALL IDLE');
      callback(didNetworkTimeOut);

      unsubscribe();
    }, CONFIG.IDLE_TIMEOUT);
  };

  const unsubscribe = networkIdleObservable.subscribe(handleNetworkChange);

  // base case
  if (networkIdle) {
    handleNetworkChange('IDLE');
  }
}
