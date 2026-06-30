'use client'
import { useState } from 'react'

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
  onClose: () => void
}

const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Festive', 'Corporate', 'Graduation', 'Other']

const minDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

export default function OrderModal({ item, providerId, accentColor = 'var(--color-accent)', onClose }: Props) {
  const [qty,          setQty]          = useState(1)
  const [occasion,     setOccasion]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [fulfillment,  setFulfillment]  = useState<'pickup' | 'delivery'>('pickup')
  const [area,         setArea]         = useState('')
  const [date,         setDate]         = useState('')
  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [done,         setDone]         = useState(false)
  const [error,        setError]        = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const service = qty > 1 ? `${item.name} × ${qty}` : item.name
    const parts = [
      occasion   && `Occasion: ${occasion}`,
      notes      && `Notes: ${notes}`,
      fulfillment === 'delivery' ? `Delivery to: ${area || 'TBD'}` : 'Pickup',
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
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92svh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
        </div>

        {done ? (
          <div className="px-6 pt-6 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l5 5 11-11" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-black text-[#0D0D0D] text-lg mb-2">Order Received!</p>
            <p className="text-sm text-[#666] mb-6">We'll confirm your order via WhatsApp shortly.</p>
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl text-sm font-black text-white"
              style={{ background: accentColor }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pb-10 space-y-5">
            {/* Item */}
            <div className="flex gap-3 pt-2">
              {item.image_url && (
                <img src={item.image_url} alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-black text-[#0D0D0D] leading-tight">{item.name}</p>
                {item.price && <p className="text-sm font-black mt-0.5" style={{ color: accentColor }}>{item.price}</p>}
                {item.description && (
                  <p className="text-xs text-[#999] mt-0.5 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>

            {/* Quantity */}
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

            {/* Occasion */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Occasion <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(o => (
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
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Notes / Customization
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Write 'Happy Birthday Priya', chocolate frosting, no nuts"
                rows={3}
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>

            {/* Fulfillment */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">Fulfillment</label>
              <div className="flex gap-2 mb-2">
                {(['pickup', 'delivery'] as const).map(f => (
                  <button key={f} type="button"
                    onClick={() => setFulfillment(f)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black border capitalize transition-all"
                    style={{
                      background:  fulfillment === f ? accentColor : 'transparent',
                      borderColor: fulfillment === f ? accentColor : '#E5E5E5',
                      color:       fulfillment === f ? 'white'     : '#666',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              {fulfillment === 'delivery' && (
                <input
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  placeholder="Delivery area / address"
                  className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
                />
              )}
            </div>

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
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </div>

            {/* Contact */}
            <div className="border-t border-[#F0F0F0] pt-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999]">Your Details</p>
              <input required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name *"
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
              <input required type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="WhatsApp number *"
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button type="submit"
              disabled={submitting || !name.trim() || !phone.trim()}
              className="w-full py-4 rounded-2xl text-sm font-black text-white transition-opacity disabled:opacity-50"
              style={{ background: accentColor }}>
              {submitting ? 'Placing order…' : 'Place Order →'}
            </button>
            <p className="text-center text-xs text-[#999] pb-2">We'll confirm your order via WhatsApp</p>
          </form>
        )}
      </div>
    </>
  )
}
