// use window.entries to communicate between browser and test runner processes
window.entries = [];

// patch window.fetch
const oldFetch = window.fetch;
window.fetch = (...args) => {
  TTVC.incrementAjaxCount();
  return oldFetch(...args).finally(TTVC.decrementAjaxCount);
};

function init() {
  // // keep trying until document.body is present
  // if (!document.body) {
  //   return requestAnimationFrame(init);
  // }

  console.log('init');

  TTVC.getTTVC((ms) => {
    console.log('TTVC:', ms);
    if (ms != null) {
      window.entries.push(ms);
    }
  });
}

init();
