'use client'
import { useState, useRef } from 'react'

interface Props {
  providerId: string
  accentColor?: string
  onClose: () => void
}

const WHAT_OPTIONS  = ['Cake', 'Cupcakes', 'Cookies', 'Bread', 'Hamper', 'Other']
const OCCASIONS     = ['Birthday', 'Anniversary', 'Wedding', 'Festive', 'Corporate', 'Graduation', 'Other']
const SERVING_SIZES = ['Feeds 4–6', 'Feeds 8–10', 'Feeds 12–15', 'Feeds 20+', 'Not sure']

const minDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export default function CustomOrderModal({ providerId, accentColor = 'var(--color-accent)', onClose }: Props) {
  const [what,        setWhat]        = useState('')
  const [occasion,    setOccasion]    = useState('')
  const [servings,    setServings]    = useState('')
  const [flavour,     setFlavour]     = useState('')
  const [design,      setDesign]      = useState('')
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [area,        setArea]        = useState('')
  const [date,        setDate]        = useState('')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const service = what ? `Custom ${what}` : 'Custom Order'
    const parts = [
      occasion  && `Occasion: ${occasion}`,
      servings  && `Serves: ${servings}`,
      flavour   && `Flavour: ${flavour}`,
      design    && `Design: ${design}`,
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
            <p className="font-black text-[#0D0D0D] text-lg mb-2">Custom Order Received!</p>
            <p className="text-sm text-[#666] mb-6">We'll get back to you via WhatsApp to discuss the details.</p>
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl text-sm font-black text-white"
              style={{ background: accentColor }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pb-10 space-y-5">
            <div className="pt-3 pb-1">
              <p className="font-black text-[#0D0D0D] text-lg">Custom Order</p>
              <p className="text-sm text-[#999] mt-0.5">Tell us what you have in mind — we'll make it happen.</p>
            </div>

            {/* What are you looking for */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                What are you looking for?
              </label>
              <div className="flex flex-wrap gap-2">
                {WHAT_OPTIONS.map(o => (
                  <button key={o} type="button"
                    onClick={() => setWhat(w => w === o ? '' : o)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background:  what === o ? accentColor : 'transparent',
                      borderColor: what === o ? accentColor : '#E5E5E5',
                      color:       what === o ? 'white'     : '#666',
                    }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">Occasion</label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(o => (
                  <button key={o} type="button"
                    onClick={() => setOccasion(oc => oc === o ? '' : o)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background:  occasion === o ? accentColor : 'transparent',
                      borderColor: occasion === o ? accentColor : '#E5E5E5',
                      color:       occasion === o ? 'white'     : '#666',
                    }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Servings */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">Servings / Size</label>
              <div className="flex flex-wrap gap-2">
                {SERVING_SIZES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setServings(sv => sv === s ? '' : s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background:  servings === s ? accentColor : 'transparent',
                      borderColor: servings === s ? accentColor : '#E5E5E5',
                      color:       servings === s ? 'white'     : '#666',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Flavour */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Flavour preferences <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <input
                value={flavour}
                onChange={e => setFlavour(e.target.value)}
                placeholder="e.g. Chocolate truffle, eggless vanilla, butterscotch"
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>

            {/* Design */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Design / Theme description
              </label>
              <textarea
                value={design}
                onChange={e => setDesign(e.target.value)}
                placeholder="e.g. 3-tier floral design, soft pink and gold, write 'Happy 30th Priya'"
                rows={3}
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#bbb]"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-2">
                Inspiration image <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              {imagePreview ? (
                <div className="relative w-24 h-24">
                  <img src={imagePreview} alt="Inspiration"
                    className="w-24 h-24 rounded-xl object-cover" />
                  <button type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center text-xs font-bold">
                    ×
                  </button>
                </div>
              ) : (
                <button type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border border-dashed border-[#E5E5E5] rounded-xl text-sm text-[#999] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors w-full">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Upload a reference photo
                </button>
              )}
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
              <p className="text-xs text-[#999] mt-1.5">Custom orders need at least 3 days notice</p>
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
              {submitting ? 'Sending request…' : 'Send Custom Order Request →'}
            </button>
            <p className="text-center text-xs text-[#999] pb-2">We'll discuss the details via WhatsApp</p>
          </form>
        )}
      </div>
    </>
  )
}
