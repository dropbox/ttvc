import {test, expect} from '@playwright/test';

import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('inline script injected after "load"', async ({page}) => {
    await page.goto(`/test/scripts4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const entries = await getEntries(page);

    // assert that inline resource doesn't cause ttvc to get stuck
    expect(entries.length).toBe(1);
  });
});
