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
