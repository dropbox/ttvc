import {test, expect} from '@playwright/test';

import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('malformed link tag injected after "load"', async ({page}) => {
    await page.goto(`/test/scripts5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const {entries} = await getEntriesAndErrors(page);

    // assert that this malformed resource doesn't cause ttvc to get stuck
    expect(entries.length).toBe(1);
  });
});
