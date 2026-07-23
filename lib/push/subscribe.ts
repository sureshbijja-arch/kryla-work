/**
 * lib/push/subscribe.ts — client-side Web Push subscribe/unsubscribe helpers.
 * Called from MyKryla's "Turn on phone alerts" control. Serwist auto-registers
 * the service worker (app/sw.ts) — this only waits for it to be ready, then
 * talks to the browser's Push API and this app's own subscribe endpoint.
 */

'use client'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0))).buffer as ArrayBuffer
}

export type PushSupportStatus = 'unsupported' | 'denied' | 'granted' | 'default'

/** Whether this browser/context can support Web Push at all. */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

/** Current permission state, without prompting. */
export function getPushPermission(): PushSupportStatus {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission as PushSupportStatus
}

/**
 * Whether this device has a real, active push subscription — not just OS
 * notification permission. Permission can be 'granted' while no subscription
 * was ever created or saved (e.g. the save-to-server call failed after the
 * permission prompt), so "alerts are on" must be judged by this, not by
 * getPushPermission() alone.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

/**
 * Whether the app is running installed (standalone) — the iOS prerequisite
 * for push. On Android/desktop this is informational only (push works in a
 * regular browser tab too).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

/**
 * Request notification permission, subscribe via the Push API, and save the
 * subscription against this provider. Throws with a user-facing message on
 * failure — the caller (a settings control) is expected to show it, unlike
 * the server-side senders which stay silent/best-effort.
 */
export async function subscribeToPush(providerId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push notifications aren’t supported on this browser.')
  }

  const vapidRes = await fetch('/api/push/vapid-key')
  if (!vapidRes.ok) throw new Error('Could not load push configuration.')
  const { publicKey } = await vapidRes.json() as { publicKey: string }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, subscription: subscription.toJSON() }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[push] Failed to save subscription:', res.status, body)
    throw new Error('Could not save your subscription — please try again.')
  }
}

/** Unsubscribe this device and remove its saved subscription. */
export async function unsubscribeFromPush(providerId: string): Promise<void> {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription  = await registration.pushManager.getSubscription()
  if (!subscription) return

  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
