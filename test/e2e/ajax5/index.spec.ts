import {test, expect} from '@playwright/test';

import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('mismatched fetch instrumentation (timeout disabled)', async ({page}) => {
    await page.goto(`/test/ajax5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1, 5000);
    const entries = await getEntries(page);

    // ttvc should never be reported
    expect(entries.length).toBe(0);
  });
});
