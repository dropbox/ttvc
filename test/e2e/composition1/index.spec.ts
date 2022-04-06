import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500;
const SCRIPT_DELAY = 500;

test.describe('TTVC', () => {
  test('ajax request > script load > mutation + background lazyloaded script', async ({page}) => {
    await page.goto(`http://localhost:3000/test/composition1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);
    expect(entries.length).toBe(1);

    const expectedTtvc = PAGELOAD_DELAY + AJAX_DELAY + SCRIPT_DELAY;
    expect(entries[0]).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0]).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
