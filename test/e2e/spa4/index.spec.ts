import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC', () => {
  test.describe('single page app: hash router with NO mutations', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/test/spa4?delay=${PAGELOAD_DELAY}`, {
        waitUntil: 'networkidle',
      });
    });

    test('initial pageload', async ({page}) => {
      const entries = await getEntries(page);

      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
      expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
    });

    test('SPA navigation', async ({page}) => {
      // trigger a navigation
      await page.click('[data-goto="/about"]');

      await entryCountIs(page, 2);
      const entries = await getEntries(page);

      expect(entries[1].duration).toBe(0);
    });
  });
});
