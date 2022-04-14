import {decrementAjaxCount, incrementAjaxCount} from '../../src';
import {IDLE_TIMEOUT} from '../../src';
import {requestAllIdleCallback} from '../../src/requestAllIdleCallback';
import {FUDGE} from '../util/constants';

const wait = async (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

describe('requestAllIdleCallback', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
    requestAllIdleCallback(callback);
  });

  it('waits IDLE_TIMEOUT before resolving', async () => {
    await wait(IDLE_TIMEOUT);
    expect(callback).not.toHaveBeenCalled();
    await wait(FUDGE);
    expect(callback).toHaveBeenCalled();
  });

  it('respects pending ajax requests', async () => {
    incrementAjaxCount();
    await wait(IDLE_TIMEOUT + FUDGE);
    expect(callback).not.toHaveBeenCalled();

    decrementAjaxCount();
    await wait(IDLE_TIMEOUT + FUDGE);
    expect(callback).toHaveBeenCalled();
  });

  it('does not trigger callback during idle periods less than IDLE_TIMEOUT', async () => {
    incrementAjaxCount();
    decrementAjaxCount();
    await wait(IDLE_TIMEOUT / 2);
    incrementAjaxCount();
    await wait(IDLE_TIMEOUT + FUDGE);
    expect(callback).not.toHaveBeenCalled();
  });
});
