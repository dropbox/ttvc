import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {entryCountIs, getEntries} from '../../util/entries';

test.use({
  // If you run this test headless, you must run with --headless=new to enable prerender2.
  launchOptions: {
    args: ['--headless=new'],
  },
});

test.describe('TTVC', () => {
  // NOTE: At time of writing, there is a bug in chromium which prevents
  // playwright from accessing the correct frame to run assertions after a
  // prerendered page has been activated.
  // These tests should be re-enabled once this issue is resolved.
  // https://github.com/microsoft/playwright/issues/22733
  test.skip('navigation to a partially prerendered route', async ({browserName, page}) => {
    // neither safari nor firefox do not support page prerendering
    test.fail(['safari', 'firefox'].includes(browserName));

    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(1000);

    await page.click('a');

    await entryCountIs(page, 1);
    const entries = await getEntries(page);

    expect(entries[0].duration).toBeGreaterThanOrEqual(1000);
    expect(entries[0].duration).toBeLessThanOrEqual(1000 + FUDGE);
  });

  // NOTE: At time of writing, there is a bug in chromium which prevents
  // playwright from accessing the correct frame to run assertions after a
  // prerendered page has been activated.
  // These tests should be re-enabled once this issue is resolved.
  // https://github.com/microsoft/playwright/issues/22733
  test.skip('navigation to a fully prerendered route', async ({browserName, page}) => {
    // neither safari nor firefox do not support page prerendering
    test.fail(['safari', 'firefox'].includes(browserName));

    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(5000);

    await page.click('a');

    await entryCountIs(page, 1);
    const entries = await getEntries(page);

    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
    expect(entries[0].duration).toBeLessThanOrEqual(0 + FUDGE);
  });
});
