import {NetworkIdleObservable} from '../../src/networkIdleObservable';

describe('networkIdleObservable', () => {
  let unsubscribe: () => void;
  let subscriber: jest.Mock;
  let networkIdleObservable: NetworkIdleObservable;

  beforeEach(async () => {
    networkIdleObservable = new NetworkIdleObservable();
    subscriber = jest.fn();
    unsubscribe = networkIdleObservable.subscribe(subscriber);
  });

  afterEach(() => {
    unsubscribe();
  });

  it('exposes the current network status', () => {
    expect(networkIdleObservable.isIdle()).toBe(true);
  });

  it('reports busy while pending ajax requests is greater than 1', () => {
    networkIdleObservable.incrementAjaxCount();
    expect(networkIdleObservable.isIdle()).toBe(false);
  });

  it('reports true once pending ajax requests reaches zero again', () => {
    networkIdleObservable.incrementAjaxCount();
    networkIdleObservable.decrementAjaxCount();
    expect(networkIdleObservable.isIdle()).toBe(true);
  });

  it('recovers gracefully if decrementAjaxCount is called excessively', () => {
    networkIdleObservable.decrementAjaxCount();
    networkIdleObservable.decrementAjaxCount();
    expect(networkIdleObservable.isIdle()).toBe(true);
    networkIdleObservable.incrementAjaxCount();
    expect(networkIdleObservable.isIdle()).toBe(false);
  });

  it('does not alert new subscribers to the initial network state', () => {
    expect(subscriber).toHaveBeenCalledTimes(0);
  });

  it('alerts subscribers when network state becomes busy', () => {
    networkIdleObservable.incrementAjaxCount();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenLastCalledWith('BUSY');
  });

  it('alerts subscribers when network state becomes idle', () => {
    networkIdleObservable.incrementAjaxCount();
    networkIdleObservable.decrementAjaxCount();
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith('IDLE');
  });
});
