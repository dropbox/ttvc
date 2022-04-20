import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500; // see text-mutation.html

test.describe('TTVC', () => {
  test('a mutation triggered after an AJAX request', async ({page}) => {
    await page.goto(`/test/ajax1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    // await entryCountIs(page, 1);
    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY + FUDGE);
  });
});
