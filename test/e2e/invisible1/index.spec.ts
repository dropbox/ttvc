import {test, expect} from '@playwright/test';

import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('a single image with style="display: none"', async ({page}) => {
    await page.goto(`http://localhost:3000/test/invisible1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
  });
});
