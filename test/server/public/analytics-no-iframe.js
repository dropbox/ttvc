// use window.entries and window.errors to communicate between browser and test runner processes
window.entries = [];
window.errors = [];

// patch window.fetch
const old2Fetch = window.fetch;
window.fetch = (...args) => {
  TTVC.incrementAjaxCount();
  return old2Fetch(...args).finally(TTVC.decrementAjaxCount);
};

TTVC.init({debug: true, networkTimeout: window.NETWORK_TIMEOUT ?? 3000, excludeIframe: true});

TTVC.onTTVC(
  (measurement) => {
    console.log('TTVC:SUCCESS', measurement);
    window.entries.push(measurement);
  },
  (error) => {
    console.log('TTVC:ERROR', error);
    window.errors.push(error);
  }
);
