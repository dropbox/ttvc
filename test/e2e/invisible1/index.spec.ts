import {test, expect} from '@playwright/test';

import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('a single image with style="display: none"', async ({page}) => {
    await page.goto(`/test/invisible1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
  });
});
