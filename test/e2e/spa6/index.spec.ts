import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const AJAX_DELAY = 1000;
const INTERACTION_DELAY = 500;

test.describe('TTVC', () => {
  test.describe('single page app: hash router + ajax + mutation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/test/spa6?delay=${PAGELOAD_DELAY}`, {
        waitUntil: 'networkidle',
      });
    });

    test('initial pageload', async ({page}) => {
      const {entries} = await getEntriesAndErrors(page);

      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
      expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY + FUDGE);
      expect(entries[0].detail.navigationType).toBe('navigate');
    });

    test('cancellation of unfinished measurement on new navigation', async ({
      page,
      browserName,
    }) => {
      // in chromium, the second ajax request runs significantly slower for some reason
      test.fail(browserName === 'chromium');

      // trigger a navigation
      await page.click('[data-goto="/about"]');

      // trigger a second navigation *before* the first resolves
      await page.waitForTimeout(INTERACTION_DELAY);
      await page.click('[data-goto="/about"]');

      // wait for a possible duplicate entry
      try {
        await entryCountIs(page, 3, 2000);
      } catch (e) {
        // pass
      }
      const {entries, errors} = await getEntriesAndErrors(page);

      expect(entries.length).toBe(2);
      expect(entries[1].duration).toBeGreaterThanOrEqual(AJAX_DELAY);
      expect(entries[1].duration).toBeLessThanOrEqual(AJAX_DELAY + FUDGE);
      expect(entries[1].detail.navigationType).toBe('script');

      // We expect the interrupted measurement to be ended before the start of the new measurement
      expect(errors[0].end).toBeLessThanOrEqual(entries[1].start + FUDGE);
      expect(errors[0].duration).toBeGreaterThanOrEqual(INTERACTION_DELAY);
      expect(errors[0].duration).toBeLessThanOrEqual(INTERACTION_DELAY + FUDGE);
      expect(errors[0].cancellationReason).toBe('NEW_MEASUREMENT');
    });
  });
});
