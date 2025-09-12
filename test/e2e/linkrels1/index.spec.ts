import {test, expect} from '@playwright/test';

import {FUDGE} from '../../util/constants';
import {getEntriesAndErrors} from '../../util/entries';

const PAGELOAD_DELAY = 200;

test.describe('TTVC - ignored link rels', () => {
  test('ignored link rels do not delay TTVC', async ({page}) => {
    await page.goto(`/test/linkrels1?delay=${PAGELOAD_DELAY}`, {
      waitUntil: 'networkidle',
    });

    const {entries, errors} = await getEntriesAndErrors(page);

    // should produce a single entry, and duration should be ~= pageload delay
    expect(errors.length).toBe(0);
    expect(entries.length).toBe(1);
    expect(entries[0].duration).toBeGreaterThanOrEqual(PAGELOAD_DELAY);
    expect(entries[0].duration).toBeLessThanOrEqual(PAGELOAD_DELAY + FUDGE);
  });
});


