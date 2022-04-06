import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('an appended image that fails to load + background lazyloaded script', async ({page}) => {
    await page.goto(`http://localhost:3000/test/error2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    const expectedTtvc = PAGELOAD_DELAY + IMAGE_DELAY;
    expect(entries[0]).toBeGreaterThanOrEqual(expectedTtvc);
    expect(entries[0]).toBeLessThanOrEqual(expectedTtvc + FUDGE);
  });
});
