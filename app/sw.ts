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
        request.destination === 'document' &&
        !url.pathname.startsWith('/mychat') &&
        !url.pathname.startsWith('/mykryla'),
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

// ── Web Push — member enquiry/booking alerts ────────────────────────────────
// Payload shape sent by lib/push/send.ts: { title, body, url }.
// `url` deep-links into the specific enquiry (e.g. /mychat?src=pwa&bookingId=...)
// so tapping the notification lands the member on that booking, where the
// existing "Follow up on WhatsApp" button (BookingsTab.tsx) is one tap away.

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return
  const payload = event.data.json() as { title: string; body: string; url: string }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-mychat-192.png',
      badge: '/icons/icon-mychat-192.png',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? '/mychat'

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = clientsList.find(c => c.url.includes('/mychat'))
    if (existing) {
      await existing.focus()
      existing.postMessage({ type: 'push-notification-click', url: targetUrl })
      return
    }
    await self.clients.openWindow(targetUrl)
  })())
})
