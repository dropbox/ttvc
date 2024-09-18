export type TtvcOptions = {
  debug?: boolean;
  idleTimeout?: number;
  networkTimeout?: number;
  excludeIframe?: boolean;
};

/** ttvc configuration values set during initialization */
export const CONFIG = {
  /** Decide whether to log debug messages. */
  DEBUG: false,

  /** A duration in ms to wait before declaring the page completely idle. */
  IDLE_TIMEOUT: 200,

  /**
   * A duration in ms to wait before assuming that a single network request
   * was not instrumented correctly.
   *
   * If NETWORK_TIMEOUT is set to 0, disable this feature.
   */
  NETWORK_TIMEOUT: 60000,

  EXCLUDE_IFRAME: false,
};

export const setConfig = (options?: TtvcOptions) => {
  if (options?.debug) CONFIG.DEBUG = options.debug;
  if (options?.idleTimeout) CONFIG.IDLE_TIMEOUT = options.idleTimeout;
  if (options?.networkTimeout) CONFIG.NETWORK_TIMEOUT = options.networkTimeout;
  if (options?.excludeIframe) CONFIG.EXCLUDE_IFRAME = options.excludeIframe;
};
