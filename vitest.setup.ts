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
