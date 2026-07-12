'use client'

/**
 * EmailTab — two-way email inbox for advocate providers.
 *
 * Thread list (by customer_email) → conversation view → reply box + Compose.
 * Mirrors MessagesTab.tsx (WhatsApp inbox) in structure and style.
 *
 * Inbound HTML is sanitized via isomorphic-dompurify before render.
 * Attachments show as download chips using signed Supabase Storage URLs.
 *
 * Backend:
 *   Inbound:  POST /api/webhooks/resend-inbound → realtime via Supabase
 *   Outbound: POST /api/mychat/email-reply
 *   Settings: POST /api/mychat/email-settings  (via EmailSettingsTab)
 */

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import DOMPurify from 'isomorphic-dompurify'
import EmailSettingsTab from './EmailSettingsTab'

interface EmailMessage {
  id: string
  customer_email: string
  customer_name: string | null
  direction: 'inbound' | 'outbound'
  subject: string
  body_text: string
  body_html: string
  message_id: string
  in_reply_to: string | null
  attachments: { name: string; size: number; url: string }[]
  read: boolean
  created_at: string
}

interface Thread {
  customerEmail: string
  customerName: string | null
  messages: EmailMessage[]
  unread: number
  lastTs: string
  subject: string   // subject of the most recent message
}

interface Props {
  providerId: string
  slug: string
}

function initials(name: string | null, email: string): string {
  const src = name ?? email
  return src[0]?.toUpperCase() ?? '?'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EmailTab({ providerId, slug }: Props) {
  const [threads, setThreads]       = useState<Thread[]>([])
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [connected, setConnected]   = useState<boolean | null>(null)
  const [view, setView]             = useState<'inbox' | 'settings' | 'compose'>('inbox')

  // Reply box
  const [replyText, setReplyText]   = useState('')
  const [replying, setReplying]     = useState(false)
  const [replyError, setReplyError] = useState('')

  // Compose modal state
  const [composeTo, setComposeTo]   = useState('')
  const [composeSub, setComposeSub] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composing, setComposing]   = useState(false)
  const [composeError, setComposeError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  // Check if inbox is enabled
  useEffect(() => {
    supabase
      .from('provider_email')
      .select('enabled')
      .eq('provider_id', providerId)
      .maybeSingle()
      .then(({ data }) => {
        const isConnected = !!data && (data.enabled as boolean)
        setConnected(isConnected)
        if (!isConnected) setView('settings')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  // Load existing emails
  useEffect(() => {
    supabase
      .from('emails')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) buildThreads(data as EmailMessage[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`emails-${providerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails', filter: `provider_id=eq.${providerId}` },
        (payload) => setThreads(prev => mergeMessage(prev, payload.new as EmailMessage))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  // Scroll to bottom on new message or thread change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeEmail, threads])

  function buildThreads(msgs: EmailMessage[]) {
    const map = new Map<string, Thread>()
    for (const m of msgs) {
      const key = m.customer_email
      if (!map.has(key)) {
        map.set(key, {
          customerEmail: key,
          customerName: m.customer_name,
          messages: [],
          unread: 0,
          lastTs: m.created_at,
          subject: m.subject,
        })
      }
      const t = map.get(key)!
      t.messages.push(m)
      if (!m.read && m.direction === 'inbound') t.unread++
      if (m.created_at > t.lastTs) { t.lastTs = m.created_at; t.subject = m.subject }
      if (m.customer_name && !t.customerName) t.customerName = m.customer_name
    }
    setThreads(Array.from(map.values()).sort((a, b) => b.lastTs.localeCompare(a.lastTs)))
  }

  function mergeMessage(prev: Thread[], msg: EmailMessage): Thread[] {
    const existing = prev.find(t => t.customerEmail === msg.customer_email)
    if (existing) {
      return prev.map(t =>
        t.customerEmail === msg.customer_email
          ? {
              ...t,
              messages: [...t.messages, msg],
              unread: msg.direction === 'inbound' && !msg.read ? t.unread + 1 : t.unread,
              lastTs: msg.created_at,
              subject: msg.subject,
              customerName: t.customerName ?? msg.customer_name,
            }
          : t
      ).sort((a, b) => b.lastTs.localeCompare(a.lastTs))
    }
    return [
      {
        customerEmail: msg.customer_email,
        customerName: msg.customer_name,
        messages: [msg],
        unread: msg.direction === 'inbound' && !msg.read ? 1 : 0,
        lastTs: msg.created_at,
        subject: msg.subject,
      },
      ...prev,
    ]
  }

  async function markRead(email: string) {
    await supabase
      .from('emails')
      .update({ read: true })
      .eq('provider_id', providerId)
      .eq('customer_email', email)
      .eq('direction', 'inbound')
      .eq('read', false)
    setThreads(prev =>
      prev.map(t =>
        t.customerEmail === email
          ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, read: true })) }
          : t
      )
    )
  }

  async function sendReply() {
    const thread = threads.find(t => t.customerEmail === activeEmail)
    if (!replyText.trim() || !activeEmail || replying || !thread) return
    setReplying(true)
    setReplyError('')

    // Find the last inbound message to thread against
    const lastInbound = [...thread.messages].reverse().find(m => m.direction === 'inbound')

    try {
      const res = await fetch('/api/mychat/email-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          toEmail: activeEmail,
          subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
          body: replyText.trim(),
          inReplyTo: lastInbound?.message_id,
          references: lastInbound?.message_id,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setReplyError(d.error ?? 'Failed to send')
        return
      }
      setReplyText('')
    } catch {
      setReplyError('Something went wrong — try again.')
    } finally {
      setReplying(false)
    }
  }

  async function sendCompose() {
    if (!composeTo.trim() || !composeSub.trim() || !composeBody.trim() || composing) return
    setComposing(true)
    setComposeError('')
    try {
      const res = await fetch('/api/mychat/email-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          toEmail: composeTo.trim(),
          subject: composeSub.trim(),
          body: composeBody.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setComposeError(d.error ?? 'Failed to send')
        return
      }
      setComposeTo('')
      setComposeSub('')
      setComposeBody('')
      setView('inbox')
    } catch {
      setComposeError('Something went wrong — try again.')
    } finally {
      setComposing(false)
    }
  }

  // ── Settings view ─────────────────────────────────────────────────────────
  if (view === 'settings') {
    return (
      <EmailSettingsTab
        providerId={providerId}
        slug={slug}
        onBack={connected ? () => setView('inbox') : undefined}
      />
    )
  }

  // ── Compose modal ─────────────────────────────────────────────────────────
  if (view === 'compose') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-3 shrink-0">
          <button onClick={() => setView('inbox')} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="text-sm font-semibold text-[#0D0D0D]">New email</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <input
            type="email"
            placeholder="To"
            value={composeTo}
            onChange={e => setComposeTo(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
          />
          <input
            type="text"
            placeholder="Subject"
            value={composeSub}
            onChange={e => setComposeSub(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
          />
          <textarea
            rows={10}
            placeholder="Write your email…"
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] resize-none"
          />
          {composeError && <p className="text-red-500 text-xs">{composeError}</p>}
        </div>
        <div className="border-t border-[#F0F0F0] px-4 py-3 shrink-0">
          <button
            onClick={sendCompose}
            disabled={composing || !composeTo.trim() || !composeSub.trim() || !composeBody.trim()}
            className="w-full bg-[#0D0D0D] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {composing ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || connected === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  const activeThread  = threads.find(t => t.customerEmail === activeEmail)
  const totalUnread   = threads.reduce((sum, t) => sum + t.unread, 0)

  // ── Thread list ────────────────────────────────────────────────────────────
  if (!activeEmail) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]">
            Email
            {totalUnread > 0 && (
              <span className="ml-2 bg-[#0D0D0D] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            {/* Compose */}
            <button
              onClick={() => setView('compose')}
              title="Compose new email"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0D0D0D] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 hover:bg-[#F5F5F5] transition-colors">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Compose
            </button>
            {/* Settings gear */}
            <button
              onClick={() => setView('settings')}
              title="Email settings"
              className="text-[#999] hover:text-[#0D0D0D] transition-colors p-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" stroke="#999" strokeWidth="1.3"/>
                <path d="M1 5l7 4.5L15 5" stroke="#999" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm text-[#999]">No emails yet.</p>
            <p className="text-xs text-[#bbb] mt-1">
              Clients who email <strong>{slug}@kryla.work</strong> will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {threads.map(t => (
              <button
                key={t.customerEmail}
                onClick={() => { setActiveEmail(t.customerEmail); markRead(t.customerEmail) }}
                className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-[#F0F0F0] flex items-center justify-center shrink-0 text-sm font-semibold text-[#888]">
                  {initials(t.customerName, t.customerEmail)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${t.unread > 0 ? 'font-semibold text-[#0D0D0D]' : 'font-medium text-[#333]'}`}>
                      {t.customerName ?? t.customerEmail}
                    </p>
                    <span className="text-[10px] text-[#bbb] shrink-0">
                      {new Date(t.lastTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] truncate mt-0.5">{t.subject}</p>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[#bbb] truncate">
                      {t.messages[t.messages.length - 1]?.body_text.slice(0, 80)}
                    </p>
                    {t.unread > 0 && (
                      <span className="shrink-0 w-4 h-4 rounded-full bg-[#0D0D0D] text-white text-[9px] font-bold flex items-center justify-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Thread detail ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-3 shrink-0">
        <button onClick={() => setActiveEmail(null)} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-xs font-semibold text-[#888] shrink-0">
          {initials(activeThread?.customerName ?? null, activeEmail)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0D0D0D] truncate leading-tight">
            {activeThread?.customerName ?? activeEmail}
          </p>
          <p className="text-[10px] text-[#bbb] truncate">{activeEmail}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeThread?.messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
            {/* Subject label on first message or when subject changes */}
            <p className="text-[10px] text-[#bbb] mb-1 px-1">{msg.subject}</p>

            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.direction === 'outbound'
                ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                : 'bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-bl-sm shadow-sm'
            }`}>
              {/* Prefer HTML for inbound, plain text for outbound */}
              {msg.direction === 'inbound' && msg.body_html ? (
                <div
                  className="email-body-html text-xs leading-relaxed [&_a]:underline [&_a]:text-[#0D0D0D]"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(msg.body_html, {
                      ALLOWED_TAGS: ['p','br','b','strong','i','em','u','ul','ol','li','a','span','div','blockquote','h1','h2','h3','pre','code'],
                      ALLOWED_ATTR: ['href','target','rel','style'],
                      ALLOW_DATA_ATTR: false,
                    })
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.body_text || msg.body_html}</p>
              )}

              {/* Attachments */}
              {msg.attachments.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
                  {msg.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        msg.direction === 'outbound'
                          ? 'bg-white/10 text-white hover:bg-white/20'
                          : 'bg-[#F5F5F5] text-[#333] hover:bg-[#EBEBEB]'
                      }`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 9h6M5 1v6m0 0L3 5m2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <span className="opacity-60">{formatSize(att.size)}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className={`text-[10px] mt-1.5 ${msg.direction === 'outbound' ? 'text-white/50' : 'text-[#bbb]'}`}>
                {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-[#F0F0F0] px-3 py-3 shrink-0">
        {replyError && <p className="text-red-500 text-xs mb-2">{replyError}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
            placeholder="Reply…"
            disabled={replying}
            className="flex-1 resize-none border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb] disabled:opacity-50 max-h-28 overflow-y-auto"
          />
          <button
            onClick={sendReply}
            disabled={replying || !replyText.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-[10px] text-[#bbb]">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
