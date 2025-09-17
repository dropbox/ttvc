import {expect, test} from '@playwright/test';

import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const IMG_DELAY = 500;

test.describe('TTVC late load', () => {
  test('library loaded after window.load should not miss resource tracking', async ({page}) => {
    // Navigate to the page and wait for window load.
    // On window load the page will dynamically import and initialize TTVC
    // And after TTVC is initialized will add an img resource
    // This tests that for SPAs where ttvc is loaded after window.load, resource tracking still works
    await page.goto(`/test/late-load`, {waitUntil: 'load'});

    // Wait for ttvc
    await entryCountIs(page, 1, 3000);

    const {entries, errors} = await getEntriesAndErrors(page);
    expect(entries.length).toBe(1);
    expect(errors.length).toBe(0);

    expect(entries[0].duration).toBeGreaterThan(IMG_DELAY);
  });
});
