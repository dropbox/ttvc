import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries, entryCountIs} from '../../util/entries';

const PAGELOAD_DELAY = 500;

test.describe('TTVC', () => {
  test('an user scrolls', async ({page}) => {
    await page.goto(`/test/interaction3?delay=${PAGELOAD_DELAY}`, {
    });

    await page.mouse.wheel(0, 2000)

    await entryCountIs(page, 1);

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
  });
});
