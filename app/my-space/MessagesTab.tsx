'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function MessagesTab({ providerId }: { providerId: string }) {
  const [threads, setThreads]             = useState<Thread[]>([])
  const [activePhone, setActivePhone]     = useState<string | null>(null)
  const [replyText, setReplyText]         = useState('')
  const [replying, setReplying]           = useState(false)
  const [replyError, setReplyError]       = useState('')
  const [connected, setConnected]         = useState<boolean | null>(null)
  const [loading, setLoading]             = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  // Check Business API connection
  useEffect(() => {
    supabase
      .from('whatsapp_connections')
      .select('id')
      .eq('provider_id', providerId)
      .maybeSingle()
      .then(({ data }) => setConnected(!!data))
  }, [providerId, supabase])

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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const msg = payload.new as WaMessage
          setThreads(prev => mergeMessage(prev, msg))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [providerId, supabase])

  // Scroll to bottom when active thread changes or new message arrives
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
    const newThread: Thread = {
      customerPhone: msg.customer_phone,
      customerName:  msg.customer_name,
      messages:      [msg],
      unread:        msg.direction === 'inbound' && !msg.read ? 1 : 0,
      lastTs:        msg.msg_timestamp,
    }
    return [newThread, ...prev]
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
      const res = await fetch('/api/my-space/whatsapp-reply', {
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

  const activeThread = threads.find(t => t.customerPhone === activePhone)
  const totalUnread  = threads.reduce((sum, t) => sum + t.unread, 0)

  // No Business API connection
  if (connected === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.529 5.849L.057 23.286a.75.75 0 00.914.914l5.504-1.455A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.98 0-3.824-.578-5.378-1.572l-.378-.237-3.925 1.038 1.055-3.851-.249-.393A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
          </svg>
        </div>
        <p className="font-semibold text-[#0D0D0D] mb-1">Connect WhatsApp Business</p>
        <p className="text-sm text-[#666] mb-5 max-w-xs">
          Connect your WhatsApp Business API to receive and reply to customer messages here.
        </p>
        <p className="text-xs text-[#999]">WhatsApp settings coming soon in Phase 3.</p>
      </div>
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

  // Thread list view
  if (!activePhone) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Header row */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 bg-[#25D366] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </p>
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
                className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors text-left"
              >
                {/* Avatar */}
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
                    <p className="text-xs text-[#999] truncate">
                      {t.messages[t.messages.length - 1]?.body}
                    </p>
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
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActivePhone(null)}
          className="text-[#666] hover:text-[#0D0D0D] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-xs font-semibold text-[#888]">
          {(activeThread?.customerName ?? activePhone)[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0D0D0D] leading-tight">
            {activeThread?.customerName ?? activePhone}
          </p>
          <p className="text-[10px] text-[#bbb]">{activePhone}</p>
        </div>
      </div>

      {/* Messages */}
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

      {/* Reply input */}
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
            className="shrink-0 w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
