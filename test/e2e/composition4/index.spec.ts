import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500;
const TIMEOUT_DELAY = 100;

test.describe('TTVC', () => {
  test('ajax request > short timeout > ajax request > mutation', async ({page}) => {
    test.fail(); // requestAllIdleCallback has a bug that can be triggered by a brief idle period
    await page.goto(`/test/composition4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const entries = await getEntries(page);
    expect(entries.length).toBe(1);

    const expectedTtvc = PAGELOAD_DELAY + AJAX_DELAY + TIMEOUT_DELAY + AJAX_DELAY;
    expect(entries[0]).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0]).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
