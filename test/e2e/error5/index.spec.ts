import {test, expect} from '@playwright/test';

const PAGELOAD_DELAY = 200;

const unsupportedErrorMessage = new Error(
  'VisuallyCompleteCalculator: This browser/runtime is not supported.'
);

test.describe('TTVC', () => {
  test('an unsupported environment', async ({page}) => {
    const errorCount: Array<Error> = [];
    page.on('pageerror', (exception) => {
      errorCount.push(exception);
    });

    await page.goto(`/test/error5?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    expect(errorCount.length).toBe(1);
    expect(errorCount[0]).toEqual(unsupportedErrorMessage);
  });
});
