import {test, expect} from '@playwright/test';

import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

test.describe('TTVC', () => {
  test('tab is backgrounded before page completes loading', async ({page}) => {
    await page.goto(`/test/interaction1`, {
      waitUntil: 'domcontentloaded',
    });

    // visibility change should abort calculation
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        get() {
          return 'hidden';
        },
      });
      document.dispatchEvent(new Event('visibilitychange', {bubbles: true}));
    });

    // assert that no metric has been reported
    const {entries, errors} = await getEntriesAndErrors(page);
    expect(entries.length).toBe(0);

    expect(errors.length).toBe(1);
    expect(errors[0].cancellationReason).toBe('VISIBILITY_CHANGE');
    expect(errors[0].eventType).toBe('visibilitychange');

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 3000);
    } catch (e) {
      // pass
    }
  });
});
