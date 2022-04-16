import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('mismatched fetch instrumentation', async ({page}) => {
    await page.goto(`/test/ajax4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1, 30000);
    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
  });
});
