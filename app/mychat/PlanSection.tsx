'use client'

import { useState } from 'react'
import type { PlanDef } from '@/lib/plans'

interface Props {
  currentPlan:  string
  region:       'india' | 'usa'
  plans:        PlanDef[]
  planOrder:    string[]
  planStatus:   string
  trialEndsAt?: string | null
  providerId:   string
  slug:         string
  onGoToMessages?: () => void
}

// ── Trial / billing status banner ─────────────────────────────────────────────

function TrialBanner({ planStatus, trialDaysLeft }: { planStatus: string; trialDaysLeft: number | null }) {
  if (planStatus === 'active') return null

  if (planStatus === 'trialing') {
    if (trialDaysLeft === null) return null

    if (trialDaysLeft > 60) {
      // Month 1 — calm nudge
      return (
        <div className="mb-5 px-4 py-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-sm text-[#166534]">
          🎁 <strong>Free trial active</strong> — {trialDaysLeft} days left. Add a card anytime before your trial ends and your first charge will be deferred to trial end.
        </div>
      )
    }

    if (trialDaysLeft > 30) {
      // Month 2 — reminder
      return (
        <div className="mb-5 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-sm text-[#92400E]">
          ⏳ <strong>Trial ending soon</strong> — {trialDaysLeft} days left. Add a card to keep uninterrupted access after your trial.
        </div>
      )
    }

    // Month 3 — urgent
    return (
      <div className="mb-5 px-4 py-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-sm text-[#9A3412]">
        ⚠️ <strong>Trial ending in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong> — access will be restricted if no payment method is added before your trial ends.
      </div>
    )
  }

  if (planStatus === 'pending_payment') {
    return (
      <div className="mb-5 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#991B1B]">
        🔒 <strong>Access restricted</strong> — your trial has ended. Choose a plan and add a payment method to restore full access.
      </div>
    )
  }

  if (planStatus === 'past_due') {
    return (
      <div className="mb-5 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#991B1B]">
        ⚠️ <strong>Payment failed</strong> — please update your payment method to keep your plan active.
      </div>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlanSection({
  currentPlan,
  region,
  plans,
  planOrder,
  planStatus,
  trialEndsAt,
  providerId,
  slug,
  onGoToMessages,
}: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)

  const currentIdx = planOrder.indexOf(currentPlan)

  const trialDaysLeft: number | null = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  async function handleCheckout(targetPlan: string) {
    setErrorMsg(null)
    setLoadingPlan(targetPlan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, targetPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      // Redirect to Stripe hosted checkout
      window.location.href = data.url
    } catch {
      setErrorMsg('Network error. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const isTrialing = planStatus === 'trialing'
  const needsPayment = planStatus === 'pending_payment' || planStatus === 'past_due'

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-5">My Plan</p>

      {/* Status banner */}
      <TrialBanner planStatus={planStatus} trialDaysLeft={trialDaysLeft} />

      {/* Inline error */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#991B1B]">
          {errorMsg}
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const planIdx     = planOrder.indexOf(plan.id)
          const isCurrent   = plan.id === currentPlan
          const isUpgrade   = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx
          const isQuote     = plan.isQuote
          const isLoading   = loadingPlan === plan.id

          // Determine the CTA for this plan card
          const renderCta = () => {
            if (isQuote) {
              return (
                <a
                  href="mailto:hello@kryla.work"
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-colors whitespace-nowrap">
                  Get a quote →
                </a>
              )
            }

            // India checkout isn't live yet (Razorpay — see api/billing/checkout
            // route.ts's region check). Previously these buttons rendered fully
            // clickable and just silently failed on click for every India member.
            if (region !== 'usa' && !isCurrent) {
              return (
                <button
                  disabled
                  title="Online checkout for India is coming soon"
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#ccc] cursor-not-allowed whitespace-nowrap">
                  Coming soon
                </button>
              )
            }

            if (isCurrent) {
              // During trial or payment required: show "Add card" CTA on current plan
              if (isTrialing || needsPayment) {
                return (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading}
                    className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#0D0D0D] text-white hover:bg-[#333] transition-colors disabled:opacity-60 disabled:cursor-wait whitespace-nowrap">
                    {isLoading ? 'Loading…' : 'Add card →'}
                  </button>
                )
              }
              // Active — no action needed
              return (
                <button
                  disabled
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#bbb] cursor-default whitespace-nowrap">
                  Your plan
                </button>
              )
            }

            // Upgrade / Downgrade to a different plan
            const label = isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : ''
            return (
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={isLoading}
                className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-wait whitespace-nowrap
                  ${isUpgrade
                    ? 'border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white'
                    : 'border-[#E5E5E5] text-[#999] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
                  }`}>
                {isLoading ? 'Loading…' : label}
              </button>
            )
          }

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 transition-all ${
                isCurrent
                  ? 'border-[#0D0D0D] bg-white shadow-sm'
                  : 'border-[#E5E5E5] bg-white opacity-80'
              }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{plan.emoji}</span>
                    <span className="font-bold text-[#0D0D0D]">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold bg-[#0D0D0D] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Current
                      </span>
                    )}
                    {plan.popular && !isCurrent && (
                      <span className="text-[10px] font-semibold bg-[#F5A623] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Popular
                      </span>
                    )}
                    {!isQuote && (
                      <span className="text-sm font-semibold text-[#666]">
                        {region === 'india' ? plan.indiaPrice : plan.usaPrice}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#999] mb-3">{plan.tagline}</p>
                  <ul className="space-y-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[#444]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                          <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 pt-0.5">
                  {renderCta()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* WhatsApp Business add-on card — available on all plans */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">Add-ons</p>
        <div className="rounded-2xl border p-5 bg-white border-[#25D366]/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" fill="#25D366"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.529 5.849L.057 23.286a.75.75 0 00.914.914l5.504-1.455A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.98 0-3.824-.578-5.378-1.572l-.378-.237-3.925 1.038 1.055-3.851-.249-.393A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
                </svg>
                <span className="font-bold text-[#0D0D0D]">WhatsApp Business</span>
                <span className="text-[10px] font-semibold bg-[#F0FDF4] text-[#166534] px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Available
                </span>
              </div>
              <p className="text-xs text-[#999] mb-3">
                Connect your Meta Business API to receive and reply to customer messages directly inside My Space.
              </p>
              <ul className="space-y-1">
                {[
                  'Customer messages in real time',
                  'Reply without leaving My Space',
                  'Thread view per customer',
                  '250 conversations/day (1,000 when verified)',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#444]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 pt-0.5">
              {onGoToMessages ? (
                <button
                  onClick={onGoToMessages}
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#25D366] text-[#25D366] hover:bg-[#F0FDF4] transition-colors">
                  Set up →
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
