'use client'

import { useState, useEffect } from 'react'

interface NotificationRow {
  id:         string
  type:       string
  channel:    string
  recipient:  string
  status:     'sent' | 'failed'
  sent_at:    string
  provider:   { first_name: string; last_name: string } | null
  student:    { name: string } | null
}

interface Config {
  hearing_reminder_7d:   boolean
  hearing_reminder_1d:   boolean
  consultation_followup: boolean
  [key: string]: boolean
}

const TYPES = [
  {
    key:         'client_intake',
    label:       'AI Client Intake',
    description: 'Shows the intake chat widget on advocate public pages. Turning off blocks new enquiries immediately (API-level gate).',
  },
  {
    key:         'hearing_reminders',
    label:       'Hearing Reminders',
    description: 'Daily cron (08:00 IST) — WhatsApp alerts to advocate + client 7 days and 1 day before a hearing. Controls both the 7-day and 1-day windows together (logged in the table below as separate "Reminder 7d"/"Reminder 1d" rows).',
  },
  {
    key:         'consultation_followup',
    label:       'Post-consultation Follow-up',
    description: 'Event-driven — WhatsApp follow-up to client when advocate logs a consultation.',
  },
  {
    key:         'cause_list_digest',
    label:       'Personal Cause List Digest',
    description: 'Daily cron (18:00 IST) — WhatsApp digest of tomorrow’s watched matters, only for advocates who’ve opted in individually.',
  },
]

const TYPE_LABELS: Record<string, string> = {
  hearing_reminder_7d:        'Reminder 7d',
  hearing_reminder_1d:        'Reminder 1d',
  hearing_reminder_7d_client: 'Client 7d',
  hearing_reminder_1d_client: 'Client 1d',
  consultation_followup:      'Follow-up',
  intake:                     'Intake',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function AdminNotificationsPage() {
  const [config, setConfig]               = useState<Config | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [saving, setSaving]               = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(d => {
        setConfig(d.config ?? {})
        setNotifications(d.notifications ?? [])
      })
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(key: string, enabled: boolean) {
    setSaving(key)
    try {
      const res  = await fetch('/api/admin/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key, enabled }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setConfig(data.config)
    } catch {
      setError('Save failed')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-8">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    )
  }

  const sentCount   = notifications.filter(n => n.status === 'sent').length
  const failedCount = notifications.filter(n => n.status === 'failed').length

  return (
    <div className="max-w-4xl mx-auto pt-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Notifications</h1>
        <p className="text-sm text-[#666]">Control automated WhatsApp notifications and view send history.</p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Automation toggles */}
      <div>
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">Automation controls</h2>
        <div className="space-y-3">
          {TYPES.map(t => {
            const isOn = config?.[t.key] !== false
            const busy = saving === t.key
            return (
              <div key={t.key}
                className="flex items-center justify-between bg-white border border-[#E5E5E5] rounded-2xl px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#0D0D0D]">{t.label}</p>
                  <p className="text-xs text-[#888] mt-0.5">{t.description}</p>
                </div>
                <button
                  onClick={() => toggle(t.key, !isOn)}
                  disabled={busy}
                  className={`relative ml-6 shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                    isOn ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'
                  }`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    isOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#bbb] mt-3 px-1">
          Toggling off prevents future sends for that type. Already-sent notifications are unaffected.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total sends',  value: notifications.length },
          { label: 'Delivered',    value: sentCount,   accent: true },
          { label: 'Failed',       value: failedCount, warn: failedCount > 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-4">
            <p className="text-xs text-[#888] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${
              s.warn ? 'text-red-500' : s.accent ? 'text-[#16A34A]' : 'text-[#0D0D0D]'
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Notification log */}
      <div>
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-4">
          Recent sends{notifications.length >= 200 ? ' (last 200)' : ''}
        </h2>
        {notifications.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#888]">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0F0F0]">
                  {['Date', 'Type', 'Advocate', 'Client', 'Recipient', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[#888] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((n, i) => (
                  <tr key={n.id}
                    className={`border-b border-[#F9F9F9] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#666]">{formatDate(n.sent_at)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#555] font-medium">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#0D0D0D]">
                      {n.provider ? `${n.provider.first_name} ${n.provider.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[#666]">
                      {n.student?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[#666] font-mono">
                      {n.recipient}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        n.status === 'sent'
                          ? 'bg-[#F0FDF4] text-[#16A34A]'
                          : 'bg-[#FEF2F2] text-red-500'
                      }`}>
                        {n.status === 'sent' ? '✓ sent' : '✕ failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
