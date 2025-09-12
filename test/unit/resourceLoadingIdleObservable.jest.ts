import {NetworkIdleObservable} from '../../src/networkIdleObservable';
import {CONFIG} from '../../src/util/constants';

const wait = async (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

describe('ResourceLoadingIdleObservable - link rel ignore behavior', () => {
  let networkIdleObservable: NetworkIdleObservable;
  let unsubscribe: () => void;
  let subscriber: jest.Mock;

  beforeEach(() => {
    // disable cleanup timeout to avoid side-effects in tests
    CONFIG.NETWORK_TIMEOUT = 0;
    networkIdleObservable = new NetworkIdleObservable();
    subscriber = jest.fn();
    unsubscribe = networkIdleObservable.subscribe(subscriber);

    // trigger initialization of MutationObserver and event listeners
    window.dispatchEvent(new Event('load'));
  });

  afterEach(() => {
    unsubscribe();
  });

  it.each([
    'canonical',
    'preconnect',
    'dns-prefetch',
    'preload',
    'modulepreload',
    'prefetch',
    'prerender',
  ])('ignores <link rel="%s"> when tracking network idleness', async (rel) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = '/ignored-resource.css';
    document.head.appendChild(link);

    // allow MutationObserver to process the DOM change
    await wait(0);

    expect(networkIdleObservable.isIdle()).toBe(true);
    expect(subscriber).toHaveBeenCalledTimes(0);
  });

  it('tracks non-ignored <link rel="stylesheet"> as a pending resource', async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles.css';
    document.head.appendChild(link);

    // allow MutationObserver to process the DOM change
    await wait(0);

    // should report busy
    expect(networkIdleObservable.isIdle()).toBe(false);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenLastCalledWith('BUSY');

    // simulate the resource finishing
    const loadEvent = new Event('load', {bubbles: true});
    Object.defineProperty(loadEvent, 'target', {value: link});
    document.dispatchEvent(loadEvent);

    // allow event listener to run
    await wait(0);

    expect(networkIdleObservable.isIdle()).toBe(true);
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith('IDLE');
  });
});


