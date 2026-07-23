'use client'

import { useEffect, useState } from 'react'
import {
  isPushSupported, isStandalone, getPushPermission, hasActiveSubscription,
  subscribeToPush, unsubscribeFromPush, type PushSupportStatus,
} from '@/lib/push/subscribe'

/**
 * "Turn on phone alerts" control for the Enquiries/Consultations screen.
 * Handles the one-time install + permission flow for Web Push. On iOS the
 * member must "Add to Home Screen" first — Web Push doesn't exist in Safari
 * tabs — so this surfaces that instruction instead of a broken permission
 * prompt. Onboarding copy (member-facing, authored outside this component)
 * points here.
 */
export default function PushAlertsCard({ providerId }: { providerId: string }) {
  // "On" must reflect a real, saved push subscription — Notification
  // permission alone can read 'granted' even when the subscribe call or the
  // save-to-server request failed after the permission prompt, which
  // previously showed "Phone alerts are on" with nothing actually saved.
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<PushSupportStatus>('default')
  const [standalone, setStandalone] = useState(true)
  const [isIOS, setIsIOS]     = useState(false)
  const [busy, setBusy]       = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setPermission(getPushPermission())
    setStandalone(isStandalone())
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))
    hasActiveSubscription()
      .then(setSubscribed)
      .finally(() => setChecking(false))
  }, [])

  async function handleEnable() {
    setBusy(true)
    setError('')
    try {
      await subscribeToPush(providerId)
      // Re-derive from the real subscription rather than assuming success —
      // catches the case where subscribeToPush resolves but the device still
      // has no active subscription for some reason.
      const active = await hasActiveSubscription()
      setSubscribed(active)
      setPermission(getPushPermission())
      if (!active) setError('Alerts did not turn on — please try again.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn on alerts')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await unsubscribeFromPush(providerId)
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }

  if (checking) return null

  if (!isPushSupported()) return null

  // iOS requires the home-screen install before push works at all.
  if (isIOS && !standalone) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-[#FBF3E9] border border-[#F0DFC8] px-4 py-3.5 mb-4">
        <span className="text-xl shrink-0">📲</span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#0D0D0D]">Add MyKryla to your Home Screen for phone alerts</p>
          <p className="text-xs text-[#888] mt-0.5">
            In Safari, tap Share → Add to Home Screen. Open MyKryla from there to turn on alerts.
          </p>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-[#FEF2F2] border border-[#FCD9D9] px-4 py-3.5 mb-4">
        <span className="text-xl shrink-0">🔕</span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#0D0D0D]">Phone alerts are blocked</p>
          <p className="text-xs text-[#888] mt-0.5">
            Enable notifications for MyKryla in your browser/phone settings, then reopen this screen.
          </p>
        </div>
      </div>
    )
  }

  if (subscribed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F0FDF4] border border-[#D4F4DD] px-4 py-3.5 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🔔</span>
          <p className="font-bold text-sm text-[#0D0D0D]">Phone alerts are on</p>
        </div>
        <button
          onClick={handleDisable}
          disabled={busy}
          className="shrink-0 text-xs font-semibold text-[#999] hover:text-[#0D0D0D] transition-colors disabled:opacity-50"
        >
          Turn off
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-mc-accent/40 px-4 py-3.5 mb-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl shrink-0">🔔</span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#0D0D0D]">Get enquiries the instant they arrive</p>
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
      </div>
      <button
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 text-xs font-semibold text-white bg-mc-accent rounded-lg px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {busy ? 'Turning on…' : 'Turn on phone alerts'}
      </button>
    </div>
  )
}
