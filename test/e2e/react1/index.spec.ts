import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test('a simple react application', async ({page}) => {
    test.fail(); // ttvc is measured before intersection observer events fire
    await page.goto(`http://localhost:3000/test/static1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
  });
});
