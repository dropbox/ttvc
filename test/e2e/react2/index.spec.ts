import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('a simple react application with an image', async ({page}) => {
    await page.goto(`/test/react2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
    // react loads and runs at inconsistent speeds, so oduble the fudge factor
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY + FUDGE * 2);
  });
});
