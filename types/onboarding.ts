export type Persona = 'tutor' | 'trainer' | 'baker' | 'photographer' | 'salon' | 'chef' | 'doctor' | 'musician' | 'advocate' | 'retailer' | 'other'
export type Plan = 'grow' | 'thrive' | 'elevate'
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
  whatsappPublic?: boolean
  email?: string
  plan: Plan
  region: Region
}

export const PERSONA_LABELS: Record<Persona, string> = {
  tutor: 'Tutor', trainer: 'Fitness trainer', baker: 'Baker',
  photographer: 'Photographer', salon: 'Salon / stylist', chef: 'Home chef',
  doctor: 'Doctor', musician: 'Music teacher',
  advocate: 'Advocate', retailer: 'Retailer',
  other: 'Professional',
}

