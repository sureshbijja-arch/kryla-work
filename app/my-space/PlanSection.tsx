import { PLANS, PLAN_ORDER } from '@/config/plans'

interface Props {
  currentPlan: string
  region: 'india' | 'usa'
  onGoToMessages?: () => void
}

export default function PlanSection({ currentPlan, region, onGoToMessages }: Props) {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan as 'grow' | 'thrive' | 'elevate')

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-5">My Plan</p>

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const planIdx    = PLAN_ORDER.indexOf(plan.id)
          const isCurrent  = plan.id === currentPlan
          const isUpgrade  = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx
          const isElevate  = plan.id === 'elevate'

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
                    {!isElevate && (
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
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#bbb] cursor-default">
                      Your plan
                    </button>
                  ) : isElevate ? (
                    <a
                      href="mailto:hello@kryla.work"
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-colors">
                      Get a quote →
                    </a>
                  ) : (
                    <div className="text-right">
                      <button
                        disabled
                        title="Payments coming soon"
                        className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#999] cursor-not-allowed hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors">
                        {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : ''}
                      </button>
                      <p className="text-[10px] text-[#bbb] mt-1">Coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-[#bbb] mt-6">
        Plan changes will be available once payments are set up.
      </p>

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
