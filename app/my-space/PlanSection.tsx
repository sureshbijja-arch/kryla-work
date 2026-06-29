interface Props {
  currentPlan: string
  region: 'india' | 'usa'
}

const PLANS = [
  {
    id: 'seed',
    name: 'Seed',
    icon: '🌱',
    price: { india: 'Free', usa: 'Free' },
    tagline: 'Your presence online, yours to keep.',
    features: [
      'Public profile page',
      'Bio, services & FAQ',
      'WhatsApp contact button',
      'Google Maps directions on your location',
    ],
  },
  {
    id: 'sprout',
    name: 'Sprout',
    icon: '🌿',
    price: { india: '₹299/mo', usa: '$5/mo' },
    tagline: 'Bookings and real-time alerts.',
    features: [
      'Everything in Seed',
      'Booking form on your page',
      'WhatsApp alert on new bookings',
    ],
  },
  {
    id: 'grow',
    name: 'Grow',
    icon: '🌳',
    price: { india: '₹799/mo', usa: '$12/mo' },
    tagline: 'Your own address on the internet.',
    features: [
      'Everything in Sprout',
      'Upload profile photo & gallery',
      'Your own domain (priya.com)',
      'Analytics — see who\'s visiting',
    ],
  },
  {
    id: 'thrive',
    name: 'Thrive',
    icon: '🚀',
    price: { india: '₹1,999/mo', usa: '$25/mo' },
    tagline: 'Your spot runs itself.',
    features: [
      'Everything in Grow',
      'Post scrolling ads on your page',
      'Update your page via WhatsApp',
      'Review collection',
    ],
  },
  {
    id: 'elevate',
    name: 'Elevate',
    icon: '⚡',
    price: { india: '₹3,999/mo', usa: '$45/mo' },
    tagline: 'Built to scale.',
    features: [
      'Everything in Thrive',
      'Online payments on your page',
      'Team access & branded email',
    ],
  },
]

const PLAN_ORDER = ['seed', 'sprout', 'grow', 'thrive', 'elevate']

export default function PlanSection({ currentPlan, region }: Props) {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan)

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-5">My Plan</p>

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const planIdx  = PLAN_ORDER.indexOf(plan.id)
          const isCurrent  = plan.id === currentPlan
          const isUpgrade  = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx

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
                    <span className="text-lg">{plan.icon}</span>
                    <span className="font-bold text-[#0D0D0D]">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold bg-[#0D0D0D] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Current
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[#666]">
                      {plan.price[region]}
                    </span>
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
                  ) : (
                    <div className="text-right">
                      <button
                        disabled
                        title="Payments coming soon"
                        className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#999] cursor-not-allowed hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors">
                        {isUpgrade ? 'Upgrade' : 'Downgrade'}
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
    </div>
  )
}
