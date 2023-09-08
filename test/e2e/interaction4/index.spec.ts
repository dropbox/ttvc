import {test, expect} from '@playwright/test';

import {getEntriesAndErrors, entryCountIs} from '../../util/entries';

const PAGELOAD_DELAY = 500;

test.describe('TTVC', () => {
  test('measurement manually cancelled', async ({page}) => {
    await page.goto(`/test/interaction4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'domcontentloaded',
    });

    const {entries, errors} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(0);

    expect(errors[0].cancellationReason).toBe('MANUAL_CANCELLATION');
    expect(errors.length).toBe(1);

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 3000);
    } catch (e) {
      // pass
    }
  });
});
