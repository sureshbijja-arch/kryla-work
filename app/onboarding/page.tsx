'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toSlug, suggestSlug, validateSlug } from '@/lib/slug'
import type { OnboardingAnswers, Persona, Plan, Region } from '@/types/onboarding'

type Step = 1 | 2 | 3 | 4 | 5

interface SlugStatus {
  checking: boolean
  available: boolean | null
  message: string | null
}

const PERSONAS: { id: Persona; emoji: string; label: string }[] = [
  { id: 'tutor',        emoji: '📚', label: 'Tutor' },
  { id: 'trainer',      emoji: '💪', label: 'Fitness trainer' },
  { id: 'baker',        emoji: '🧁', label: 'Baker' },
  { id: 'photographer', emoji: '📷', label: 'Photographer' },
  { id: 'salon',        emoji: '✂️',  label: 'Salon / stylist' },
  { id: 'chef',         emoji: '🍱', label: 'Home chef' },
  { id: 'doctor',       emoji: '🩺', label: 'Doctor' },
  { id: 'musician',     emoji: '🎵', label: 'Music teacher' },
  { id: 'other',        emoji: '✨', label: 'Something else' },
]

const PLANS: {
  id: Plan; emoji: string; label: string
  usaPrice: string; indiaPrice: string
  perks: string[]; popular?: boolean
}[] = [
  { id: 'seed',   emoji: '🌱', label: 'Seed',   usaPrice: 'Free',   indiaPrice: 'Free',      perks: ['Your presence online', 'Contact form', 'Up to 10 inquiries'] },
  { id: 'sprout', emoji: '🌿', label: 'Sprout', usaPrice: '$5/mo',  indiaPrice: '₹299/mo',   perks: ['Everything in Seed', 'Real bookings', 'WhatsApp alerts'], popular: true },
  { id: 'grow',   emoji: '🌳', label: 'Grow',   usaPrice: '$12/mo', indiaPrice: '₹799/mo',   perks: ['Everything in Sprout', 'Your own domain', 'Analytics'] },
  { id: 'thrive', emoji: '🚀', label: 'Thrive', usaPrice: '$25/mo', indiaPrice: '₹1,999/mo', perks: ['Everything in Grow', 'Update via WhatsApp', 'All 6 AI agents'] },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({
    plan: 'seed', region: 'usa', whatsappCountryCode: '+1',
  })
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ checking: false, available: null, message: null })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [buildStep, setBuildStep] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slugRef = useRef('')

  const checkSlug = useCallback(async (value: string) => {
    const localError = validateSlug(value)
    if (localError) { setSlugStatus({ checking: false, available: false, message: localError }); return }
    setSlugStatus({ checking: true, available: null, message: null })
    try {
      const res = await fetch(`/api/onboarding/check-slug?slug=${encodeURIComponent(value)}`)
      const data = await res.json()
      setSlugStatus({ checking: false, available: data.available, message: data.available ? 'Available!' : (data.error ?? 'Not available') })
    } catch {
      setSlugStatus({ checking: false, available: null, message: null })
    }
  }, [])

  function handleSlugChange(value: string) {
    const cleaned = toSlug(value)
    setSlug(cleaned)
    setSlugStatus({ checking: false, available: null, message: null })
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
    if (cleaned.length >= 3) slugDebounceRef.current = setTimeout(() => checkSlug(cleaned), 500)
  }

  useEffect(() => {
    if (step === 3 && !slug && answers.firstName) {
      handleSlugChange(suggestSlug(answers.firstName, answers.lastName ?? ''))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => { slugRef.current = slug }, [slug])

  useEffect(() => {
    if (step !== 5 || !providerId) return

    const timings = [0, 2500, 5000, 7500]
    const animTimers = timings.map((ms, i) => setTimeout(() => setBuildStep(i + 1), ms))

    timeoutRef.current = setTimeout(() => {
      setTimedOut(true)
      if (pollRef.current) clearInterval(pollRef.current)
    }, 300000)

    pollRef.current = setInterval(async () => {
      try {
        const currentSlug = slugRef.current
        const url = `/api/onboarding/status?providerId=${encodeURIComponent(providerId)}&slug=${encodeURIComponent(currentSlug)}`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (data.ready) {
          clearInterval(pollRef.current!)
          clearTimeout(timeoutRef.current!)
          setBuildStep(5)
          setTimeout(() => router.push(`/welcome?slug=${data.slug}`), 1500)
        }
      } catch (err) {
        console.error('[poll] error:', err)
      }
    }, 2000)

    return () => {
      animTimers.forEach(clearTimeout)
      if (pollRef.current) clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [step, providerId, router])

  function goBack() { if (step > 1) setStep((s) => (s - 1) as Step) }
  function goNext() { if (step < 4) setStep((s) => (s + 1) as Step) }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.field === 'email' || data.field === 'phone') {
          setStep(2)
          setSubmitError(data.error)
          setSubmitting(false)
          return
        }
        setSubmitError(data.error)
        setSubmitting(false)
        return
      }
      setProviderId(data.providerId)
      setStep(5)
    } catch (err) {
      console.error('[onboarding] Submit fetch failed:', err)
      setSubmitError('Something went wrong — check your connection and try again')
      setSubmitting(false)
    }
  }

  const canProceed1 = !!answers.persona
  const canProceed2 = !!(answers.firstName?.trim() && answers.tagline?.trim())
  const canProceed3 = slugStatus.available === true
  const canProceed4 = !!answers.plan
  const progressPercent = step === 5 ? 95 : (step / 5) * 100

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-xl">

        <div className="bg-[#0D0D0D] rounded-t-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F5A623] rounded-lg flex items-center justify-center font-bold text-[#0D0D0D] text-base">K</div>
            <span className="text-white font-semibold text-sm">kryla<span className="text-[#F5A623]">.work</span></span>
          </div>
          <span className="text-white/40 text-xs">{step < 5 ? `Step ${step} of 4` : 'Getting you started…'}</span>
        </div>

        <div className="h-1 bg-[#E5E5E5]">
          <div className="h-full bg-[#F5A623] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="bg-white border border-[#E5E5E5] border-t-0 rounded-b-2xl overflow-hidden">
          {step < 5 && (
            <div className="flex items-center gap-2 px-7 pt-5">
              {([1,2,3,4] as const).map((s) => (
                <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all ${s < step ? 'bg-[#22C55E]' : s === step ? 'bg-[#F5A623]' : 'bg-[#E5E5E5]'}`} />
              ))}
              <span className="text-[11px] text-[#666] uppercase tracking-wider ml-1">
                {['','What you do','About you','Your address','Your membership'][step]}
              </span>
            </div>
          )}

          <div className="px-7 pb-7 pt-5">

            {step === 1 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C17A3A] mb-1">Getting you started</p>
                <h1 className="text-2xl font-semibold text-[#0D0D0D] mb-1">What do you do?</h1>
                <p className="text-sm text-[#666] mb-6 leading-relaxed">Pick the one that fits you best — we'll shape your presence around it.</p>
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  {PERSONAS.map((p) => (
                    <button key={p.id} onClick={() => setAnswers((a) => ({ ...a, persona: p.id }))}
                      className={`border rounded-xl py-3.5 px-3 text-center transition-all ${answers.persona === p.id ? 'border-[#F5A623] bg-[#FFFBF5] shadow-[0_0_0_3px_rgba(245,166,35,0.15)]' : 'border-[#E5E5E5] hover:border-[#F5A623] hover:bg-[#FFFBF5]'}`}>
                      <div className="text-2xl mb-1.5">{p.emoji}</div>
                      <div className="text-xs font-medium text-[#0D0D0D]">{p.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button onClick={goNext} disabled={!canProceed1}
                    className="bg-[#0D0D0D] text-white rounded-xl px-7 py-3 text-sm font-semibold disabled:bg-[#E5E5E5] disabled:text-[#999] disabled:cursor-not-allowed hover:bg-[#222] transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C17A3A] mb-1">Your presence</p>
                <h1 className="text-2xl font-semibold text-[#0D0D0D] mb-1">Tell us about yourself</h1>
                <p className="text-sm text-[#666] mb-6 leading-relaxed">This is what people see when they find you on Kryla.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-[#444] mb-1.5">Your first name</label>
                    <input type="text" placeholder="Priya" value={answers.firstName ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, firstName: e.target.value }))}
                      className="w-full border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.1)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#444] mb-1.5">Last name</label>
                    <input type="text" placeholder="Sharma" value={answers.lastName ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, lastName: e.target.value }))}
                      className="w-full border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.1)] transition-all" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#444] mb-1.5">What do you offer? <span className="font-normal text-[#999]">in your own words</span></label>
                  <input type="text" placeholder="e.g. Math tutoring for Grades 5–10, after school hours" value={answers.tagline ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, tagline: e.target.value }))}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.1)] transition-all" />
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-[#444] mb-1.5">Where are you based?</label>
                  <input type="text" placeholder="e.g. Celina, TX or Pune, India" value={answers.location ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, location: e.target.value }))}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.1)] transition-all" />
                </div>
                {submitError && <p className="text-sm text-red-500 mb-4">{submitError}</p>}
                <div className="flex justify-between items-center">
                  <button onClick={goBack} className="text-sm text-[#999] hover:text-[#0D0D0D] transition-colors">← Back</button>
                  <button onClick={goNext} disabled={!canProceed2}
                    className="bg-[#0D0D0D] text-white rounded-xl px-7 py-3 text-sm font-semibold disabled:bg-[#E5E5E5] disabled:text-[#999] disabled:cursor-not-allowed hover:bg-[#222] transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C17A3A] mb-1">Your address online</p>
                <h1 className="text-2xl font-semibold text-[#0D0D0D] mb-1">Claim your spot</h1>
                <p className="text-sm text-[#666] mb-6 leading-relaxed">This is where people will find you. Pick something short and easy to share.</p>
                <div className="mb-5">
                  <label className="block text-xs font-medium text-[#444] mb-1.5">Your Kryla address</label>
                  <input type="text" placeholder="priyasharma" value={slug} onChange={(e) => handleSlugChange(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none transition-all ${slugStatus.available === true ? 'border-[#22C55E]' : slugStatus.available === false ? 'border-red-300' : 'border-[#E5E5E5] focus:border-[#F5A623]'}`} />
                  <div className="mt-2 flex items-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3.5 py-2.5">
                    <span className="text-sm text-[#999]">kryla.work/</span>
                    <span className="text-sm font-semibold text-[#C17A3A]">{slug || 'yourname'}</span>
                  </div>
                  {slugStatus.checking && <p className="text-xs text-[#999] mt-1.5">Checking…</p>}
                  {!slugStatus.checking && slugStatus.message && (
                    <p className={`text-xs mt-1.5 ${slugStatus.available ? 'text-[#22C55E]' : 'text-red-500'}`}>
                      {slugStatus.available ? '✓ ' : ''}{slugStatus.message}
                    </p>
                  )}
                  <p className="text-xs text-[#999] mt-1.5">Only lowercase letters and numbers. No spaces.</p>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#444] mb-1.5">Your WhatsApp number <span className="font-normal text-[#999]">for new business notifications</span></label>
                  <div className="flex gap-2">
                    <input type="text" value={answers.whatsappCountryCode ?? '+1'} onChange={(e) => setAnswers((a) => ({ ...a, whatsappCountryCode: e.target.value }))}
                      className="w-16 border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-all" />
                    <input type="tel" placeholder="469 555 0112" value={answers.whatsappNumber ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, whatsappNumber: e.target.value }))}
                      className="flex-1 border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] transition-all" />
                  </div>
                  <p className="text-xs text-[#999] mt-1.5">We'll send you a WhatsApp when new business comes in. You can change this anytime.</p>
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-[#444] mb-1.5">Your email <span className="font-normal text-[#999]">optional</span></label>
                  <input type="email" placeholder="priya@gmail.com" value={answers.email ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, email: e.target.value }))}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#999] focus:outline-none focus:border-[#F5A623] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.1)] transition-all" />
                  <p className="text-xs text-[#999] mt-1.5">We'll use this if we can't reach you on WhatsApp.</p>
                </div>
                <div className="flex justify-between items-center">
                  <button onClick={goBack} className="text-sm text-[#999] hover:text-[#0D0D0D] transition-colors">← Back</button>
                  <button onClick={goNext} disabled={!canProceed3}
                    className="bg-[#0D0D0D] text-white rounded-xl px-7 py-3 text-sm font-semibold disabled:bg-[#E5E5E5] disabled:text-[#999] disabled:cursor-not-allowed hover:bg-[#222] transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C17A3A] mb-1">Pick your start</p>
                <h1 className="text-2xl font-semibold text-[#0D0D0D] mb-1">How do you want to start?</h1>
                <p className="text-sm text-[#666] mb-5 leading-relaxed">You can always move up later. Most people start free and grow from there.</p>
                <div className="flex bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-1 w-fit gap-1 mb-5">
                  {(['usa', 'india'] as Region[]).map((r) => (
                    <button key={r} onClick={() => setAnswers((a) => ({ ...a, region: r }))}
                      className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${answers.region === r ? 'bg-[#F5A623] text-[#0D0D0D]' : 'text-[#999] hover:text-[#444]'}`}>
                      {r === 'usa' ? '🇺🇸 USA' : '🇮🇳 India'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {PLANS.map((plan) => (
                    <button key={plan.id} onClick={() => setAnswers((a) => ({ ...a, plan: plan.id }))}
                      className={`relative border rounded-xl p-4 text-left transition-all ${answers.plan === plan.id ? 'border-[#F5A623] bg-[#FFFBF5] shadow-[0_0_0_3px_rgba(245,166,35,0.15)]' : 'border-[#E5E5E5] hover:border-[#F5A623] hover:bg-[#FFFBF5]'}`}>
                      {plan.popular && (
                        <div className="absolute -top-px right-3 bg-[#F5A623] text-[#0D0D0D] text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-b-md">Most popular</div>
                      )}
                      <div className="text-xs font-semibold text-[#0D0D0D] mb-0.5">{plan.emoji} {plan.label}</div>
                      <div className="text-lg font-bold text-[#0D0D0D] mb-2">{answers.region === 'india' ? plan.indiaPrice : plan.usaPrice}</div>
                      <ul className="space-y-1">
                        {plan.perks.map((perk) => (
                          <li key={perk} className="text-[11px] text-[#444] flex items-start gap-1.5">
                            <span className="text-[#22C55E] font-bold flex-shrink-0">✓</span>{perk}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                {submitError && <p className="text-sm text-red-500 mb-4">{submitError}</p>}
                <div className="flex justify-between items-center">
                  <button onClick={goBack} className="text-sm text-[#999] hover:text-[#0D0D0D] transition-colors">← Back</button>
                  <button onClick={handleSubmit} disabled={!canProceed4 || submitting}
                    className="bg-[#F5A623] text-[#0D0D0D] rounded-xl px-7 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#C17A3A] hover:text-white transition-all">
                    {submitting ? 'Starting…' : 'Build my presence →'}
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col items-center text-center py-8 gap-5">
                {timedOut ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border-2 border-[#E5E5E5] flex items-center justify-center text-3xl">✉️</div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#0D0D0D] mb-2">You're all set — we're on it</h2>
                      <p className="text-sm text-[#666] max-w-xs leading-relaxed">Your presence is taking a little longer than usual. We'll reach out on WhatsApp or email as soon as it's ready.</p>
                    </div>
                    <p className="text-xs text-[#999]">You can safely close this tab.</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#FFFBF5] border-2 border-[#F5A623] flex items-center justify-center text-3xl animate-pulse">✨</div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#0D0D0D] mb-2">Building your presence…</h2>
                      <p className="text-sm text-[#666] max-w-xs leading-relaxed">Kryla is writing your copy, picking your layout, and setting up everything. About 15 seconds.</p>
                    </div>
                    <div className="w-full max-w-xs space-y-3 text-left">
                      {['Writing your intro and services','Choosing your layout and colors','Setting up your booking form','Making your presence live'].map((label, i) => {
                        // Steps 1-3 auto-checkmark; step 4 only when buildStep===5 (ready:true received)
                        const done = i < 3 ? buildStep > i + 1 : buildStep === 5
                        const active = !done && buildStep === i + 1
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${done ? 'bg-[#22C55E] border-[#22C55E]' : active ? 'border-[#F5A623] bg-[rgba(245,166,35,0.1)]' : 'border-[#E5E5E5]'}`}>
                              {done ? <span className="text-white text-[10px]">✓</span> : active ? <span className="inline-block w-2.5 h-2.5 rounded-full border border-[#F5A623] border-t-transparent animate-spin" /> : null}
                            </div>
                            <span className={`text-sm transition-colors ${done ? 'text-[#444]' : active ? 'text-[#0D0D0D] font-medium' : 'text-[#999]'}`}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {step < 5 && (
          <p className="text-center text-xs text-[#999] mt-4">No credit card needed to start · Cancel anytime</p>
        )}
      </div>
    </div>
  )
}
