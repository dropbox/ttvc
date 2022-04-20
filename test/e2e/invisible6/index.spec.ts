import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const SCRIPT_DELAY = 200;

test.describe('TTVC', () => {
  test('a visible mutation + an invisible mutation (left:-1000px)', async ({page}) => {
    await page.goto(`/test/invisible6?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    const expectedTtvc = PAGELOAD_DELAY + SCRIPT_DELAY;
    expect(entries[0].duration).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0].duration).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
