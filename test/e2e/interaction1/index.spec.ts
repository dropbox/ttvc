import {test, expect} from '@playwright/test';

import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const MUTATION_DELAY = 500;

test.describe('TTVC', () => {
  test('user clicks before page completes loading', async ({page}) => {
    await page.goto(`/test/interaction1`, {
      waitUntil: 'domcontentloaded',
    });

    // user interaction should abort calculation
    await page.click('body', {delay: MUTATION_DELAY / 2});

    // assert that no metric has been reported
    const {entries, errors} = await getEntriesAndErrors(page);
    expect(entries.length).toBe(0);

    expect(errors.length).toBe(1);
    expect(errors[0].cancellationReason).toBe('USER_INTERACTION');
    expect(errors[0].eventType).toBe('click');

    // wait long enough to ensure ttvc would have been logged
    try {
      await entryCountIs(page, 1, 3000);
    } catch (e) {
      // pass
    }
  });
});
