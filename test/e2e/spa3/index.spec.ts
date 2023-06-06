import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test.describe('single page app: duplicate "locationchange" event', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/test/spa3?delay=${PAGELOAD_DELAY}`, {
        waitUntil: 'networkidle',
      });
    });

    test('initial pageload', async ({page}) => {
      const entries = await getEntries(page);

      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
      expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
      expect(entries[0].detail.navigationType).toBe('navigate');
    });

    test('SPA navigation', async ({page}) => {
      // trigger a navigation
      await page.click('[data-goto="/about"]');

      // wait for a possible duplicate entry
      try {
        await entryCountIs(page, 3, 1000);
      } catch (e) {
        // pass
      }
      const entries = await getEntries(page);

      expect(entries.length).toBe(2);
      expect(entries[1].duration).toBeGreaterThanOrEqual(0);
      expect(entries[1].duration).toBeLessThanOrEqual(0 + FUDGE);
      expect(entries[1].detail.navigationType).toBe('script');
    });
  });
});
