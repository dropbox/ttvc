import {test, expect} from '@playwright/test';

import {FUDGE} from '../util/constants';
import {getEntries} from '../util/entries';

const PAGELOAD_DELAY = 1000;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  // TODO(PERF-650): This test does not pass!
  test('a single loading image', async ({page}) => {
    test.fail(); // ttvc should not require mutations to mark a timestamp
    await page.goto(`http://localhost:3000/test/images1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY + FUDGE);
  });
});
