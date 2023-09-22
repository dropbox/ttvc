import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500; // see text-mutation.html

test.describe('TTVC', () => {
  test('a text-only mutation triggered after AJAX', async ({page}) => {
    await page.goto(`/test/ajax2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY + FUDGE);
  });
});
