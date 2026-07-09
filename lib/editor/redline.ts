/**
 * Redline utilities — diff-based track-changes for the Drafting Studio.
 *
 * Given oldHtml and newHtml (from an AI refine/rewrite action), produces
 * HTML with <ins> and <del> marks that TipTap can render as inline decorations.
 * Accept all / reject all helpers strip the marks back to clean HTML.
 */

import { diffWords } from 'diff'

export interface RedlineOp {
  type: 'equal' | 'insert' | 'delete'
  value: string
}

// ── Strip HTML tags to plain text ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Compute word-level diff ───────────────────────────────────────────────────

export function computeRedlineOps(oldHtml: string, newHtml: string): RedlineOp[] {
  const oldText = stripHtml(oldHtml)
  const newText = stripHtml(newHtml)

  const changes = diffWords(oldText, newText)

  return changes.map(part => ({
    type: part.added ? 'insert' : part.removed ? 'delete' : 'equal',
    value: part.value,
  }))
}

// ── Build redline HTML from ops ───────────────────────────────────────────────
// Produces an HTML string with <ins class="redline-ins"> and <del class="redline-del">.
// Loaded directly into the TipTap editor.

export function buildRedlineHtml(ops: RedlineOp[]): string {
  const parts: string[] = []

  // Group ops into paragraph-sized chunks to maintain structure
  let buffer = ''
  for (const op of ops) {
    if (op.type === 'equal') {
      buffer += escapeHtml(op.value)
    } else if (op.type === 'insert') {
      buffer += `<ins class="redline-ins">${escapeHtml(op.value)}</ins>`
    } else {
      buffer += `<del class="redline-del">${escapeHtml(op.value)}</del>`
    }
  }

  // Wrap in paragraphs — split on double newlines (paragraph breaks)
  const paragraphs = buffer.split(/\n\n+/)
  for (const para of paragraphs) {
    const trimmed = para.replace(/\n/g, ' ').trim()
    if (trimmed) parts.push(`<p>${trimmed}</p>`)
  }

  return parts.length > 0 ? parts.join('\n') : `<p>${buffer}</p>`
}

// ── Accept all — keep insertions, remove deletions ────────────────────────────

export function acceptAllRedline(html: string): string {
  return html
    .replace(/<del[^>]*>[\s\S]*?<\/del>/g, '')       // remove deleted spans
    .replace(/<ins[^>]*>([\s\S]*?)<\/ins>/g, '$1')   // unwrap insertions
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Reject all — keep deletions, remove insertions ───────────────────────────

export function rejectAllRedline(html: string): string {
  return html
    .replace(/<ins[^>]*>[\s\S]*?<\/ins>/g, '')       // remove inserted spans
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/g, '$1')   // unwrap deletions
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Check whether the HTML contains any redline marks ────────────────────────

export function hasRedlineMarks(html: string): boolean {
  return /<ins\b|<del\b/.test(html)
}
