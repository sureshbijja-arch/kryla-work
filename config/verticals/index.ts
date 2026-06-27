/**
 * Vertical Config Engine — the key architectural insight from CLAUDE.md
 *
 * One codebase. A JSON config per persona activates the right features,
 * sections, templates, and onboarding questions.
 * Never maintain separate codebases per vertical.
 */

export interface VerticalConfig {
  id: string
  label: string                    // "Home Tuition Teacher"
  emoji: string
  onboardingQuestions: OnboardingQuestion[]
  defaultTemplate: "focus" | "portfolio" | "clinic" | "storefront" | "premium"
  defaultPalette: string
  defaultFont: "inter" | "georgia" | "trebuchet"
  sections: string[]               // which page sections to show
  bookingLabel: string             // "Book a session" | "Place an order" | "Book appointment"
  ctaLabel: string                 // "WhatsApp me" | "Get in touch"
  phase: 1 | 2 | 3 | 4            // launch phase from CLAUDE.md
}

export interface OnboardingQuestion {
  id: string
  question: string
  placeholder: string
  hint?: string
}

// ── Phase 1 — Validate ────────────────────────────────────────

const tutor: VerticalConfig = {
  id: "tutor",
  label: "Home Tuition Teacher",
  emoji: "📚",
  phase: 1,
  defaultTemplate: "focus",
  defaultPalette: "professional",
  defaultFont: "inter",
  bookingLabel: "Book a session",
  ctaLabel: "WhatsApp me",
  sections: ["about", "services", "highlights", "booking", "contact"],
  onboardingQuestions: [
    {
      id: "subjects",
      question: "What subjects or grades do you teach?",
      placeholder: "e.g. Maths and Science, Grades 6–10",
    },
    {
      id: "experience",
      question: "How long have you been teaching?",
      placeholder: "e.g. 8 years",
    },
    {
      id: "approach",
      question: "How would you describe your teaching style?",
      placeholder: "e.g. Patient, concept-first, lots of practice problems",
      hint: "This goes on your profile — say it in your own words.",
    },
    {
      id: "location",
      question: "Where do you teach? (area or city)",
      placeholder: "e.g. Celina TX, or online",
    },
    {
      id: "pricing",
      question: "What's your session rate? (optional — you can add this later)",
      placeholder: "e.g. $40/hour or ₹500/hour",
    },
  ],
}

const trainer: VerticalConfig = {
  id: "trainer",
  label: "Independent Fitness Trainer",
  emoji: "💪",
  phase: 1,
  defaultTemplate: "focus",
  defaultPalette: "fresh",
  defaultFont: "inter",
  bookingLabel: "Book a session",
  ctaLabel: "WhatsApp me",
  sections: ["about", "services", "highlights", "booking", "contact"],
  onboardingQuestions: [
    {
      id: "speciality",
      question: "What type of training do you offer?",
      placeholder: "e.g. Weight loss, strength, HIIT, yoga",
    },
    {
      id: "experience",
      question: "How long have you been training clients?",
      placeholder: "e.g. 5 years",
    },
    {
      id: "approach",
      question: "What makes your training different?",
      placeholder: "e.g. I focus on form first and real-life movement",
    },
    {
      id: "location",
      question: "Where do you train? (gym, home visits, online?)",
      placeholder: "e.g. Your home in Celina TX, or online",
    },
    {
      id: "pricing",
      question: "What's your session rate? (optional)",
      placeholder: "e.g. $60/session",
    },
  ],
}

const baker: VerticalConfig = {
  id: "baker",
  label: "Home Baker",
  emoji: "🎂",
  phase: 1,
  defaultTemplate: "portfolio",
  defaultPalette: "warm",
  defaultFont: "georgia",
  bookingLabel: "Place an order",
  ctaLabel: "WhatsApp me",
  sections: ["about", "services", "gallery", "highlights", "contact"],
  onboardingQuestions: [
    {
      id: "speciality",
      question: "What do you bake? Tell us your specialities.",
      placeholder: "e.g. Custom cakes, cupcakes, cookies — especially themed birthday cakes",
    },
    {
      id: "experience",
      question: "How long have you been baking for customers?",
      placeholder: "e.g. 3 years",
    },
    {
      id: "approach",
      question: "What do customers love most about your baking?",
      placeholder: "e.g. I use real butter, no shortcuts, and every order is custom",
    },
    {
      id: "location",
      question: "Where are you based? Do you deliver?",
      placeholder: "e.g. Celina TX — pickup or delivery within 15 miles",
    },
    {
      id: "pricing",
      question: "What's your starting price for a custom cake? (optional)",
      placeholder: "e.g. Custom cakes from $80",
    },
  ],
}

const photographer: VerticalConfig = {
  id: "photographer",
  label: "Freelance Photographer",
  emoji: "📷",
  phase: 1,
  defaultTemplate: "portfolio",
  defaultPalette: "minimal",
  defaultFont: "inter",
  bookingLabel: "Book a shoot",
  ctaLabel: "WhatsApp me",
  sections: ["about", "services", "gallery", "highlights", "booking", "contact"],
  onboardingQuestions: [
    {
      id: "speciality",
      question: "What kind of photography do you do?",
      placeholder: "e.g. Weddings, family portraits, events, headshots",
    },
    {
      id: "experience",
      question: "How long have you been shooting professionally?",
      placeholder: "e.g. 6 years",
    },
    {
      id: "approach",
      question: "How would your clients describe your style?",
      placeholder: "e.g. Candid, natural light, storytelling",
    },
    {
      id: "location",
      question: "Where are you based? How far do you travel?",
      placeholder: "e.g. Celina TX — available across DFW",
    },
    {
      id: "pricing",
      question: "What's your starting package price? (optional)",
      placeholder: "e.g. Portrait sessions from $250",
    },
  ],
}

// ── Registry ──────────────────────────────────────────────────

export const VERTICALS: Record<string, VerticalConfig> = {
  tutor,
  trainer,
  baker,
  photographer,
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
