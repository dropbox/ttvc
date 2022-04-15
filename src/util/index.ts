/**
 * Returns a promise resolved when the page load event has been reached.
 */
export const waitForPageLoad = () => {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handleEvent = () => {
      resolve();
      window.removeEventListener('load', handleEvent);
    };
    window.addEventListener('load', handleEvent);
  });
};

/**
 * Request a callback when we are confident that any synchronous CPU work has
 * been flushed from the task queue.
 */
export const requestIdleCallback = (callback: () => void) => {
  // if browser supports it, wait until CPU is idle
  const requestCallback = window.requestIdleCallback ?? window.setTimeout;

  requestCallback(() => {
    // wait *two* animation frames, to ensure the page has a chance to flush
    // pending changes to the DOM
    window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
  });
};
