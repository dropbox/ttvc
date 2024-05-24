import {test, expect} from '@playwright/test';

import {getEntriesAndErrors} from '../../util/entries';

const ANIMATION_DELAY = 3000;

test.describe('TTVC', () => {
  test('an animation delay', async ({page}) => {
    await page.goto(`/test/animation1`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeLessThan(ANIMATION_DELAY);
  });
});
