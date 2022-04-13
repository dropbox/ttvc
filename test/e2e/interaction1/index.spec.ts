import {test, expect} from '@playwright/test';

import {entryCountIs, getEntries} from '../../util/entries';

test.describe('TTVC', () => {
  test('user clicks before page completes loading', async ({page}) => {
    await page.goto(`/test/interaction1`, {
      waitUntil: 'domcontentloaded',
    });

    // user interaction should abort calculation
    await page.click('body');

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 3000);
    } catch (e) {
      // pass
    }

    // assert that no metric has been reported
    const entries = await getEntries(page);
    expect(entries.length).toBe(0);
  });
});
