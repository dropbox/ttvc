import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('output reports timing data', async ({page}) => {
    await page.goto(`/test/output2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
    expect(entries[0].start).toBeDefined();
    expect(entries[0].end).toBeDefined();
  });

  test('output includes detail', async ({page}) => {
    await page.goto(`/test/output2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].detail).toBeDefined();
    expect(entries[0].detail.didNetworkTimeOut).toBe(false);

    const isMutationRecord = await page.evaluate(() => {
      return window.entries[0].detail.lastVisibleChange instanceof MutationRecord;
    });
    expect(isMutationRecord).toBe(true);
  });
});
