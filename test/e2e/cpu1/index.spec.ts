import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const CPU_DELAY = 500;

test.describe('TTVC', () => {
  test('CPU load followed by a mutation', async ({page}) => {
    await page.goto(`/test/cpu1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    await entryCountIs(page, 1);
    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + CPU_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + CPU_DELAY + FUDGE);
  });
});
