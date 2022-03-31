import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries, entryCountIs} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500; // see text-mutation.html

test.describe('TTVC', () => {
  test('a mutation triggered after an AJAX request', async ({page}) => {
    test.fail(); // ttvc should wait until all AJAX requests have resolved before measuring
    await page.goto(`http://localhost:3000/test/ajax3?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY + FUDGE);
  });
});
