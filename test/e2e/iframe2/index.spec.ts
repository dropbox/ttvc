import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IFRAME_DELAY = 500;

test.describe('TTVC', () => {
  test('an iframe dynamically added to document', async ({page}) => {
    test.fail(); // TODO: iframe content is not accounted for
    await page.goto(`/test/iframe2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IFRAME_DELAY);
    expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + IFRAME_DELAY + FUDGE);
  });
});
