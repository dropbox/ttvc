import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IFRAME_DELAY = 500;

test.describe('TTVC', () => {
  test('an iframe dynamically added to document', async ({page}) => {
    await page.goto(`/test/iframe2?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IFRAME_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + IFRAME_DELAY + FUDGE);
  });
});
