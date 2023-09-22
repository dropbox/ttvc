import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 1000;

test.describe('TTVC', () => {
  test('a static HTML document', async ({page}) => {
    await page.goto(`/test/bfcache?delay=${PAGELOAD_DELAY}&cache=true`, {
      waitUntil: 'networkidle',
    });

    let {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
    expect(entries[0].detail.navigationType).toBe('navigate');

    await page.goto(`/test/bfcache/about?delay=${PAGELOAD_DELAY}&cache=true`, {
      waitUntil: 'networkidle',
    });

    ({entries} = await getEntriesAndErrors(page));

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
    expect(entries[0].detail.navigationType).toBe('navigate');

    await page.goBack({waitUntil: 'networkidle'});

    ({entries} = await getEntriesAndErrors(page));

    // note: webkit clears previous values from this list on page restore
    expect(entries[entries.length - 1].duration).toBeGreaterThanOrEqual(0);
    expect(entries[entries.length - 1].duration).toBeLessThanOrEqual(FUDGE);
    expect(entries[entries.length - 1].detail.navigationType).toBe('back_forward');
  });
});
