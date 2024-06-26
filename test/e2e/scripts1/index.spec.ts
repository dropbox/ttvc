import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const SCRIPT_DELAY = 500;

test.describe('TTVC', () => {
  test('a single loading script tag and then a mutation', async ({page}) => {
    await page.goto(`/test/scripts1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + SCRIPT_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + SCRIPT_DELAY + FUDGE);
  });
});
