import {test, expect, Page} from '@playwright/test';
import {getEntries, entryCountIs} from '../util/entries';

const PAGELOAD_DELAY = 1000;
const AJAX_DELAY = 500; // see text-mutation.html

test.describe('TTVC', () => {
  test('respects delayed text-only mutations', async ({page}) => {
    test.fail(); // TODO(PERF-650): This test does not pass!
    await page.goto(`http://localhost:3000/test/text-mutation?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBeGreaterThanOrEqual(PAGELOAD_DELAY + AJAX_DELAY);
  });
});
