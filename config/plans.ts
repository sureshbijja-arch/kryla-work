/**
 * config/plans.ts — Single source of truth for Kryla plan definitions.
 *
 * All pricing, feature copy, and plan metadata lives here.
 * Onboarding, landing page, and My Space all import from this file.
 */

export type PlanId = 'grow' | 'thrive' | 'elevate'

export interface PlanDef {
  id: PlanId
  name: string
  emoji: string
  tagline: string
  /** Price string (e.g. "$9/mo"). Absent on quote-based plans. */
  usaPrice?: string
  indiaPrice?: string
  features: string[]
  popular?: boolean
}

export const PLANS: PlanDef[] = [
  {
    id: 'grow',
    name: 'Grow',
    emoji: '🌳',
    tagline: 'Get online & take bookings.',
    usaPrice: '$9/mo',
    indiaPrice: '₹299/mo',
    features: [
      'Public profile page',
      'Booking form on your page',
      'WhatsApp alert on new bookings',
      'Upload profile photo & gallery',
      'Analytics — see who\'s visiting',
    ],
  },
  {
    id: 'thrive',
    name: 'Thrive',
    emoji: '🚀',
    tagline: 'Everything to grow your business.',
    usaPrice: '$19/mo',
    indiaPrice: '₹599/mo',
    popular: true,
    features: [
      'Everything in Grow',
      'Your own custom domain (priya.com)',
      'Update your page via WhatsApp',
      'Scrolling ads on your page',
      'Review collection',
      'Online payments on your page',
      'Team access & branded email',
    ],
  },
  {
    id: 'elevate',
    name: 'Elevate',
    emoji: '⚡',
    tagline: 'Built for you.',
    // No usaPrice / indiaPrice — quote-based, contact Kryla
    features: [
      'Everything in Thrive',
      'Custom changes built for your business',
    ],
  },
]

export const PLAN_ORDER: PlanId[] = ['grow', 'thrive', 'elevate']
