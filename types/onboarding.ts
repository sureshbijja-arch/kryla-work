export type Persona = 'tutor' | 'trainer' | 'baker' | 'photographer' | 'salon' | 'chef' | 'doctor' | 'musician' | 'other'
export type Plan = 'seed' | 'sprout' | 'grow' | 'thrive' | 'elevate'
export type Region = 'usa' | 'india'

export interface OnboardingAnswers {
  persona: Persona
  firstName: string
  lastName: string
  tagline: string
  location: string
  slug: string
  whatsappCountryCode: string
  whatsappNumber: string
  plan: Plan
  region: Region
}

export const PERSONA_LABELS: Record<Persona, string> = {
  tutor: 'Tutor', trainer: 'Fitness trainer', baker: 'Baker',
  photographer: 'Photographer', salon: 'Salon / stylist', chef: 'Home chef',
  doctor: 'Doctor', musician: 'Music teacher', other: 'Professional',
}

export const PLAN_PRICES: Record<Region, Record<Plan, string>> = {
  usa:   { seed:'Free', sprout:'$5/mo',      grow:'$12/mo',     thrive:'$25/mo',    elevate:'$45/mo' },
  india: { seed:'Free', sprout:'₹299/mo',    grow:'₹799/mo',    thrive:'₹1,999/mo', elevate:'₹3,999/mo' },
}
