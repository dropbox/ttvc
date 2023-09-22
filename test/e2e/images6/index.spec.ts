import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors, entryCountIs} from '../../util/entries';

const PAGELOAD_DELAY = 1000;

test.describe('TTVC', () => {
  test('an image without src, removed and re-appended', async ({page}) => {
    await page.goto(`/test/images6?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);

    // this assertion highlights an issue observed in the following chromium version.
    // Chromium: 101.0.4951.67 (Official Build) (arm64)
    expect(entries[0].detail.didNetworkTimeOut).toBe(false);
  });
});
