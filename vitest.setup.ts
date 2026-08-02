import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver — polyfill with a no-op so components that
// observe element size (e.g. SmartImg's `fit="auto"` mode) don't crash in tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no layout engine, so Element.scrollIntoView is unimplemented —
// polyfill with a no-op so components that scroll a target into view (e.g.
// IdolSelectionContext.scrollToPdp) don't crash in tests. Individual tests
// can still override it per-element with a spy to assert it was called.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
