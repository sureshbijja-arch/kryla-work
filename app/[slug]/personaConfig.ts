export const PERSONA_CONFIG = {
  baker: {
    tabLabel:          'Orders',
    heroCtaTarget:     '#menu',
    servicesLabel:     'Our Menu',
    bioLabel:          'Our Story',
    highlightsLabel:   'Why Choose Us',
    contactLabel:      'General Enquiries',
    contactVariant:    'enquiry' as const,
    serviceCardAction: 'order'  as const,
    orderLabel:        'Order',
    hasQuantity:       true,
    hasNotes:          true,
    hasCustomOrder:    true,
    leadTimeNotice:    'Custom orders need at least 2–3 days notice',
  },
  chef: {
    tabLabel:          'Enquiries',
    heroCtaTarget:     '#menu',
    servicesLabel:     'Our Menu & Plans',
    bioLabel:          'About the Chef',
    highlightsLabel:   'Our Specialties',
    contactLabel:      'Get in Touch',
    contactVariant:    'enquiry' as const,
    serviceCardAction: 'order'  as const,
    orderLabel:        'Enquire',
    hasQuantity:       false,
    hasNotes:          true,
    hasCustomOrder:    true,
    leadTimeNotice:    null,
  },
  salon: {
    tabLabel:          'Appointments',
    heroCtaTarget:     '#book',
    servicesLabel:     'Services & Pricing',
    bioLabel:          'About Us',
    highlightsLabel:   'Why Choose Us',
    contactLabel:      'Book an Appointment',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Book',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  doctor: {
    tabLabel:          'Appointments',
    heroCtaTarget:     '#book',
    servicesLabel:     'Consultations & Treatments',
    bioLabel:          'About Dr.',
    highlightsLabel:   'Our Approach',
    contactLabel:      'Book a Consultation',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Book',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  tutor: {
    tabLabel:          'Sessions',
    heroCtaTarget:     '#book',
    servicesLabel:     'Programs',
    bioLabel:          'Meet Your Tutor',
    highlightsLabel:   'Why Learn With Me',
    contactLabel:      'Book a Free Demo Class',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Book Demo',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  trainer: {
    tabLabel:          'Sessions',
    heroCtaTarget:     '#book',
    servicesLabel:     'Training Programs',
    bioLabel:          'My Journey',
    highlightsLabel:   'Why Train With Me',
    contactLabel:      'Book a Free Consultation',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Enquire',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  photographer: {
    tabLabel:          'Enquiries',
    heroCtaTarget:     '#portfolio',
    servicesLabel:     'Packages',
    bioLabel:          'My Story',
    highlightsLabel:   'My Style',
    contactLabel:      'Check My Availability',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Enquire',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  musician: {
    tabLabel:          'Enquiries',
    heroCtaTarget:     '#book',
    servicesLabel:     'I Perform At',
    bioLabel:          'About Me',
    highlightsLabel:   'Why Hire Me',
    contactLabel:      'Book Me for Your Event',
    contactVariant:    'both' as const,
    serviceCardAction: 'enquire' as const,
    orderLabel:        'Enquire',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  advocate: {
    tabLabel:          'Consultations',
    heroCtaTarget:     '#book',
    servicesLabel:     'Practice Areas',
    bioLabel:          'About the Advocate',
    highlightsLabel:   'Why Work With Me',
    contactLabel:      'Book a Consultation',
    contactVariant:    'both' as const,
    serviceCardAction: 'book' as const,
    orderLabel:        'Book Consultation',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
  other: {
    tabLabel:          'Inquiries',
    heroCtaTarget:     '#book',
    servicesLabel:     'What I Offer',
    bioLabel:          'About Me',
    highlightsLabel:   'Why Choose Me',
    contactLabel:      'Get in Touch',
    contactVariant:    'both' as const,
    serviceCardAction: 'none' as const,
    orderLabel:        'Get in Touch',
    hasQuantity:       false,
    hasNotes:          false,
    hasCustomOrder:    false,
    leadTimeNotice:    null,
  },
} as const

export type PersonaKey = keyof typeof PERSONA_CONFIG

export function getPersonaConfig(persona: string) {
  return PERSONA_CONFIG[(persona as PersonaKey)] ?? PERSONA_CONFIG.other
}

// ── Roster copy per persona ───────────────────────────────────────────────────
// Used by PersonaTab and SpaceClient to render persona-appropriate labels.
// Tutor is the default / reference; advocate overrides for legal language.

export interface RosterCopy {
  /** singular: "student" / "client" */
  singular:              string
  /** plural: "students" / "clients" */
  plural:                string
  /** tab label in My Chat nav */
  tabLabel:              string
  /** emoji for empty state */
  emoji:                 string
  /** empty-state heading */
  emptyHeading:          string
  /** empty-state subtext */
  emptySubtext:          string
  /** "+ Add …" button label */
  addLabel:              string
  /** Lessons / Matters expand button */
  lessonsBtnLabel:       string
  /** "Log a lesson" / "Log a consultation" section heading */
  logTitle:              string
  /** "Topic" input label */
  topicLabel:            string
  /** Topic input placeholder */
  topicPlaceholder:      string
  /** "Homework" / "Action items" input label */
  homeworkLabel:         string
  /** Homework input placeholder */
  homeworkPlaceholder:   string
  /** Notes input placeholder */
  notesPlaceholder:      string
  /** "Next session" / "Next hearing" label */
  nextLabel:             string
  /** Next session input placeholder */
  nextPlaceholder:       string
  /** "History" section label */
  historyLabel:          string
  /** session noun in count badge: "session" / "consultation" */
  sessionNoun:           string
  /** "Parent / guardian" section heading in modal */
  contactSectionLabel:   string
  /** "Parent" row label in card */
  contactRowLabel:       string
  /** "Quick log" button label */
  quickLogLabel:         string
  /** "Remove" confirm text */
  removeConfirm:         string
}

const TUTOR_ROSTER: RosterCopy = {
  singular:            'student',
  plural:              'students',
  tabLabel:            'Students',
  emoji:               '🎓',
  emptyHeading:        'No students yet',
  emptySubtext:        'Students appear here automatically when you accept a booking.',
  addLabel:            '+ Add student',
  lessonsBtnLabel:     '📚 Lessons',
  logTitle:            'Log a lesson',
  topicLabel:          'Topic',
  topicPlaceholder:    'e.g. Quadratic equations',
  homeworkLabel:       'Homework',
  homeworkPlaceholder: 'Homework assigned (e.g. Practice problems p.42)',
  notesPlaceholder:    'Private notes (not shared with parent)',
  nextLabel:           'Next session',
  nextPlaceholder:     'e.g. Saturday 10 AM',
  historyLabel:        'History',
  sessionNoun:         'session',
  contactSectionLabel: 'Parent / guardian (optional)',
  contactRowLabel:     'Parent',
  quickLogLabel:       '✓ Quick log',
  removeConfirm:       'Remove this student?',
}

const ADVOCATE_ROSTER: RosterCopy = {
  singular:            'client',
  plural:              'clients',
  tabLabel:            'Clients',
  emoji:               '⚖️',
  emptyHeading:        'No clients yet',
  emptySubtext:        'Clients appear here when you add them or accept a booking.',
  addLabel:            '+ Add client',
  lessonsBtnLabel:     '🗂 Matters',
  logTitle:            'Log a consultation',
  topicLabel:          'Matter',
  topicPlaceholder:    'e.g. Property dispute — first hearing',
  homeworkLabel:       'Action items',
  homeworkPlaceholder: 'Next steps / action items (e.g. Collect title documents)',
  notesPlaceholder:    'Private case notes (not shared with client)',
  nextLabel:           'Next hearing / meeting',
  nextPlaceholder:     'e.g. Friday 11 AM, District Court',
  historyLabel:        'Matter history',
  sessionNoun:         'consultation',
  contactSectionLabel: 'Primary contact (optional)',
  contactRowLabel:     'Contact',
  quickLogLabel:       '✓ Quick log',
  removeConfirm:       'Remove this client?',
}

const ROSTER_COPY: Record<string, RosterCopy> = {
  tutor:    TUTOR_ROSTER,
  advocate: ADVOCATE_ROSTER,
}

/** Returns persona-appropriate roster copy; falls back to tutor defaults for all other personas. */
export function getRosterConfig(persona: string): RosterCopy {
  return ROSTER_COPY[persona] ?? TUTOR_ROSTER
}
