'use client'

import { useEffect } from 'react'

/**
 * Registers the Serwist-built service worker (public/sw.js) at root scope.
 *
 * @serwist/next only builds the worker file — it does not register it in the
 * browser. The package also ships a <SerwistProvider> React helper for this,
 * but its compiled output depends on react/compiler-runtime (React 19+),
 * which doesn't exist on this project's React 18 — registering directly via
 * the standard Service Worker API avoids that incompatibility entirely and
 * has no dependency on Serwist's client package.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    // Serwist/webpack bundles app/sw.ts into a single IIFE, not an ES module
    // (no top-level import/export in the compiled public/sw.js) — registering
    // it with { type: 'module' } is wrong and can leave the worker stuck
    // pre-activation on some WebKit/iOS versions instead of erroring loudly,
    // which is what caused serviceWorker.ready to hang indefinitely.
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[sw] Registered, scope:', reg.scope))
      .catch(err => console.error('[sw] Registration failed:', err))
  }, [])

  return null
}
