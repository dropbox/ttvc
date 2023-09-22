import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('mismatched fetch instrumentation', async ({page}) => {
    await page.goto(`/test/ajax4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1, 30000);
    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
    expect(entries[0].detail.didNetworkTimeOut).toBe(true);
  });
});
