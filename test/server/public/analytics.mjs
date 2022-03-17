import {getTTVC} from '/dist/index.mjs';

getTTVC((ms) => {
  performance.mark('TTVC', {startTime: ms});
  console.log('TTVC:', ms);
});
