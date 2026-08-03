'use client'
import { useState } from 'react'
import { getPersonaConfig } from '../personaConfig'
import { DEFAULT_ORDER_CONFIG } from '@/lib/orderConfig'
import type { OrderConfig } from '../types'
import OrderSheet from './OrderSheet'

export interface OrderItem {
  name: string
  description?: string
  price?: string
  image_url?: string
}

interface Props {
  item: OrderItem
  providerId: string
  accentColor?: string
  /** DB-driven order-form vocabulary for this persona — occasions,
   * fulfillment options, notes placeholder. See getOrderConfig() in
   * lib/personas.ts. Undefined = the generic bakery-shaped default below
   * (matches what every persona showed before this became DB-driven). */
  config?: OrderConfig
  /** Persona id — reads hasQuantity/hasNotes from PERSONA_CONFIG so this
   * modal actually honours them (previously it rendered the quantity
   * stepper and notes field unconditionally for every persona regardless
   * of these flags). Undefined = both default true, matching prior
   * behaviour for any caller that hasn't been updated to pass it. */
  persona?: string
  onClose: () => void
}

const minDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

export default function OrderModal({ item, providerId, accentColor = 'var(--color-accent)', config, persona, onClose }: Props) {
  const cfg = config ?? DEFAULT_ORDER_CONFIG
  const pcfg = getPersonaConfig(persona ?? 'other')
  const showQuantity = persona === undefined || pcfg.hasQuantity
  const showNotes = persona === undefined || pcfg.hasNotes

  const [qty,          setQty]          = useState(1)
  const [occasion,     setOccasion]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [fulfillment,  setFulfillment]  = useState(cfg.fulfillment[0]?.key ?? 'pickup')
  const [area,         setArea]         = useState('')
  const [date,         setDate]         = useState('')
  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [done,         setDone]         = useState(false)
  const [error,        setError]        = useState('')

  const selectedFulfillment = cfg.fulfillment.find(f => f.key === fulfillment) ?? cfg.fulfillment[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const service = showQuantity && qty > 1 ? `${item.name} × ${qty}` : item.name
    const parts = [
      occasion   && `Occasion: ${occasion}`,
      showNotes && notes && `Notes: ${notes}`,
      selectedFulfillment?.areaPlaceholder
        ? `${selectedFulfillment.label}: ${area || 'TBD'}`
        : selectedFulfillment?.label,
    ].filter(Boolean)

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          customerName:  name.trim(),
          customerPhone: phone.trim(),
          service,
          preferredDate: date || undefined,
          message:       parts.join(' | ') || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
    } catch {
      setError('Something went wrong. Please try WhatsApp instead.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OrderSheet
      title={done ? 'Order Received!' : item.name}
      subtitle={done ? undefined : item.price ?? undefined}
      onClose={onClose}
    >
        {done ? (
          <div className="px-6 pt-6 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l5 5 11-11" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-[#666] mb-6">We&apos;ll confirm your order via WhatsApp shortly.</p>
            <button onClick={onClose}
              className="w-full py-4 text-sm font-black text-white"
              style={{ background: accentColor, borderRadius: 'var(--radius-btn)' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pt-5 pb-10 space-y-5">
            {/* Item — name/price already shown in the sheet's pinned header;
                this row adds the photo and description. */}
            {(item.image_url || item.description) && (
              <div className="flex gap-3 pt-2">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name}
                    style={{ borderRadius: 'var(--radius-card)' }}
                    className="w-16 h-16 object-cover shrink-0" />
                )}
                {item.description && (
                  <p className="text-xs text-[#999] line-clamp-3 self-center">{item.description}</p>
                )}
              </div>
            )}

            {/* Quantity */}
            {showQuantity && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[#0D0D0D]">Quantity</p>
                <div className="flex items-center gap-4">
                  <button type="button"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border border-[#E5E5E5] flex items-center justify-center font-bold text-lg text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors">
                    −
                  </button>
                  <span className="font-black text-lg text-[#0D0D0D] w-5 text-center">{qty}</span>
                  <button type="button"
                    onClick={() => setQty(q => q + 1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg text-white"
                    style={{ background: accentColor }}>
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Occasion */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Occasion <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {cfg.occasions.map(o => (
                  <button key={o} type="button"
                    onClick={() => setOccasion(occ => occ === o ? '' : o)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background:   occasion === o ? accentColor : 'transparent',
                      borderColor:  occasion === o ? accentColor : '#E5E5E5',
                      color:        occasion === o ? 'white'     : '#666',
                    }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            {showNotes && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                  Notes / Customization
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={cfg.notesPlaceholder}
                  rows={3}
                  style={{ borderRadius: 'var(--radius-card)' }}
                  className="w-full border border-[#E5E5E5] px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                />
              </div>
            )}

            {/* Fulfillment — hidden entirely when there's only one option
                (nothing to choose), matching the "Pickup only, no chooser
                shown" behaviour for sellganeshidols once its order_config
                seeds a single-entry fulfillment list. */}
            {cfg.fulfillment.length > 1 && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">Fulfillment</label>
                <div className="flex gap-2 mb-2">
                  {cfg.fulfillment.map(f => (
                    <button key={f.key} type="button"
                      onClick={() => setFulfillment(f.key)}
                      className="flex-1 py-2.5 text-sm font-black border transition-all"
                      style={{
                        borderRadius: 'var(--radius-btn)',
                        background:  fulfillment === f.key ? accentColor : 'transparent',
                        borderColor: fulfillment === f.key ? accentColor : '#E5E5E5',
                        color:       fulfillment === f.key ? 'white'     : '#666',
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {selectedFulfillment?.areaPlaceholder && (
                  <input
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder={selectedFulfillment.areaPlaceholder}
                    style={{ borderRadius: 'var(--radius-card)' }}
                    className="w-full border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                  />
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                When do you need it?
              </label>
              <input
                type="date"
                value={date}
                min={minDate()}
                onChange={e => setDate(e.target.value)}
                style={{ borderRadius: 'var(--radius-card)' }}
                className="w-full border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </div>

            {/* Contact */}
            <div className="border-t border-[#F0F0F0] pt-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999]">Your Details</p>
              <input required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name *"
                style={{ borderRadius: 'var(--radius-card)' }}
                className="w-full border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
              <input required type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="WhatsApp number *"
                style={{ borderRadius: 'var(--radius-card)' }}
                className="w-full border border-[#E5E5E5] px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button type="submit"
              disabled={submitting || !name.trim() || !phone.trim()}
              className="w-full py-4 text-sm font-black text-white transition-opacity disabled:opacity-50"
              style={{ background: accentColor, borderRadius: 'var(--radius-btn)' }}>
              {submitting ? 'Placing order…' : 'Place Order →'}
            </button>
            <p className="text-center text-xs text-[#999] pb-2">We&apos;ll confirm your order via WhatsApp</p>
          </form>
        )}
    </OrderSheet>
  )
}
