/**
 * Shared types for the Drafting Studio editor layer.
 */

// ── Proofreading ──────────────────────────────────────────────────────────────

export type ProofreadSeverity = 'error' | 'warning' | 'info'
export type ProofreadType     = 'defined_term' | 'passive' | 'ambiguity' | 'tone' | 'grammar' | 'consistency'

export interface ProofreadFinding {
  id:         string
  type:       ProofreadType
  /** Exact verbatim text from the document — used for text-range matching */
  excerpt:    string
  message:    string
  suggestion: string
  severity:   ProofreadSeverity
}

// ── Citations ─────────────────────────────────────────────────────────────────

export type CitationStatus = 'verified' | 'unverifiable' | 'incorrect' | 'fabricated'

export interface Citation {
  id:        string
  /** Exact verbatim text from the document — used for text-range matching */
  excerpt:   string
  status:    CitationStatus
  corrected: string | null
  source:    string
}

// ── Clause library ────────────────────────────────────────────────────────────

export interface Clause {
  id:         string
  provider_id: string | null
  persona:    string
  category:   string
  title:      string
  body:       string
  tags:       string[]
  is_system:  boolean
}

// ── Clause suggestion (from AI) ───────────────────────────────────────────────

export interface ClauseSuggestion {
  category: string
  title:    string
  reason:   string
}

// ── Clinical / Working Studio types ──────────────────────────────────────────

export type ClinicalSeverity = 'critical' | 'caution' | 'suggestion'
export type ClinicalFindingType = 'missing_element' | 'incomplete_assessment' | 'unaddressed_goal' | 'inconsistency' | 'medico_legal_risk' | 'red_flag'

export interface ClinicalFinding {
  id:         string
  type:       ClinicalFindingType
  /** Exact verbatim text from the document (empty string if about a missing element) */
  excerpt:    string
  message:    string
  suggestion: string
  severity:   ClinicalSeverity
}

export interface Exercise {
  id:               string
  provider_id:      string | null
  persona:          string
  category:         string
  name:             string
  description:      string
  instructions:     string
  default_sets:     number
  default_reps:     number | null
  default_hold:     number | null
  default_duration: string | null
  media_url:        string | null
  is_system:        boolean
  tags:             string[]
}

export interface ExerciseSuggestion {
  category: string
  name:     string
  reason:   string
}

export interface HepExerciseEntry {
  exercise_id?: string
  name:         string
  sets:         number
  reps?:        number
  hold?:        number
  duration?:    string
  frequency:    string
  cues:         string
  image_url?:   string
}

export interface OutcomeMeasure {
  id:            string
  provider_id:   string
  student_id:    string
  measure_type:  string
  value:         Record<string, unknown>
  score:         number | null
  unit:          string | null
  notes:         string | null
  recorded_date: string
  created_at:    string
}
