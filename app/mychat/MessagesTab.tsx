'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import WhatsAppSettingsTab from './WhatsAppSettingsTab'

interface WaMessage {
  id: string
  customer_phone: string
  customer_name: string | null
  body: string
  direction: 'inbound' | 'outbound'
  read: boolean
  msg_timestamp: string
}

interface Thread {
  customerPhone: string
  customerName: string | null
  messages: WaMessage[]
  unread: number
  lastTs: string
}

interface Props {
  providerId: string
  plan: string
}

export default function MessagesTab({ providerId, plan }: Props) {
  const [threads, setThreads]         = useState<Thread[]>([])
  const [activePhone, setActivePhone] = useState<string | null>(null)
  const [replyText, setReplyText]     = useState('')
  const [replying, setReplying]       = useState(false)
  const [replyError, setReplyError]   = useState('')
  const [connected, setConnected]     = useState<boolean | null>(null)
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState<'inbox' | 'settings'>('inbox')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  // Check Business API connection
  useEffect(() => {
    supabase
      .from('whatsapp_connections')
      .select('id')
      .eq('provider_id', providerId)
      .maybeSingle()
      .then(({ data }) => {
        const isConnected = !!data
        setConnected(isConnected)
        if (!isConnected) setView('settings')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  // Load initial messages
  useEffect(() => {
    supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('provider_id', providerId)
      .order('msg_timestamp', { ascending: true })
      .then(({ data }) => {
        if (data) buildThreads(data as WaMessage[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`wa-messages-${providerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `provider_id=eq.${providerId}` },
        (payload) => setThreads(prev => mergeMessage(prev, payload.new as WaMessage))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activePhone, threads])

  function buildThreads(msgs: WaMessage[]) {
    const map = new Map<string, Thread>()
    for (const m of msgs) {
      const key = m.customer_phone
      if (!map.has(key)) {
        map.set(key, { customerPhone: key, customerName: m.customer_name, messages: [], unread: 0, lastTs: m.msg_timestamp })
      }
      const t = map.get(key)!
      t.messages.push(m)
      if (!m.read && m.direction === 'inbound') t.unread++
      if (m.msg_timestamp > t.lastTs) t.lastTs = m.msg_timestamp
      if (m.customer_name && !t.customerName) t.customerName = m.customer_name
    }
    setThreads(Array.from(map.values()).sort((a, b) => b.lastTs.localeCompare(a.lastTs)))
  }

  function mergeMessage(prev: Thread[], msg: WaMessage): Thread[] {
    const existing = prev.find(t => t.customerPhone === msg.customer_phone)
    if (existing) {
      return prev.map(t =>
        t.customerPhone === msg.customer_phone
          ? {
              ...t,
              messages: [...t.messages, msg],
              unread: msg.direction === 'inbound' && !msg.read ? t.unread + 1 : t.unread,
              lastTs: msg.msg_timestamp,
              customerName: t.customerName ?? msg.customer_name,
            }
          : t
      ).sort((a, b) => b.lastTs.localeCompare(a.lastTs))
    }
    return [
      { customerPhone: msg.customer_phone, customerName: msg.customer_name, messages: [msg],
        unread: msg.direction === 'inbound' && !msg.read ? 1 : 0, lastTs: msg.msg_timestamp },
      ...prev,
    ]
  }

  async function markRead(phone: string) {
    await supabase
      .from('whatsapp_messages')
      .update({ read: true })
      .eq('provider_id', providerId)
      .eq('customer_phone', phone)
      .eq('direction', 'inbound')
      .eq('read', false)
    setThreads(prev =>
      prev.map(t =>
        t.customerPhone === phone ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, read: true })) } : t
      )
    )
  }

  async function sendReply() {
    if (!replyText.trim() || !activePhone || replying) return
    setReplying(true)
    setReplyError('')
    try {
      const res = await fetch('/api/mychat/whatsapp-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, customerPhone: activePhone, body: replyText.trim() }),
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

  // Settings view — shown when not connected OR when gear clicked
  if (view === 'settings') {
    return (
      <WhatsAppSettingsTab
        providerId={providerId}
        plan={plan}
        onBack={connected ? () => setView('inbox') : undefined}
      />
    )
  }

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

  const activeThread = threads.find(t => t.customerPhone === activePhone)
  const totalUnread  = threads.reduce((sum, t) => sum + t.unread, 0)

  // Thread list view
  if (!activePhone) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 bg-[#25D366] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </p>
          <button
            onClick={() => setView('settings')}
            className="text-[#999] hover:text-[#0D0D0D] transition-colors p-1"
            title="WhatsApp settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>

        {threads.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#999]">No messages yet.</p>
            <p className="text-xs text-[#bbb] mt-1">Customers who message you via WhatsApp will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {threads.map(t => (
              <button
                key={t.customerPhone}
                onClick={() => { setActivePhone(t.customerPhone); markRead(t.customerPhone) }}
                className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-[#F0F0F0] flex items-center justify-center shrink-0 text-sm font-semibold text-[#888]">
                  {(t.customerName ?? t.customerPhone)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0D0D0D] truncate">
                      {t.customerName ?? t.customerPhone}
                    </p>
                    <span className="text-[10px] text-[#bbb] shrink-0">
                      {new Date(t.lastTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[#999] truncate">{t.messages[t.messages.length - 1]?.body}</p>
                    {t.unread > 0 && (
                      <span className="shrink-0 w-4 h-4 rounded-full bg-[#25D366] text-white text-[9px] font-bold flex items-center justify-center">
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

  // Thread detail view
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-3 shrink-0">
        <button onClick={() => setActivePhone(null)} className="text-[#666] hover:text-[#0D0D0D] transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-xs font-semibold text-[#888]">
          {(activeThread?.customerName ?? activePhone)[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0D0D0D] leading-tight truncate">
            {activeThread?.customerName ?? activePhone}
          </p>
          <p className="text-[10px] text-[#bbb]">{activePhone}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {activeThread?.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.direction === 'outbound'
                ? 'bg-[#0D0D0D] text-white rounded-br-sm'
                : 'bg-[#F0F0F0] text-[#0D0D0D] rounded-bl-sm'
            }`}>
              {msg.body}
              <div className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/50' : 'text-[#bbb]'}`}>
                {new Date(msg.msg_timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

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
            className="shrink-0 w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
