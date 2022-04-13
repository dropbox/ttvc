import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 500;

test.describe('TTVC', () => {
  test.describe('single page app: hash router + ajax + mutation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/test/spa2?delay=${PAGELOAD_DELAY}`, {
        waitUntil: 'networkidle',
      });
    });

    test('initial pageload', async ({page}) => {
      const entries = await getEntries(page);

      expect(entries.length).toBe(1);
      expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
      expect(entries[0]).toBeLessThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY + FUDGE);
    });

    test('SPA navigation', async ({page}) => {
      // trigger a navigation
      await page.click('[data-goto="/about"]');

      await entryCountIs(page, 2);
      const entries = await getEntries(page);

      expect(entries[1]).toBeGreaterThanOrEqual(AJAX_DELAY);
      expect(entries[1]).toBeLessThanOrEqual(AJAX_DELAY + FUDGE);
    });
  });
});
