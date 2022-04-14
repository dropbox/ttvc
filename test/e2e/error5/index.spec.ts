import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('an unsuported envirioment', async ({page}) => {
    test.fail(); //we excpect ttvc calculator to fail in unsuported invirioments
    await page.goto(`/test/error5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
  });
});
