/**
 * Returns a promise resolved when the page load event has been reached.
 */
export const waitForPageLoad = () => {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    window.addEventListener('load', () => {
      resolve();
    });
  });
};

/**
 * Returns a promise resolved when the page has transitioned to a hidden state.
 */
export const waitForPageHidden = () => {
  return new Promise<void>((resolve, reject) => {
    const onHiddenOrPageHide = (event: Event) => {
      if (event.type === 'pagehide' || document.visibilityState === 'hidden') {
        document.removeEventListener('visibilitychange', onHiddenOrPageHide, true);
        window.removeEventListener('pagehide', onHiddenOrPageHide, true);
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onHiddenOrPageHide, true);
    window.addEventListener('pagehide', onHiddenOrPageHide, true);
  });
};
