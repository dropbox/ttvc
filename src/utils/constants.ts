export type TtvcOptions = {
  debug?: boolean;
  idleTimeout?: number;
};

/** ttvc configuration values set during initialization */
export const CONFIG = {
  /** Decide whether to log debug messages. */
  DEBUG: false,
  /** A duration in ms to wait before declaring the page idle. */
  IDLE_TIMEOUT: 200,
};

export const setConfig = (options?: TtvcOptions) => {
  if (options?.debug) CONFIG.DEBUG = options.debug;
  if (options?.idleTimeout) CONFIG.IDLE_TIMEOUT = options.idleTimeout;
};
