import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

test.describe('TTVC', () => {
  //we had to skip this test since chromium does not support prerendering yet, hopefully in the future we can enforce it. Meanwhile you can test this changes manually by waiting a set amount before the prerender and then navigating, ttvc should be somewhere less than the delay all the way up to zero depending on how long you wait.
  test.skip('a prerendered navigation', async ({page}) => {
    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(1000);

    await page.click('a');

    await page.waitForTimeout(2000);

    const entries = await getEntries(page);

    console.log(entries);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(1000);
    expect(entries[0].duration).toBeLessThanOrEqual(1000 + FUDGE);
  });

  test.describe('TTVC', () => {
    //we had to skip this test since chromium does not support prerendering yet, hopefully in the future we can enforce it. Meanwhile you can test this changes manually by waiting a set amount before the prerender and then navigating, ttvc should be somewhere less than the delay all the way up to zero depending on how long you wait.
    test.skip('a prerendered navigation', async ({page}) => {
      await page.goto(`/test/prerender1`, {
        waitUntil: 'networkidle',
      });

      await page.waitForTimeout(2000);

      await page.click('a');

      await page.waitForTimeout(2000);

      const entries = await getEntries(page);

      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBeGreaterThanOrEqual(0);
      expect(entries[0].duration).toBeLessThanOrEqual(0 + FUDGE);
    });
  });
});
