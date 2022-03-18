// Use window.entries to communicate between browser and test processes
declare global {
  interface Window {
    entries: number[];
  }
}

/** Get the list of performance entries that have been recorded from the browser */
export const getEntries = () => browser.execute(() => window.entries);

/**
 * wait until at least {count} performance entries have been logged
 * @returns true if the condition was met before timeout
 */
export const entryCountIs = (count): Promise<true | void> =>
  browser.waitUntil(async () => {
    const entries = await getEntries();
    return entries.length >= count;
  });
