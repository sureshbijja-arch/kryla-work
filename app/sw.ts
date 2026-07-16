import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, StaleWhileRevalidate, Serwist } from 'serwist'

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // API routes: always network-first, short cache
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
      }),
    },
    // Customer public pages: stale-while-revalidate (works offline)
    {
      matcher: ({ request, url }) =>
        request.destination === 'document' && !url.pathname.startsWith('/mychat'),
      handler: new StaleWhileRevalidate({
        cacheName: 'pages-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 3600 })],
      }),
    },
    // Default: precached assets + images
    ...defaultCache,
  ],
})

serwist.addEventListeners()
