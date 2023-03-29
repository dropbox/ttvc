import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 1000;

test.describe('TTVC', () => {
  test('a static HTML document', async ({page}) => {
    await page.goto(`/test/bfcache?delay=${PAGELOAD_DELAY}&cache=true`, {
      waitUntil: 'networkidle',
    });

    let entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);

    await page.goto(`/test/bfcache/about?delay=${PAGELOAD_DELAY}&cache=true`, {
      waitUntil: 'networkidle',
    });

    entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);

    await page.goBack({waitUntil: 'networkidle'});

    entries = await getEntries(page);

    // note: webkit clears previous values from this list on page restore
    expect(entries[entries.length - 1].duration).toBeGreaterThanOrEqual(0);
    expect(entries[entries.length - 1].duration).toBeLessThanOrEqual(FUDGE);
  });
});
