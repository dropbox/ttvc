import * as ttvc from '../../../src/index';

declare global {
  var TTVC: typeof ttvc;
  var NETWORK_TIMEOUT: number | undefined;
}
