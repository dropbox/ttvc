import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test.describe('single page app: hash router + sync mutation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/test/spa1?delay=${PAGELOAD_DELAY}`, {
        waitUntil: 'networkidle',
      });
    });

    test('initial pageload', async ({page}) => {
      const {entries} = await getEntriesAndErrors(page);

      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
      expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
      expect(entries[0].detail.navigationType).toBe('navigate');
    });

    test('SPA navigation', async ({page}) => {
      // trigger a navigation
      await page.click('[data-goto="/about"]');

      await entryCountIs(page, 2);
      const {entries} = await getEntriesAndErrors(page);

      expect(entries[1].duration).toBeGreaterThanOrEqual(0);
      expect(entries[1].duration).toBeLessThanOrEqual(0 + FUDGE);
      expect(entries[1].detail.navigationType).toBe('script');
    });
  });
});
