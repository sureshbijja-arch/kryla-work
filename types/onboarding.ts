export type Persona =
  | 'tutor' | 'trainer' | 'baker' | 'photographer' | 'salon' | 'chef'
  | 'doctor' | 'musician' | 'advocate' | 'physio' | 'retailer' | 'other'
  // Healthcare expansion (studio-enabled)
  | 'occtherapist' | 'speech' | 'chiro'
  | 'counselor'
  | 'homeopath' | 'ayurveda'
  | 'homenurse' | 'postnatal' | 'lactation'
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
  photographer: 'Photographer', salon: 'Salon / stylist', chef: 'Chef',
  doctor: 'Doctor', musician: 'Music teacher',
  advocate: 'Advocate', physio: 'Physiotherapist', retailer: 'Retailer',
  other: 'Professional',
  // Healthcare expansion
  occtherapist: 'Occupational Therapist',
  speech:       'Speech Therapist',
  chiro:        'Chiropractor / Osteopath',
  counselor:    'Therapist / Counselor',
  homeopath:    'Homeopath',
  ayurveda:     'Ayurveda Practitioner',
  homenurse:    'Home Nurse / Caregiver',
  postnatal:    'Postnatal Care Specialist',
  lactation:    'Lactation Consultant',
}

