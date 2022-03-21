import {test, expect, Page} from '@playwright/test';
import {getEntries, entryCountIs} from '../util/entries';

test.describe('TTVC', () => {
  test('respects delayed text-only mutations', async ({page}) => {
    await page.goto('http://localhost:3000/test/text-mutation?delay=1000', {
      waitUntil: 'networkidle',
    });

    // await entryCountIs(page, 1);

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0]).toBe(123);
  });
});
