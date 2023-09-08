import type {Page} from '@playwright/test';
import type {Metric, CancellationError} from '../../src';

// Use window.entries to communicate between browser and test processes
declare global {
  interface Window {
    entries: Metric[];
    errors: CancellationError[];
  }
}

/** Get the list of performance entries that have been recorded from the browser */
export const getEntries = (page: Page) => page.evaluate(() => window.entries);

/** Get the list of performance entries and errors that have been recorded from the browser */
export const getEntriesAndErrors = (page: Page) =>
  page.evaluate(() => {
    return {
      entries: window.entries,
      errors: window.errors,
    };
  });

/**
 * Wait until at least {count} performance entries have been logged.
 */
export const entryCountIs = async (page: Page, count: number, timeout = 5000): Promise<void> => {
  await page.waitForFunction((count) => window.entries.length >= count, count, {
    polling: 500,
    timeout: timeout,
  });
};
