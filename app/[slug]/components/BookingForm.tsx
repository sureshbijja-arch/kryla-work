'use client'

import { useState } from 'react'
import type { ServiceItem } from '../types'

export default function BookingForm({
  providerId,
  services,
  accentColor,
  firstName,
  ctaLabel = 'Send request',
}: {
  providerId: string
  services: ServiceItem[]
  accentColor: string
  firstName: string
  ctaLabel?: string
}) {
  const [form, setForm] = useState({
    customerName:  '',
    customerEmail: '',
    customerPhone: '',
    service:       services[0]?.name ?? '',
    preferredDate: '',
    message:       '',
  })
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          customerName:  form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          service:       form.service || services[0]?.name || 'General inquiry',
          preferredDate: form.preferredDate || undefined,
          message:       form.message || undefined,
        }),
      })

      let data: { error?: unknown; success?: boolean } = {}
      try {
        data = await res.json()
      } catch {
        const text = await res.text().catch(() => '')
        setErrorMsg(`Server error (${res.status})${text ? ': ' + text.slice(0, 120) : ''}`)
        setStatus('error')
        return
      }

      if (!res.ok) {
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Something went wrong — please try again')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Check your connection and try again')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: accentColor }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4.5 4.5L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-semibold text-[#0D0D0D] text-lg">Request sent!</p>
        <p className="text-[#666666] text-sm mt-1">{firstName} will be in touch soon.</p>
      </div>
    )
  }

  const inputCls = 'w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#0D0D0D] bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Your name</label>
          <input required type="text" placeholder="Priya Sharma"
            value={form.customerName}
            onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Email</label>
          <input required type="email" placeholder="priya@example.com"
            value={form.customerEmail}
            onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">WhatsApp number</label>
        <input required type="tel" placeholder="+91 98765 43210"
          value={form.customerPhone}
          onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
          className={inputCls} />
      </div>

      {services.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">Service</label>
          <select value={form.service}
            onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
            className={inputCls}>
            {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
            Preferred date <span className="normal-case font-normal text-[#bbb]">(optional)</span>
          </label>
          <input type="date"
            min={new Date().toISOString().split('T')[0]}
            value={form.preferredDate}
            onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1.5">
            Message <span className="normal-case font-normal text-[#bbb]">(optional)</span>
          </label>
          <input type="text" placeholder="Anything to share…"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      {status === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 rounded-lg font-semibold text-white text-sm disabled:opacity-60 transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: accentColor }}>
        {status === 'loading' ? 'Sending…' : ctaLabel}
      </button>
    </form>
  )
}
