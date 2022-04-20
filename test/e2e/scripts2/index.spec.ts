import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const FIRST_SCRIPT_DELAY = 500;

test.describe('TTVC', () => {
  test('two loading script tags, the first triggers a mutation', async ({page}) => {
    await page.goto(`/test/scripts2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + FIRST_SCRIPT_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FIRST_SCRIPT_DELAY + FUDGE);
  });
});
