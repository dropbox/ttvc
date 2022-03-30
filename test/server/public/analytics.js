// use window.entries to communicate between browser and test runner processes
window.entries = [];

function init() {
  // keep trying until document.body is present
  if (!document.body) {
    return requestAnimationFrame(init);
  }

  const calculator = new TTVC.PageLoadVisuallyCompleteCalculator();
  calculator.start();

  async function getTTVC(callback /*: (ms: number) => void*/) {
    const measurement = await calculator.attemptMeasurement();
    callback(measurement);
  }

  getTTVC((ms) => {
    console.log('TTVC:', ms);
    if (ms != null) {
      window.entries.push(ms);
    }
  });
}

init();
