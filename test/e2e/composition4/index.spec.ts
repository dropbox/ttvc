import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500;
const TIMEOUT_DELAY = 100;

test.describe('TTVC', () => {
  test('ajax request > short timeout > ajax request > mutation', async ({page}) => {
    await page.goto(`/test/composition4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const {entries} = await getEntriesAndErrors(page);
    expect(entries.length).toBe(1);

    const expectedTtvc = PAGELOAD_DELAY + AJAX_DELAY + TIMEOUT_DELAY + AJAX_DELAY;
    expect(entries[0].duration).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0].duration).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
