import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const CPU_DELAY = 500;

test.describe('TTVC', () => {
  test('CPU load followed by a mutation', async ({page}) => {
    test.fail(); // ttvc should wait for CPU bound work to complete
    await page.goto(`http://localhost:3000/test/cpu1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + CPU_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + CPU_DELAY + FUDGE);
  });
});
