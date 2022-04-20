import {test, expect} from '@playwright/test';

import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('mismatched fetch instrumentation (timeout disabled)', async ({page}) => {
    await page.goto(`/test/ajax5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 5000);
    } catch (e) {
      // pass
    }

    const entries = await getEntries(page);

    // ttvc should never be reported
    expect(entries.length).toBe(0);
  });
});
