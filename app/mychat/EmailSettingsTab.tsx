'use client'

/**
 * EmailSettingsTab — shows the advocate their @kryla.work email address,
 * an enable/disable toggle, and setup instructions.
 *
 * Mirrors the shape of WhatsAppSettingsTab.tsx.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
  slug: string
  onBack?: () => void
}

export default function EmailSettingsTab({ providerId, slug, onBack }: Props) {
  const [address, setAddress]   = useState<string | null>(null)
  const [enabled, setEnabled]   = useState(true)
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied]     = useState(false)
  const supabase = createClient()

  // Derive the expected @kryla.work address from the slug
  const expectedAddress = `${slug}@kryla.work`

  useEffect(() => {
    supabase
      .from('provider_email')
      .select('address, enabled')
      .eq('provider_id', providerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAddress(data.address as string)
          setEnabled(data.enabled as boolean)
        }
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  async function handleToggle() {
    setToggling(true)
    const next = !enabled
    try {
      const res = await fetch('/api/mychat/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, enabled: next }),
      })
      if (res.ok) {
        setEnabled(next)
        // Optimistically set the address if it was just created
        if (!address) setAddress(expectedAddress)
      }
    } catch {
      // silent
    } finally {
      setToggling(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address ?? expectedAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // silent
    }
  }

  if (loading) {
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

  const displayAddress = address ?? expectedAddress
  const isActive = !!address && enabled

  return (
    <div className="flex-1 overflow-y-auto">
      {onBack && (
        <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-2 shrink-0">
          <button onClick={onBack} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="text-sm font-semibold text-[#0D0D0D]">Email Settings</p>
        </div>
      )}

      <div className="px-4 py-5 space-y-6">

        {/* ── Your email address ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Your inbox address</p>
          <div className="rounded-xl border border-[#E5E5E5] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-[#F0FDF4]' : 'bg-[#F5F5F5]'}`}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M1 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4z"
                      stroke={isActive ? '#22C55E' : '#999'}
                      strokeWidth="1.3"
                    />
                    <path
                      d="M1 5l7 4.5L15 5"
                      stroke={isActive ? '#22C55E' : '#999'}
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0D0D0D] truncate">{displayAddress}</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    {isActive ? 'Active — customers can email you here' : 'Inactive — enable below to activate'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                title="Copy address"
                className="shrink-0 text-xs font-semibold text-[#999] hover:text-[#0D0D0D] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5] transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="text-[11px] text-[#bbb] leading-relaxed bg-[#FAFAFA] rounded-lg px-3 py-2.5">
              Share this address with clients so their emails appear here. Replies you send
              will come <em>from</em> this address, so clients can hit Reply in their mail app.
            </div>
          </div>
        </section>

        {/* ── Enable / disable toggle ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">Inbox</p>
          <div className="rounded-xl border border-[#E5E5E5] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">Email inbox</p>
              <p className="text-xs text-[#666] mt-0.5">
                {isActive
                  ? 'Incoming emails are delivered to this tab'
                  : 'Enable to start receiving client emails'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:opacity-50 ${enabled && !!address ? 'bg-[#0D0D0D]' : 'bg-[#E5E5E5]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled && !!address ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        {/* ── DNS / setup note ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-3">How it works</p>
          <div className="rounded-xl border border-[#E5E5E5] p-4 space-y-3 text-xs text-[#666] leading-relaxed">
            <p>Emails sent to <strong className="text-[#0D0D0D]">{displayAddress}</strong> arrive here in real time.</p>
            <p>When you reply, your message is sent from that same address so clients can reply directly from their own mail app and the thread stays in one place.</p>
            <p className="text-[#bbb]">This address is separate from your personal email — only messages from clients will appear here.</p>
          </div>
        </section>

      </div>
    </div>
  )
}
