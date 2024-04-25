import {test, expect} from '@playwright/test';

import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const IFRAME_DELAY = 500;

test.describe('TTVC', () => {
  test('a static document with an iframe', async ({page}) => {
    await page.goto(`/test/iframe4?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries} = await getEntriesAndErrors(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThan(PAGELOAD_DELAY + IFRAME_DELAY);
  });
});
