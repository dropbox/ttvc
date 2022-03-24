import userEvent from '@testing-library/user-event';

import {VisuallyCompleteCalculator} from '../../src/visually_complete_calculator';
import {
  InViewportMutationObserver,
  MutationReason,
  Mutation,
  ElementWrapperFactory,
} from '../../src/in_viewport_mutation_observer';
import {AnnotationsType} from '../../src/annotations';

describe('VisuallyCompleteCalculator', function () {
  let MockObserver: typeof InViewportMutationObserver;
  let mockObserverFns: {
    observe: jest.MockedFunction<() => {}>;
    disconnect: jest.MockedFunction<() => {}>;
    waitForLoadingImages: jest.MockedFunction<() => {}>;
    callback?: (mutation: Mutation) => void;
  };
  let testMutation: Mutation;
  let calculator: VisuallyCompleteCalculator;
  let annotations: AnnotationsType;

  beforeEach(() => {
    testMutation = new Mutation(
      ElementWrapperFactory.makeElementWrapper(document.body),
      MutationReason.DOM_NODE_ADDED
    );
    mockObserverFns = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      waitForLoadingImages: jest.fn(),
    };
    annotations = new Map();

    MockObserver = jest.fn(function InViewportMutationObserver(this: any, params) {
      /* tslint:disable:no-invalid-this */
      this.observe = mockObserverFns.observe;
      this.disconnect = mockObserverFns.disconnect;
      this.waitForLoadingImages = mockObserverFns.waitForLoadingImages;
      mockObserverFns.callback = params.callback;

      return this;
      /* tslint:enable:no-invalid-this */
    });
    calculator = new VisuallyCompleteCalculator({
      addAnnotation: (name, value) => {
        annotations.set(name, value);
      },
      target: document.body,
      calculationStartTimestamp: 0,
      InViewportMutationObserverClass: MockObserver,
    });
  });

  it('gracefully handles an unsupported environment', () => {
    const runTest = () => {
      expect(() => {
        const calculator = new VisuallyCompleteCalculator({target: document.body});
        calculator.start();
        calculator.attemptMeasurement();
      }).not.toThrow();
    };
    const tempMutationObserver = window.MutationObserver;
    // @ts-ignore
    delete window.MutationObserver;
    runTest();
    // tslint:disable-next-line:no-window-assignment
    window.MutationObserver = tempMutationObserver;

    const tempIntersectionObserver = window.IntersectionObserver;
    // @ts-ignore
    delete window.IntersectionObserver;
    runTest();
    // tslint:disable-next-line:no-window-assignment
    window.IntersectionObserver = tempIntersectionObserver;

    const tempQuerySelectorAll = document.querySelectorAll;
    // @ts-ignore
    delete document.querySelectorAll;
    runTest();
    document.querySelectorAll = tempQuerySelectorAll;

    const tempPerformanceTiming = performance.timing;
    // @ts-ignore
    delete performance.timing;
    runTest();
    // @ts-ignore
    performance.timing = tempPerformanceTiming;
  });

  it('observes mutation observer upon calling start', () => {
    calculator.start();
    expect(mockObserverFns.observe).toHaveBeenCalled();
  });

  describe('VisuallyCompleteCalculator.attemptMeasurement', () => {
    it('throws when calling attemptMeasurement before initialize', async () => {
      const fn = async () => {
        await calculator.attemptMeasurement();
      };
      await expect(fn()).rejects.toThrowError();
    });

    it('disconnects mutation observer when calling attempt measurement', async () => {
      calculator.start();
      await calculator.attemptMeasurement();
      expect(mockObserverFns.disconnect).toHaveBeenCalled();
    });

    it('uses timestamp of mutation when only one mutation prior to attempting measurement', async () => {
      calculator.start();
      mockObserverFns.callback!(testMutation);
      const measurement = await calculator.attemptMeasurement();
      expect(measurement).toEqual(testMutation.timestamp);
    });

    it('returns null when not in a supported environment', async () => {
      const tempSupportedEnvironment = VisuallyCompleteCalculator.isSupportedEnvironment;
      VisuallyCompleteCalculator.isSupportedEnvironment = () => false;
      const calculator = new VisuallyCompleteCalculator({
        target: document.body,
        calculationStartTimestamp: 0,
        InViewportMutationObserverClass: MockObserver,
      });
      calculator.start();
      mockObserverFns.callback!(testMutation);
      const vc = await calculator.attemptMeasurement();
      expect(vc).toBeNull();
      VisuallyCompleteCalculator.isSupportedEnvironment = tempSupportedEnvironment;
    });

    it('returns delta of calculationStartTimestamp and timestamp', async () => {
      const calculationStartTimestamp = Date.now();
      const calculator = new VisuallyCompleteCalculator({
        target: document.body,
        calculationStartTimestamp,
        InViewportMutationObserverClass: MockObserver,
      });
      calculator.start();
      mockObserverFns.callback!(testMutation);
      const measurement = await calculator.attemptMeasurement();
      expect(measurement).toEqual(testMutation.timestamp - calculationStartTimestamp);
    });
    it('returns null when there have been no mutations', async () => {
      const calculationStartTimestamp = Date.now();
      const calculator = new VisuallyCompleteCalculator({
        target: document.body,
        calculationStartTimestamp,
        InViewportMutationObserverClass: MockObserver,
      });
      calculator.start();
      const measurement = await calculator.attemptMeasurement();
      expect(measurement).toEqual(null);
    });
    it('returns null when an user has interacted with page', async () => {
      calculator.start();
      userEvent.click(document.body);
      mockObserverFns.callback!(testMutation);
      mockObserverFns.callback!(
        new Mutation(
          ElementWrapperFactory.makeElementWrapper(document.body),
          MutationReason.STYLE_ATTRIBUTE_MODIFIED
        )
      );
      const measurement = await calculator.attemptMeasurement();
      expect(measurement).toEqual(null);
    });
    it('returns last mutation timestamp regardless of order', async () => {
      calculator.start();
      mockObserverFns.callback!(testMutation);
      mockObserverFns.callback!(
        new Mutation(
          ElementWrapperFactory.makeElementWrapper(document.body),
          MutationReason.DOM_NODE_ADDED
        )
      );
      mockObserverFns.callback!(
        new Mutation(
          ElementWrapperFactory.makeElementWrapper(document.body),
          MutationReason.DOM_NODE_ADDED
        )
      );
      testMutation.timestamp = Date.now();

      const vc = await calculator.attemptMeasurement();
      expect(vc).toEqual(testMutation.timestamp);
    });
  });
});
