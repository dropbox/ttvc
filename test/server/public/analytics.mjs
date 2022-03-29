import {getTTVC} from '/dist/index.js';

// use window.entries to communicate between browser and test runner processes
window.entries = [];

getTTVC((ms) => {
  window.entries.push(ms);
});
