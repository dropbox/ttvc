import {
  InViewportMutationObserver,
  MutationReason,
  InViewportMutationObserverCallback,
  HTMLAttribute,
} from '../../src/in_viewport_mutation_observer';

const emptyNodeList = document.querySelectorAll('not-in-dom');

describe('InViewportMutationObserver', () => {
  let mutationObserverMock: typeof MutationObserver;
  let mockIntersectionObserverMock: typeof IntersectionObserver;
  let mockMutationObserverFns: {
    observe: jest.MockedFunction<() => {}>;
    disconnect: jest.MockedFunction<() => {}>;
    callback?: (mutationRecords: MutationRecord[]) => void;
  };
  let mockIntersectionObserverFns: {
    observe: jest.MockedFunction<() => {}>;
    disconnect: jest.MockedFunction<() => {}>;
    unobserve: jest.MockedFunction<() => {}>;
    callback?: (entries: IntersectionObserverEntry[]) => void;
  };
  beforeEach(() => {
    mockMutationObserverFns = {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIntersectionObserverFns = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    };
    mutationObserverMock = jest.fn(function MutationObserver(this: any, callback) {
      /* tslint:disable:no-invalid-this */
      this.observe = mockMutationObserverFns.observe;
      this.disconnect = mockMutationObserverFns.disconnect;
      mockMutationObserverFns.callback = (mutationRecords: MutationRecord[]) => {
        callback(mutationRecords, this);
      };
      return this;
      /* tslint:enable:no-invalid-this */
    });
    mockIntersectionObserverMock = jest.fn(function IntersectionObserver(this: any, callback) {
      /* tslint:disable:no-invalid-this */
      this.observe = mockIntersectionObserverFns.observe;
      this.disconnect = mockIntersectionObserverFns.disconnect;
      this.unobserve = mockIntersectionObserverFns.unobserve;
      mockIntersectionObserverFns.callback = (entries: IntersectionObserverEntry[]) => {
        callback(entries, this);
      };
      return this;
      /* tslint:enable:no-invalid-this */
    });
  });

  it('observes MutationObserver on observe', () => {
    const observer = new InViewportMutationObserver({
      callback: () => {},
      addAnnotation: () => {},
      MutationObserverClass: mutationObserverMock,
      IntersectionObserverClass: mockIntersectionObserverMock,
    });
    observer.observe(document.body);
    expect(mockMutationObserverFns.observe).toHaveBeenCalled();
  });
  it('disconnects from MutationObserver and IntersectionObserver on disconnect', () => {
    const observer = new InViewportMutationObserver({
      callback: () => {},
      addAnnotation: () => {},
      MutationObserverClass: mutationObserverMock,
      IntersectionObserverClass: mockIntersectionObserverMock,
    });
    observer.observe(document.body);
    observer.disconnect();
    expect(mockMutationObserverFns.disconnect).toHaveBeenCalled();
    expect(mockIntersectionObserverFns.disconnect).toHaveBeenCalled();
  });
  it('adds annotations on disconnect', () => {
    const addAnnotation = jest.fn();
    const observer = new InViewportMutationObserver({
      callback: () => {},
      addAnnotation,
      MutationObserverClass: mutationObserverMock,
      IntersectionObserverClass: mockIntersectionObserverMock,
    });
    observer.observe(document.body);

    observer.disconnect();
    expect(addAnnotation).toHaveBeenCalled();
  });

  describe('InViewportMutationObserverCallback', () => {
    let observer: InViewportMutationObserver;
    let observerCallback: jest.MockedFunction<InViewportMutationObserverCallback>;
    let mutationRecord: MutationRecord;
    let intersectionObserverEntry: IntersectionObserverEntry;

    beforeEach(() => {
      observerCallback = jest.fn();
      observer = new InViewportMutationObserver({
        callback: observerCallback,
        addAnnotation: () => {},
        MutationObserverClass: mutationObserverMock,
        IntersectionObserverClass: mockIntersectionObserverMock,
      });
      mutationRecord = {
        oldValue: null,
        nextSibling: null,
        previousSibling: null,
        attributeNamespace: null,
        attributeName: null,
        type: 'childList',
        removedNodes: emptyNodeList,
        target: document.body,
        addedNodes: emptyNodeList,
      };
      intersectionObserverEntry = {
        boundingClientRect: {
          bottom: 0,
          top: 0,
          left: 0,
          right: 0,
          height: 1000,
          width: 1000,
          x: 0,
          y: 0,
          toJSON: () => '',
        },
        intersectionRatio: 1,
        intersectionRect: {
          bottom: 0,
          top: 0,
          left: 0,
          right: 0,
          height: 1000,
          width: 1000,
          x: 0,
          y: 0,
          toJSON: () => '',
        },
        isIntersecting: true,
        rootBounds: null,
        target: document.body,
        time: 1000,
      };
    });

    const testSuccessfulObserverCallback = (
      target: HTMLElement,
      mutationRecord: MutationRecord,
      intersectionObserverEntry: IntersectionObserverEntry,
      mutationReason: MutationReason
    ) => {
      observer.observe(target);
      mockMutationObserverFns.callback!([mutationRecord]);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledWith(target);
      mockIntersectionObserverFns.callback!([intersectionObserverEntry]);
      expect(mockIntersectionObserverFns.unobserve).toHaveBeenCalledWith(target);
      expect(observerCallback).toHaveBeenCalled();
      const mutation = observerCallback.mock.calls[0][0];
      expect(mutation.reason).toEqual(mutationReason);
    };

    it('observes added nodes', () => {
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      frag.appendChild(div);
      testSuccessfulObserverCallback(
        div,
        {
          ...mutationRecord,
          addedNodes: frag.querySelectorAll('div'),
        },
        {
          ...intersectionObserverEntry,
          target: div,
        },
        MutationReason.DOM_NODE_ADDED
      );
    });

    it('observes nodes with hidden attribute change', () => {
      const div = document.createElement('div');

      testSuccessfulObserverCallback(
        div,
        {
          ...mutationRecord,
          target: div,
          attributeName: 'hidden',
          type: 'attributes',
        },
        {
          ...intersectionObserverEntry,
          target: div,
        },
        MutationReason.HIDDEN_ATTRIBUTE_MODIFIED
      );
    });

    it('observes nodes with appropriate style attribute change', () => {
      const div = document.createElement('div');
      mutationRecord = {
        ...mutationRecord,
        target: div,
        attributeName: 'style',
        type: 'attributes',
      };
      const hiddenStyleValues = [
        'display: none',
        'visibility: hidden',
        'content-visibility: hidden',
      ];
      hiddenStyleValues.forEach((styleValue) => {
        testSuccessfulObserverCallback(
          div,
          {
            ...mutationRecord,
            oldValue: styleValue,
          },
          {
            ...intersectionObserverEntry,
            target: div,
          },
          MutationReason.STYLE_ATTRIBUTE_MODIFIED
        );
      });
    });

    it('observes mutation modifying image attributes', () => {
      const img = document.createElement('img');

      testSuccessfulObserverCallback(
        img,
        {
          ...mutationRecord,
          target: img,
          attributeName: 'src',
          type: 'attributes',
        },
        {
          ...intersectionObserverEntry,
          target: img,
        },
        MutationReason.IMAGE_ATTRIBUTE_MODIFIED
      );
    });

    it('does not invoke observer callback when element is not intersecting', () => {
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      frag.appendChild(div);
      observer.observe(div);
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          addedNodes: frag.querySelectorAll('div'),
        },
      ]);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledWith(div);
      mockIntersectionObserverFns.callback!([
        {
          ...intersectionObserverEntry,
          target: div,
          isIntersecting: false,
        },
      ]);
      expect(mockIntersectionObserverFns.unobserve).not.toHaveBeenCalled();
      expect(observerCallback).not.toHaveBeenCalled();
    });

    it('does not invoke observer callback when element was not observed by mutation observer', () => {
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      frag.appendChild(div);
      observer.observe(div);
      mockIntersectionObserverFns.callback!([
        {
          ...intersectionObserverEntry,
          target: div,
        },
      ]);
      expect(mockIntersectionObserverFns.unobserve).toHaveBeenCalled();
      expect(observerCallback).not.toHaveBeenCalled();
    });

    it('does not observe intersection for DOM node that uses the ignore attribute', () => {
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      frag.appendChild(div);
      div.setAttribute(HTMLAttribute.ATTRIBUTE_NAME, HTMLAttribute.IGNORE_VALUE);
      observer.observe(div);
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          addedNodes: frag.querySelectorAll('div'),
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe intersection for added DOM node that uses the ignore attribute', () => {
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      frag.appendChild(div);
      div.setAttribute(HTMLAttribute.ATTRIBUTE_NAME, HTMLAttribute.IGNORE_VALUE);
      observer.observe(div);
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          addedNodes: frag.querySelectorAll('div'),
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe intersection for "hidden" attribute removal on DOM node that uses the ignore attribute', () => {
      const div = document.createElement('div');
      div.setAttribute(HTMLAttribute.ATTRIBUTE_NAME, HTMLAttribute.IGNORE_VALUE);
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          target: div,
          attributeName: 'hidden',
          type: 'attributes',
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe intersection for non-visibility related attribute change', () => {
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          attributeName: 'foobar',
          type: 'attributes',
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe intersection for "hidden" attribute when hidden attribute is changed in mutation but still on element', () => {
      const div = document.createElement('div');
      div.setAttribute('hidden', 'true');
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          target: div,
          attributeName: 'hidden',
          type: 'attributes',
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe intersection for non-visibility-related "style" change', () => {
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          attributeName: 'style',
          oldValue: 'color: red',
          type: 'attributes',
        },
      ]);
      expect(mockIntersectionObserverFns.observe).not.toHaveBeenCalled();
    });

    it('does not observe images in children of added nodes that are ignorable', () => {
      const img = document.createElement('img');
      const img2 = document.createElement('img');
      const img3 = document.createElement('img');
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      img.setAttribute(HTMLAttribute.ATTRIBUTE_NAME, HTMLAttribute.IGNORE_VALUE);
      img2.setAttribute('style', 'display: none');
      img3.setAttribute('hidden', 'true');
      div.appendChild(img);
      div.appendChild(img2);
      div.appendChild(img3);
      frag.appendChild(div);

      mutationRecord = {
        ...mutationRecord,
        type: 'childList',
        addedNodes: frag.querySelectorAll('div'),
      };

      observer.observe(div);
      mockMutationObserverFns.callback!([mutationRecord]);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledTimes(1);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledWith(div);
    });

    it('does not observe images in children of added nodes if root is ignorable', () => {
      const img = document.createElement('img');
      const img2 = document.createElement('img');
      const img3 = document.createElement('img');
      const grandparent = document.createElement('div');
      const parent = document.createElement('section');
      const frag = document.createDocumentFragment();
      parent.setAttribute(HTMLAttribute.ATTRIBUTE_NAME, HTMLAttribute.IGNORE_VALUE);
      parent.appendChild(img);
      parent.appendChild(img2);
      parent.appendChild(img3);
      grandparent.appendChild(parent);
      frag.appendChild(grandparent);

      mutationRecord = {
        ...mutationRecord,
        type: 'childList',
        addedNodes: frag.querySelectorAll('div'),
      };

      observer.observe(grandparent);
      mockMutationObserverFns.callback!([mutationRecord]);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledTimes(1);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledWith(grandparent);
    });

    it('does not observe non-images children of added nodes', () => {
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const span3 = document.createElement('span');
      const div = document.createElement('div');
      const frag = document.createDocumentFragment();
      div.appendChild(span);
      div.appendChild(span2);
      div.appendChild(span3);
      frag.appendChild(div);

      mutationRecord = {
        ...mutationRecord,
        type: 'childList',
        addedNodes: frag.querySelectorAll('div'),
      };

      observer.observe(div);
      mockMutationObserverFns.callback!([mutationRecord]);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledTimes(1);
      expect(mockIntersectionObserverFns.observe).toHaveBeenCalledWith(div);
    });

    it('invokes callback for mutation without intersection observation when document is hidden', () => {
      const div = document.createElement('div');
      observer.observe(div);
      observer.isDocumentHidden = () => true;
      mockMutationObserverFns.callback!([
        {
          ...mutationRecord,
          target: div,
          attributeName: 'hidden',
          type: 'attributes',
        },
      ]);

      expect(observerCallback).toHaveBeenCalled();
    });
  });
});
