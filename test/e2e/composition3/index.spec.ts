import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500;
const CPU_DELAY = 1000;
const SCRIPT_DELAY = 500;

test.describe('TTVC', () => {
  test('script load > ajax request > CPU work > script load > mutation', async ({page}) => {
    await page.goto(`http://localhost:3000/test/composition3?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const entries = await getEntries(page);
    expect(entries.length).toBe(1);

    const expectedTtvc = PAGELOAD_DELAY + SCRIPT_DELAY + AJAX_DELAY + CPU_DELAY + SCRIPT_DELAY;
    expect(entries[0]).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0]).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
