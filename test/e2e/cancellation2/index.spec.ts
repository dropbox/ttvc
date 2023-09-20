import {test, expect} from '@playwright/test';

import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

test.describe('TTVC', () => {
  test('several manual cancellations result in one error callback invocation', async ({page}) => {
    await page.goto(`/test/cancellation2`, {
      waitUntil: 'domcontentloaded',
    });

    // assert that no metric has been reported
    const {entries, errors} = await getEntriesAndErrors(page);
    expect(entries.length).toBe(0);

    expect(errors.length).toBe(1);
    expect(errors[0].cancellationReason).toBe('MANUAL_CANCELLATION');
    expect(errors[0].eventType).toBe('test_event_type_1');

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 3000);
    } catch (e) {
      // pass
    }
  });
});
