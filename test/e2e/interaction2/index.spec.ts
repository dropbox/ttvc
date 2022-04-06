import {test, expect} from '@playwright/test';

import {entryCountIs, getEntries} from '../../util/entries';

test.describe('TTVC', () => {
  test('tab is backgrounded before page completes loading', async ({page}) => {
    await page.goto(`http://localhost:3000/test/interaction1`, {
      waitUntil: 'domcontentloaded',
    });

    // visibility change should abort calculation
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        get() {
          return 'hidden';
        },
      });
      document.dispatchEvent(new Event('visibilityChange', {bubbles: true}));
    });

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
