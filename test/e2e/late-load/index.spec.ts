import {expect, test} from '@playwright/test';

import {getEntriesAndErrors} from '../../util/entries';

test.describe('TTVC late load', () => {
  test('library loaded after window.load should miss resource tracking', async ({page}) => {
    // navigate and wait for the page load to fire (our page appends TTVC after load)
    await page.goto(`/test/late-load`, {waitUntil: 'load'});

    // wait long enough for scripts to be appended and the delayed image to load
    await page.waitForTimeout(1200);

    const {entries, errors} = await getEntriesAndErrors(page);

    // We expect TTVC to track resource downloads even when loaded late. This
    // assertion is intentionally strict so the test fails today and will pass
    // once the underlying library is fixed to handle late initialisation.
    expect(entries.length).toBe(1);
    expect(errors.length).toBe(0);
  });
});
