import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 1000;
const LONGEST_IMAGE_DELAY = 400;

test.describe('TTVC', () => {
  test('four loading images with a concurrent mutation and a script tag', async ({page}) => {
    await page.goto(`/test/images4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + LONGEST_IMAGE_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + LONGEST_IMAGE_DELAY + FUDGE);
  });
});
