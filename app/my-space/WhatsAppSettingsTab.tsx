'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WaConnection {
  phone_number_id: string
  display_phone_number: string | null
}

interface Props {
  providerId: string
  plan: string
  onBack?: () => void
}

const DAILY_LIMIT = 250

export default function WhatsAppSettingsTab({ providerId, plan, onBack }: Props) {
  const [connection, setConnection]   = useState<WaConnection | null | undefined>(undefined)
  const [waPublic, setWaPublic]       = useState(true)
  const [dailyCount, setDailyCount]   = useState(0)

  const [showForm, setShowForm]               = useState(false)
  const [phoneNumberId, setPhoneNumberId]     = useState('')
  const [accessToken, setAccessToken]         = useState('')
  const [displayPhone, setDisplayPhone]       = useState('')
  const [connecting, setConnecting]           = useState(false)
  const [connectError, setConnectError]       = useState('')

  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [disconnecting, setDisconnecting]         = useState(false)

  const [togglingVisibility, setTogglingVisibility] = useState(false)

  const supabase    = createClient()
  const isSproutPlus = plan !== 'seed'

  useEffect(() => {
    supabase
      .from('whatsapp_connections')
      .select('phone_number_id, display_phone_number')
      .eq('provider_id', providerId)
      .maybeSingle()
      .then(({ data }) => setConnection(data ?? null))

    supabase
      .from('providers')
      .select('whatsapp_public')
      .eq('id', providerId)
      .single()
      .then(({ data }) => { if (data) setWaPublic(data.whatsapp_public !== false) })

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('whatsapp_messages')
      .select('customer_phone')
      .eq('provider_id', providerId)
      .gte('msg_timestamp', since)
      .then(({ data }) => {
        if (data) setDailyCount(new Set(data.map(m => m.customer_phone)).size)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  async function handleConnect() {
    if (!phoneNumberId.trim() || !accessToken.trim() || connecting) return
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/my-space/whatsapp-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          phoneNumberId: phoneNumberId.trim(),
          accessToken:   accessToken.trim(),
          displayPhoneNumber: displayPhone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setConnectError(data.error ?? 'Failed to connect'); return }
      setConnection({ phone_number_id: phoneNumberId.trim(), display_phone_number: displayPhone.trim() || null })
      setShowForm(false)
      setPhoneNumberId('')
      setAccessToken('')
      setDisplayPhone('')
    } catch {
      setConnectError('Something went wrong — try again.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/my-space/whatsapp-connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      if (res.ok) { setConnection(null); setConfirmDisconnect(false) }
    } catch {
      // silent
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleToggleVisibility() {
    setTogglingVisibility(true)
    const next = !waPublic
    try {
      const res = await fetch('/api/my-space/whatsapp-connect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, whatsappPublic: next }),
      })
      if (res.ok) setWaPublic(next)
    } catch {
      // silent
    } finally {
      setTogglingVisibility(false)
    }
  }

  if (connection === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  const usagePct      = Math.min(100, Math.round((dailyCount / DAILY_LIMIT) * 100))
  const showNudge     = !!connection && usagePct >= 80

  return (
    <div className="flex-1 overflow-y-auto">
      {onBack && (
        <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-2 shrink-0">
          <button onClick={onBack} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="text-sm font-semibold text-[#0D0D0D]">WhatsApp Settings</p>
        </div>
      )}

      <div className="px-4 py-5 space-y-6">

        {/* ── Business API connection ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Business API</p>

          {connection ? (
            <div className="rounded-xl border border-[#E5E5E5] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0D0D0D]">Connected</p>
                    <p className="text-xs text-[#666] mt-0.5">
                      {connection.display_phone_number ?? connection.phone_number_id}
                    </p>
                  </div>
                </div>
                {!confirmDisconnect ? (
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="shrink-0 text-xs text-[#999] hover:text-red-500 transition-colors font-medium">
                    Disconnect
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-2">
                    <button onClick={() => setConfirmDisconnect(false)} className="text-xs text-[#999] hover:text-[#0D0D0D]">
                      Cancel
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50">
                      {disconnecting ? 'Removing…' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E5E5] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" fill="#25D366"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.529 5.849L.057 23.286a.75.75 0 00.914.914l5.504-1.455A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.98 0-3.824-.578-5.378-1.572l-.378-.237-3.925 1.038 1.055-3.851-.249-.393A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0D0D0D]">Using personal WhatsApp</p>
                  <p className="text-xs text-[#666] mt-0.5">wa.me link shown on your public page</p>
                </div>
              </div>

              {!isSproutPlus ? (
                <p className="text-xs text-[#999]">Upgrade to Sprout to connect a Business API account.</p>
              ) : !showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-lg px-3 py-2 hover:bg-[#F5F5F5] transition-colors">
                  + Connect Business API
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={phoneNumberId}
                    onChange={e => setPhoneNumberId(e.target.value)}
                    placeholder="Phone Number ID"
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                  />
                  <input
                    type="password"
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder="Access Token"
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors font-mono"
                  />
                  <input
                    value={displayPhone}
                    onChange={e => setDisplayPhone(e.target.value)}
                    placeholder="Display number e.g. +91 98765 43210 (optional)"
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                  />
                  {connectError && <p className="text-red-500 text-xs">{connectError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConnect}
                      disabled={connecting || !phoneNumberId.trim() || !accessToken.trim()}
                      className="flex-1 bg-[#0D0D0D] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
                      {connecting ? 'Verifying & saving…' : 'Save connection'}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setConnectError('') }}
                      className="text-sm text-[#999] px-3 hover:text-[#0D0D0D] transition-colors">
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-[#bbb] leading-relaxed pt-1">
                    Find these in Meta Developer Console → Your App → WhatsApp → API Setup.
                    Use a system user token for long-lived access.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Visibility toggle ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Visibility</p>
          <div className="rounded-xl border border-[#E5E5E5] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">Show on my page</p>
              <p className="text-xs text-[#666] mt-0.5">
                {waPublic
                  ? 'WhatsApp button is visible to customers'
                  : 'WhatsApp button is hidden from your page'}
              </p>
            </div>
            <button
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              className={`shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:opacity-50 ${waPublic ? 'bg-[#25D366]' : 'bg-[#E5E5E5]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${waPublic ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        {/* ── Usage meter (connected only) ── */}
        {connection && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Today's usage</p>
            <div className="rounded-xl border border-[#E5E5E5] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#0D0D0D]">
                  {dailyCount} / {DAILY_LIMIT} conversations
                </p>
                <span className="text-xs text-[#999]">{usagePct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePct >= 80 ? 'bg-[#F5A623]' : 'bg-[#25D366]'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {showNudge && (
                <div className="mt-3 flex items-start gap-2 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-lg px-3 py-2.5">
                  <span className="text-sm shrink-0">⚠️</span>
                  <div>
                    <p className="text-xs font-semibold text-[#0D0D0D]">Approaching daily limit</p>
                    <p className="text-xs text-[#666] mt-0.5 leading-relaxed">
                      Verify your Meta Business account to unlock 1,000 conversations/day.
                    </p>
                    <a
                      href="https://business.facebook.com/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#EA8C00] hover:underline mt-1 inline-block">
                      Open Meta Business Settings →
                    </a>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[#bbb] mt-2">
                Resets daily at midnight UTC. Limit is 250 for unverified accounts.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
