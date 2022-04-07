import {decrementAjaxCount, incrementAjaxCount} from '../../src';
import {MINIMUM_IDLE_MS} from '../../src/constants';
import {requestAllIdleCallback} from '../../src/requestAllIdleCallback';
import {FUDGE} from '../util/constants';

const wait = async (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

describe('requestAllIdleCallback', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
    requestAllIdleCallback(callback);
  });

  it('waits MINIMUM_IDLE_MS before resolving', async () => {
    await wait(MINIMUM_IDLE_MS);
    expect(callback).not.toHaveBeenCalled();
    await wait(FUDGE);
    expect(callback).toHaveBeenCalled();
  });

  it('respects pending ajax requests', async () => {
    incrementAjaxCount();
    await wait(MINIMUM_IDLE_MS + FUDGE);
    expect(callback).not.toHaveBeenCalled();

    decrementAjaxCount();
    await wait(MINIMUM_IDLE_MS + FUDGE);
    expect(callback).toHaveBeenCalled();
  });

  it('does not trigger callback during idle periods less than MINIMUM_IDLE_MS', async () => {
    incrementAjaxCount();
    decrementAjaxCount();
    await wait(MINIMUM_IDLE_MS / 2);
    incrementAjaxCount();
    await wait(MINIMUM_IDLE_MS + FUDGE);
    expect(callback).not.toHaveBeenCalled();
  });
});
