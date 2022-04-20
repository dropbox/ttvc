import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntries} from '../../util/entries';

const PAGELOAD_DELAY = 200;
const STYLESHEET_DELAY = 500;

test.describe('TTVC', () => {
  test('a static HTML document', async ({page}) => {
    test.fail(); // ttvc doesn't account for stylesheets yet
    await page.goto(`/test/stylesheet1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const entries = await getEntries(page);

    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY + STYLESHEET_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + STYLESHEET_DELAY + FUDGE);
  });
});
