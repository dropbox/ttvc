import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('output reports timing data', async ({page}) => {
    await page.goto(`/test/output1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY + FUDGE);
    expect(entries[0].start).toBeDefined();
    expect(entries[0].end).toBeDefined();
  });

  test('output includes detail', async ({page}) => {
    await page.goto(`/test/output1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].detail).toBeDefined();
    expect(entries[0].detail.didNetworkTimeOut).toBe(false);
    const isImageElement = await page.evaluate(() => {
      return window.entries[0].detail.lastVisibleChange instanceof HTMLImageElement;
    });
    expect(isImageElement).toBe(true);
  });
});
