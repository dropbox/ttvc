/**
 * Keep the CPU busy for an arbitrary number of milliseconds.
 *
 * @param {number} ms The duration in milliseconds to keep the CPU busy
 */
function busy(ms) {
  const now = performance.now();
  while (performance.now() < now + ms) {
    // keep going
  }
}
