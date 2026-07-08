/**
 * Vertical Config Engine — single source of truth for all personas.
 *
 * To add a new persona: add one entry here. It automatically appears
 * in the onboarding grid, template mapping, and palette mapping.
 * No other files need to change for built-in personas.
 */

export interface VerticalConfig {
  id: string
  label: string
  emoji: string
  onboardingQuestions: OnboardingQuestion[]
  defaultTemplate: 'focus' | 'portfolio' | 'clinic' | 'storefront'
  defaultPalette: string
  defaultFont: 'inter' | 'georgia' | 'trebuchet'
  sections: string[]
  bookingLabel: string
  ctaLabel: string
  phase: 1 | 2 | 3 | 4
  /** Optional persona-specific guidance injected into the My Chat system prompt */
  chatGuidance?: string
  /** Optional persona-specific guidance injected into the Research co-pilot system prompt */
  researchGuidance?: string
}

export interface OnboardingQuestion {
  id: string
  question: string
  placeholder: string
  hint?: string
}

// ── Phase 1 — Validate ────────────────────────────────────────

const tutor: VerticalConfig = {
  id: 'tutor',
  label: 'Tutor',
  emoji: '📚',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'subjects',    question: 'What subjects or grades do you teach?',        placeholder: 'e.g. Maths and Science, Grades 6–10' },
    { id: 'experience',  question: 'How long have you been teaching?',             placeholder: 'e.g. 8 years' },
    { id: 'approach',    question: 'How would you describe your teaching style?',  placeholder: 'e.g. Patient, concept-first, lots of practice problems', hint: 'This goes on your profile — say it in your own words.' },
    { id: 'location',    question: 'Where do you teach? (area or city)',           placeholder: 'e.g. Celina TX, or online' },
    { id: 'pricing',     question: "What's your session rate? (optional)",         placeholder: 'e.g. $40/hour or ₹500/hour' },
  ],
  chatGuidance: `PERSONA: TUTOR
Speak in tutor language: say "students", "sessions", "lessons", "subjects", "grades" — never "clients", "customers", or "appointments".

You have access to the student roster in businessContext.students. You can act on it directly:
- new_student: Add a new student by name, optionally with grade (label_1) and subject (label_2)
- log_session: Log a completed lesson for a student (by studentId). Include topic covered, homework assigned, and any private notes.
- patch_student: Update a student's details — next_session, grade, subject, or private notes.

When matching a student by name: scan businessContext.students and pick the closest match. If ambiguous, list matches and ask. Always confirm the student name in your reply before acting (e.g. "Logged a session for Aryan · Grade 8 · Maths ✓").

Proactively offer to log a session when the tutor mentions finishing a lesson. When a demo student books, offer to set their next_session.

Remind the tutor they can view the full lesson history by opening the Students tab.`,
  researchGuidance: `You are a full teaching co-pilot AND a business advisor.

TEACHING (do these directly — no web search needed unless the question specifically asks for current curriculum/exam info):
- Solve maths, science, language, and other subject problems step by step, showing all working
- Generate practice questions, worksheets, or quiz sets (ask for grade/topic if not specified)
- Explain concepts clearly, adapting language to the grade level
- Draft lesson plans, topic breakdowns, or revision schedules
- Suggest teaching strategies, mnemonics, or analogies for tricky topics
- Help write feedback comments for student work

BUSINESS (search for these to ground your answer in real data):
- Local tutoring rates and pricing strategy for their area
- Marketing ideas: local parents, schools, social media, referrals
- In-demand subjects or grades in their location
- Competitor analysis and differentiation
- How to upsell or package services (group sessions, holiday crash courses, etc.)`,
}

const trainer: VerticalConfig = {
  id: 'trainer',
  label: 'Fitness trainer',
  emoji: '💪',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'fresh',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What type of training do you offer?',         placeholder: 'e.g. Weight loss, strength, HIIT, yoga' },
    { id: 'experience',  question: 'How long have you been training clients?',     placeholder: 'e.g. 5 years' },
    { id: 'approach',    question: 'What makes your training different?',          placeholder: 'e.g. I focus on form first and real-life movement' },
    { id: 'location',    question: 'Where do you train? (gym, home visits, online?)', placeholder: 'e.g. Your home in Celina TX, or online' },
    { id: 'pricing',     question: "What's your session rate? (optional)",         placeholder: 'e.g. $60/session' },
  ],
}

const baker: VerticalConfig = {
  id: 'baker',
  label: 'Baker',
  emoji: '🧁',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'warm',
  defaultFont: 'georgia',
  bookingLabel: 'Place an order',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What do you bake? Tell us your specialities.',     placeholder: 'e.g. Custom cakes, cupcakes, cookies' },
    { id: 'experience',  question: 'How long have you been baking for customers?',     placeholder: 'e.g. 3 years' },
    { id: 'approach',    question: 'What do customers love most about your baking?',   placeholder: 'e.g. I use real butter, no shortcuts, and every order is custom' },
    { id: 'location',    question: 'Where are you based? Do you deliver?',             placeholder: 'e.g. Celina TX — pickup or delivery within 15 miles' },
    { id: 'pricing',     question: "What's your starting price? (optional)",           placeholder: 'e.g. Custom cakes from $80' },
  ],
}

const photographer: VerticalConfig = {
  id: 'photographer',
  label: 'Photographer',
  emoji: '📷',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'minimal',
  defaultFont: 'inter',
  bookingLabel: 'Book a shoot',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What kind of photography do you do?',          placeholder: 'e.g. Weddings, family portraits, events, headshots' },
    { id: 'experience',  question: 'How long have you been shooting professionally?', placeholder: 'e.g. 6 years' },
    { id: 'approach',    question: "How would your clients describe your style?",   placeholder: 'e.g. Candid, natural light, storytelling' },
    { id: 'location',    question: 'Where are you based? How far do you travel?',  placeholder: 'e.g. Celina TX — available across DFW' },
    { id: 'pricing',     question: "What's your starting package price? (optional)", placeholder: 'e.g. Portrait sessions from $250' },
  ],
}

const salon: VerticalConfig = {
  id: 'salon',
  label: 'Salon / stylist',
  emoji: '✂️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Book an appointment',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What services do you offer?',                  placeholder: 'e.g. Haircuts, colour, blowouts, bridal styling' },
    { id: 'experience',  question: 'How long have you been in the industry?',      placeholder: 'e.g. 7 years' },
    { id: 'approach',    question: 'What do clients love about coming to you?',    placeholder: 'e.g. I listen before I cut — no surprises' },
    { id: 'location',    question: 'Where is your salon / where do you work?',     placeholder: 'e.g. Celina TX, or mobile' },
    { id: 'pricing',     question: "What's your starting price? (optional)",       placeholder: 'e.g. Haircuts from $45' },
  ],
}

const chef: VerticalConfig = {
  id: 'chef',
  label: 'Chef',
  emoji: '🍱',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'georgia',
  bookingLabel: 'Place an order',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What cuisine or dishes do you specialise in?', placeholder: 'e.g. South Indian tiffins, biriyani, meal preps' },
    { id: 'experience',  question: 'How long have you been cooking for customers?', placeholder: 'e.g. 4 years' },
    { id: 'approach',    question: 'What makes your food stand out?',              placeholder: 'e.g. Fresh ingredients, home-style recipes, no preservatives' },
    { id: 'location',    question: 'Where are you based? Do you deliver?',         placeholder: 'e.g. Celina TX — delivery within 10 miles' },
    { id: 'pricing',     question: "What's your starting price? (optional)",       placeholder: 'e.g. Meal preps from $12/portion' },
  ],
}

const doctor: VerticalConfig = {
  id: 'doctor',
  label: 'Doctor',
  emoji: '🩺',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book an appointment',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What is your speciality or practice area?',    placeholder: 'e.g. General physician, dermatologist, paediatrician' },
    { id: 'experience',  question: 'How many years have you been in practice?',    placeholder: 'e.g. 12 years' },
    { id: 'approach',    question: 'How would your patients describe your care?',  placeholder: 'e.g. Thorough, patient, takes time to explain' },
    { id: 'location',    question: 'Where is your clinic?',                        placeholder: 'e.g. Celina TX' },
    { id: 'pricing',     question: 'What is your consultation fee? (optional)',    placeholder: 'e.g. ₹500 per visit' },
  ],
}

const musician: VerticalConfig = {
  id: 'musician',
  label: 'Music teacher',
  emoji: '🎵',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Book a lesson',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What instrument or style do you teach?',       placeholder: 'e.g. Carnatic vocals, guitar, piano' },
    { id: 'experience',  question: 'How long have you been teaching?',             placeholder: 'e.g. 10 years' },
    { id: 'approach',    question: 'How do you make learning enjoyable?',          placeholder: 'e.g. I blend theory with songs students already love' },
    { id: 'location',    question: 'Where do you teach? (in-person or online?)',   placeholder: 'e.g. Celina TX, or online' },
    { id: 'pricing',     question: "What's your lesson rate? (optional)",          placeholder: 'e.g. $35/hour' },
  ],
}

const advocate: VerticalConfig = {
  id: 'advocate',
  label: 'Advocate',
  emoji: '⚖️',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What areas of law do you practise?',           placeholder: 'e.g. Family law, property disputes, criminal defence' },
    { id: 'experience',  question: 'How many years have you been practising?',     placeholder: 'e.g. 8 years' },
    { id: 'approach',    question: 'How do you support your clients?',             placeholder: 'e.g. Clear communication, transparent fees, no jargon' },
    { id: 'location',    question: 'Where are you based?',                         placeholder: 'e.g. Chennai, or available online' },
    { id: 'pricing',     question: 'What is your consultation fee? (optional)',    placeholder: 'e.g. ₹1,000 per hour' },
  ],
}

const retailer: VerticalConfig = {
  id: 'retailer',
  label: 'Retailer',
  emoji: '🛍️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Shop now',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What products do you sell?',                   placeholder: 'e.g. Handmade jewellery, ethnic wear, home décor' },
    { id: 'experience',  question: 'How long have you been running your store?',   placeholder: 'e.g. 3 years' },
    { id: 'approach',    question: 'What makes your products special?',            placeholder: 'e.g. Handcrafted, locally sourced, unique designs' },
    { id: 'location',    question: 'Where are you based? Do you ship?',            placeholder: 'e.g. Celina TX — ship across USA' },
    { id: 'pricing',     question: "What's your price range? (optional)",          placeholder: 'e.g. Products from $15' },
  ],
}

// "other" is a special catch-all — triggers the custom persona pipeline.
// Always keep it last so it appears at the end of the grid.
const other: VerticalConfig = {
  id: 'other',
  label: 'Something else',
  emoji: '✨',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Get in touch',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [],
}

// ── Registry ──────────────────────────────────────────────────
// ADD NEW PERSONAS HERE — they will automatically appear in the onboarding grid,
// template map, and palette map. No other files need to change.

export const VERTICALS: Record<string, VerticalConfig> = {
  tutor,
  trainer,
  baker,
  photographer,
  salon,
  chef,
  doctor,
  musician,
  advocate,
  retailer,
  other,
}

export function getVertical(id: string): VerticalConfig | undefined {
  return VERTICALS[id]
}

export function getAllVerticals(): VerticalConfig[] {
  return Object.values(VERTICALS)
}

export function getPhase1Verticals(): VerticalConfig[] {
  return getAllVerticals().filter((v) => v.phase === 1)
}
