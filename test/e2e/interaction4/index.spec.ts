import {test, expect} from '@playwright/test';

import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 500;

test.describe('TTVC', () => {
  test('measurement cancelled', async ({page}) => {
    await page.goto(`/test/interaction4?delay=${PAGELOAD_DELAY}`, {waitUntil: 'domcontentloaded'});

    const entries = await getEntries(page);

    expect(entries.length).toBe(0);
  });
});
