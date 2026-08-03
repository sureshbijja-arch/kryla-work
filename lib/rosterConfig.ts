/**
 * lib/rosterConfig.ts — types + validation for personas.roster_config jsonb.
 *
 * Pure (no Supabase import, no 'react' cache) so it can be unit-tested
 * directly and imported from both server code (lib/personas.ts's
 * getRosterConfig) and 'use client' components (PersonaTab's fallback
 * constant) without pulling supabaseAdmin into the client bundle. Mirrors
 * lib/orderConfig.ts's structure exactly.
 *
 * Replaces the hardcoded ROSTER_COPY map that used to live in
 * app/[slug]/personaConfig.ts — that map covered only 28 of 46 personas
 * (advocate/physio/allied-health/distributor/agency families), so every
 * other persona (including sellganeshidols) silently fell back to
 * TUTOR_ROSTER's "student" vocabulary in the Clients tab.
 */

export interface RosterCopy {
  /** singular: "student" / "client" / "customer" */
  singular:              string
  /** plural: "students" / "clients" / "customers" */
  plural:                string
  /** tab label in MyKryla nav */
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

/** Generic fallback for any persona with no roster_config row — preserves
 * today's tutor-shaped copy exactly, so a persona nobody has seeded yet (or
 * a DB error) never regresses to a blank/broken roster tab. This is the one
 * source of truth for that fallback; PersonaTab imports it directly rather
 * than keeping its own duplicate copy in sync. */
export const DEFAULT_ROSTER_CONFIG: RosterCopy = {
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

const REQUIRED_STRING_FIELDS: (keyof RosterCopy)[] = [
  'singular', 'plural', 'tabLabel', 'emoji', 'emptyHeading', 'emptySubtext',
  'addLabel', 'lessonsBtnLabel', 'logTitle', 'topicLabel', 'topicPlaceholder',
  'homeworkLabel', 'homeworkPlaceholder', 'notesPlaceholder', 'nextLabel',
  'nextPlaceholder', 'historyLabel', 'sessionNoun', 'contactSectionLabel',
  'contactRowLabel', 'quickLogLabel', 'removeConfirm',
]

/** Validates one roster_config jsonb blob. Returns null on any structural
 * mismatch — callers fall back to DEFAULT_ROSTER_CONFIG, never a partial or
 * `any`-typed shape. Filter, don't just cast — roster_config is DB-editable
 * jsonb, not compiler-checked, so a malformed row (missing field, wrong
 * type) is dropped here rather than reaching the roster tab as broken copy
 * (same discipline as parseOrderConfig / isMykrylaToolCard). */
export function parseRosterConfig(raw: unknown): RosterCopy | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof o[field] !== 'string') return null
  }
  return Object.fromEntries(
    REQUIRED_STRING_FIELDS.map(field => [field, o[field] as string])
  ) as unknown as RosterCopy
}
