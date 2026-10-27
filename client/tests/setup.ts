import '@testing-library/jest-dom';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;

  Element.prototype.scrollIntoView = function scrollIntoView() {};
  Element.prototype.hasPointerCapture = function hasPointerCapture() {
    return false;
  };
  Element.prototype.releasePointerCapture = function releasePointerCapture() {};

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
