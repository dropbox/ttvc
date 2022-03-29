import {test, expect} from '@playwright/test';

import {FUDGE} from '../util/constants';
import {getEntries} from '../util/entries';

const PAGELOAD_DELAY = 1000;
const LONGEST_IMAGE_DELAY = 400;

test.describe('TTVC', () => {
  // TODO(PERF-650): This test does not pass!
  test('four loading images with a concurrent mutation and a script tag', async ({page}) => {
    test.fail(); // FIXME: investigate why loading script moves TTVC
    await page.goto(`http://localhost:3000/test/images4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + LONGEST_IMAGE_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + LONGEST_IMAGE_DELAY + FUDGE);
  });
});
