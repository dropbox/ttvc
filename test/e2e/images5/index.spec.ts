import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 1000;
const IMAGE_DELAY = 500;

test.describe('TTVC', () => {
  test('one loading image and one image w/ inline data url', async ({page}) => {
    await page.goto(`/test/images5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + IMAGE_DELAY + FUDGE);
  });
});
