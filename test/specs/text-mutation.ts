import {entryCountIs, getEntries} from '../util/entries';

describe('TTVC', () => {
  it('respects delayed text-only mutations', async () => {
    await browser.url('http://localhost:3000/test/text-mutation?delay=1000');

    await entryCountIs(1);

    const entries = await getEntries();

    expect(entries.length).toBe(1);
    expect(entries[0]).toBe(123);
  });
});
