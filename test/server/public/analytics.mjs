import {PageLoadVisuallyCompleteCalculator} from '/dist/index.js';

// use window.entries to communicate between browser and test runner processes
window.entries = [];

const calculator = new PageLoadVisuallyCompleteCalculator();
calculator.start();

export async function getTTVC(callback /*: (ms: number) => void*/) {
  const measurement = await calculator.attemptMeasurement();
  callback(measurement);
}

getTTVC((ms) => {
  console.log('TTVC:', ms);
  if (ms != null) {
    window.entries.push(ms);
  }
});
