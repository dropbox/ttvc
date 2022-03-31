import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const SCRIPT_DELAY = 500;

test.describe('TTVC', () => {
  test('a single loading script tag and then a mutation', async ({page, browserName}) => {
    // safari doesn't trigger first paint until all script tags have resolved
    test.fail(browserName === 'webkit');
    // in firefox, intersection observer event doesn't trigger before window.onload
    test.fail(browserName === 'firefox');

    await page.goto(`http://localhost:3000/test/scripts1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + SCRIPT_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + SCRIPT_DELAY + FUDGE);
  });
});
