// use window.entries to communicate between browser and test runner processes
window.entries = [];

// patch window.fetch
const oldFetch = window.fetch;
window.fetch = (...args) => {
  TTVC.incrementAjaxCount();
  return oldFetch(...args).finally(TTVC.decrementAjaxCount);
};

TTVC.init({debug: true, networkTimeout: window.NETWORK_TIMEOUT ?? 3000});

TTVC.getTTVC((ms) => {
  console.log('TTVC:', ms);
  if (ms != null) {
    window.entries.push(ms);
  }
});
