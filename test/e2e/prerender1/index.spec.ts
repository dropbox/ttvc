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
    // only chromium supports page prerendering now
    test.skip(browserName !== 'chromium');

    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(1000);

    await page.click('a');

    await entryCountIs(page, 1);
    const entries = await getEntries(page);

    expect(entries[0].duration).toBeGreaterThanOrEqual(1000);
    expect(entries[0].duration).toBeLessThanOrEqual(1000 + FUDGE);
    expect(entries[0].detail.navigationType).toBe('prerender');
  });

  // NOTE: At time of writing, there is a bug in chromium which prevents
  // playwright from accessing the correct frame to run assertions after a
  // prerendered page has been activated.
  // These tests should be re-enabled once this issue is resolved.
  // https://github.com/microsoft/playwright/issues/22733
  test.skip('navigation to a fully prerendered route', async ({browserName, page}) => {
    // only chromium supports page prerendering now
    test.skip(browserName !== 'chromium');

    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(5000);

    await page.click('a');

    await entryCountIs(page, 1);
    const entries = await getEntries(page);

    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
    expect(entries[0].duration).toBeLessThanOrEqual(0 + FUDGE);
    expect(entries[0].detail.navigationType).toBe('prerender');
  });

  // NOTE: At time of writing, there is a bug in chromium which prevents
  // playwright from accessing the correct frame to run assertions after a
  // prerendered page has been activated.
  // These tests should be re-enabled once this issue is resolved.
  // https://github.com/microsoft/playwright/issues/22733
  test.skip('navigation to a prerendered page, then trigger a soft navigation', async ({
    browserName,
    page,
  }) => {
    // only chromium supports page prerendering now
    test.skip(browserName !== 'chromium');

    await page.goto(`/test/prerender1`, {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(5000);

    await page.click('a');

    await entryCountIs(page, 1);
    let entries = await getEntries(page);

    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
    expect(entries[0].duration).toBeLessThanOrEqual(0 + FUDGE);
    expect(entries[0].detail.navigationType).toBe('prerender');

    // trigger a navigation
    await page.click('[data-goto="/about"]');

    await entryCountIs(page, 2);
    entries = await getEntries(page);

    expect(entries[1].duration).toBe(0);
    expect(entries[1].detail.navigationType).toBe('script');
  });
});
