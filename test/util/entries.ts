import type {Page} from '@playwright/test';

// Use window.entries to communicate between browser and test processes
declare global {
  interface Window {
    entries: number[];
  }
}

/** Get the list of performance entries that have been recorded from the browser */
export const getEntries = (page: Page) => page.evaluate(() => window.entries);

/**
 * Wait until at least {count} performance entries have been logged.
 */
export const entryCountIs = async (page: Page, count: number, timeout = 5000): Promise<void> => {
  await page.waitForFunction((count) => window.entries.length >= count, count, {
    polling: 500,
    timeout: timeout,
  });
};
