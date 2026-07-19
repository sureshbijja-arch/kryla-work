/**
 * lib/print/template.ts — Builds a complete, print-ready HTML document.
 *
 * Single source of truth for all four print surfaces:
 *   document   — drafted legal doc from Drafting Studio
 *   case-sheet — one-page client/matter summary
 *   consultation — single consultation record
 *   hearings   — upcoming hearing schedule list
 *
 * Both browser-print (/print/...) and PDF download (/api/print/.../pdf) consume
 * the exact same HTML, so paper / browser-PDF / server-PDF are pixel-consistent.
 *
 * Formatting mirrors lib/docx/export.ts: Times New Roman 12pt, 1.5 line spacing,
 * 1" top/bottom + 1.25" left/right margins (A4).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Letterhead {
  mode:            'full' | 'minimal' | 'none'
  firmName?:       string | null
  advocateName?:   string | null
  enrolmentNo?:    string | null
  barCouncil?:     string | null
  chamberAddress?: string | null
  phone?:          string | null
  email?:          string | null
  logoUrl?:        string | null
}

export interface ProviderMeta {
  first_name:      string
  last_name:       string
  location:        string | null
  whatsapp_number: string | null
  email:           string | null
}

export type PrintKind = 'document' | 'case-sheet' | 'consultation' | 'hearings'

export interface DocumentData {
  title:   string
  body:    string   // raw TipTap HTML
  docType: string
}

export interface CaseSheetData {
  client: {
    name:              string
    label_1:           string | null
    label_2:           string | null
    next_hearing_date: string | null
    next_hearing_note: string | null
    parent_name:       string | null
    parent_phone:      string | null
    parent_email:      string | null
    notes:             string | null
    sessions:          number
    created_at:        string
  }
  sessions: {
    session_date: string
    topic:        string | null
    homework:     string | null
    notes:        string | null
  }[]
}

export interface ConsultationData {
  clientName:  string
  sessionDate: string
  topic:       string | null
  homework:    string | null
  notes:       string | null
}

export interface HearingsData {
  hearings: {
    name:              string
    label_1:           string | null
    next_hearing_date: string
    next_hearing_note: string | null
    days:              number
  }[]
  asOf: string
}

export type PrintData = DocumentData | CaseSheetData | ConsultationData | HearingsData

export interface BuildPrintOptions {
  kind:      PrintKind
  letterhead: Letterhead | null
  provider:  ProviderMeta
  data:      PrintData
  autoprint?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Reject non-https or private-network URLs before Puppeteer can fetch them.
const PRIVATE_HOSTNAME = /^(localhost|.*\.local|0\.0\.0\.0|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc00:|fd[0-9a-f]{2}:)/i
function safeLogoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    if (PRIVATE_HOSTNAME.test(u.hostname)) return null
    return raw
  } catch {
    return null
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Letterhead ────────────────────────────────────────────────────────────────

function letterheadHtml(lh: Letterhead | null, p: ProviderMeta): string {
  const effectiveMode = lh?.mode ?? 'minimal'

  if (effectiveMode === 'none') return ''

  if (effectiveMode === 'minimal') {
    const contact = [p.whatsapp_number, p.email].filter(Boolean).join(' · ')
    return `
<header class="lh-minimal">
  <div class="lh-name">${esc(p.first_name)} ${esc(p.last_name)}</div>
  <div class="lh-title">Advocate${p.location ? ` | ${esc(p.location)}` : ''}</div>
  ${contact ? `<div class="lh-contact">${esc(contact)}</div>` : ''}
</header>
<div class="lh-rule"></div>`
  }

  // full
  const rows: string[] = []
  const logoUrl = safeLogoUrl(lh?.logoUrl)
  if (logoUrl) rows.push(`<img src="${esc(logoUrl)}" class="lh-logo" alt="Logo" />`)
  if (lh?.firmName) rows.push(`<div class="lh-firm">${esc(lh.firmName)}</div>`)
  const name = lh?.advocateName || `${p.first_name} ${p.last_name}`
  rows.push(`<div class="lh-name">${esc(name)}</div>`)
  const credentials: string[] = []
  if (lh?.enrolmentNo) credentials.push(`Enrol. No. ${lh.enrolmentNo}`)
  if (lh?.barCouncil)  credentials.push(lh.barCouncil)
  if (credentials.length) rows.push(`<div class="lh-title">${esc(credentials.join(' | '))}</div>`)
  if (lh?.chamberAddress) rows.push(`<div class="lh-contact">${esc(lh.chamberAddress)}</div>`)
  const contact = [lh?.phone || p.whatsapp_number, lh?.email || p.email].filter(Boolean)
  if (contact.length) rows.push(`<div class="lh-contact">${esc(contact.join(' · '))}</div>`)

  return `<header class="lh-full">${rows.join('\n')}</header><div class="lh-rule"></div>`
}

// ── Body per kind ─────────────────────────────────────────────────────────────

function documentBody(d: DocumentData): string {
  return `<h1 class="doc-title">${esc(d.title)}</h1>
<div class="doc-body">${d.body}</div>`
}

function caseSheetBody(d: CaseSheetData): string {
  const c = d.client
  const rows = [
    `<tr><td class="ct-l">Client</td><td>${esc(c.name)}</td></tr>`,
    c.label_1 ? `<tr><td class="ct-l">Matter</td><td>${esc(c.label_1)}</td></tr>` : '',
    c.label_2 ? `<tr><td class="ct-l">Court / Stage</td><td>${esc(c.label_2)}</td></tr>` : '',
    c.next_hearing_date
      ? `<tr><td class="ct-l">Next Hearing</td><td>${fmtDate(c.next_hearing_date)}${c.next_hearing_note ? ` — ${esc(c.next_hearing_note)}` : ''}</td></tr>`
      : '',
    c.parent_phone ? `<tr><td class="ct-l">Phone</td><td>${esc(c.parent_phone)}</td></tr>` : '',
    c.parent_email ? `<tr><td class="ct-l">Email</td><td>${esc(c.parent_email)}</td></tr>` : '',
    c.parent_name  ? `<tr><td class="ct-l">Contact</td><td>${esc(c.parent_name)}</td></tr>` : '',
    c.notes        ? `<tr><td class="ct-l">Notes</td><td>${esc(c.notes)}</td></tr>` : '',
    `<tr><td class="ct-l">Client since</td><td>${fmtDate(c.created_at)}</td></tr>`,
    `<tr><td class="ct-l">Sessions</td><td>${c.sessions}</td></tr>`,
  ].filter(Boolean)

  const sessionRows = d.sessions.map(s => `
<div class="sess-row">
  <div class="sess-date">${fmtDate(s.session_date)}</div>
  ${s.topic    ? `<div class="sess-topic">${esc(s.topic)}</div>` : ''}
  ${s.homework ? `<div class="sess-sub">Action items: ${esc(s.homework)}</div>` : ''}
  ${s.notes    ? `<div class="sess-sub italic">${esc(s.notes)}</div>` : ''}
</div>`).join('')

  return `
<h1 class="doc-title">Client Case Sheet</h1>
<table class="ct"><tbody>${rows.join('')}</tbody></table>
${d.sessions.length > 0 ? `
<h2 class="sec-head">Consultation History</h2>
<div class="sessions">${sessionRows}</div>` : ''}`
}

function consultationBody(d: ConsultationData): string {
  return `
<h1 class="doc-title">Consultation Record</h1>
<table class="ct"><tbody>
  <tr><td class="ct-l">Client</td><td>${esc(d.clientName)}</td></tr>
  <tr><td class="ct-l">Date</td><td>${fmtDate(d.sessionDate)}</td></tr>
  ${d.topic ? `<tr><td class="ct-l">Matter / Topic</td><td>${esc(d.topic)}</td></tr>` : ''}
</tbody></table>
${d.homework ? `<h2 class="sec-head">Action Items</h2><p>${esc(d.homework)}</p>` : ''}
${d.notes    ? `<h2 class="sec-head">Notes</h2><p class="italic">${esc(d.notes)}</p>` : ''}`
}

function hearingsBody(d: HearingsData): string {
  const rows = d.hearings.map(h => `
<tr>
  <td>${esc(h.name)}</td>
  <td>${h.label_1 ? esc(h.label_1) : '—'}</td>
  <td>${fmtDate(h.next_hearing_date)}</td>
  <td>${h.days === 0 ? 'Today' : h.days === 1 ? 'Tomorrow' : `${h.days}d`}</td>
  <td>${h.next_hearing_note ? esc(h.next_hearing_note) : '—'}</td>
</tr>`).join('')

  return `
<h1 class="doc-title">Upcoming Hearing Schedule</h1>
<p class="meta-line">As of ${d.asOf}</p>
${d.hearings.length === 0
  ? '<p>No upcoming hearings found.</p>'
  : `<table class="ht"><thead><tr><th>Client</th><th>Matter</th><th>Hearing Date</th><th>Days</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`}`
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const PRINT_CSS = `
@page { size: A4; margin: 1in 1.25in; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000;
  background: #fff;
}
@media screen {
  body { max-width: 800px; margin: 40px auto; padding: 1in 1.25in; }
}

/* Letterhead */
.lh-full, .lh-minimal { text-align: center; margin-bottom: 10pt; }
.lh-logo   { max-height: 60pt; margin-bottom: 6pt; display: block; margin-left: auto; margin-right: auto; }
.lh-firm   { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; }
.lh-name   { font-size: 14pt; font-weight: bold; margin-top: 3pt; }
.lh-title  { font-size: 10pt; color: #333; margin-top: 2pt; }
.lh-contact{ font-size: 10pt; color: #333; margin-top: 2pt; }
.lh-rule   { border: none; border-top: 2pt solid #000; margin: 10pt 0 16pt; }

/* Document body (TipTap HTML) */
.doc-title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 18pt; }
.doc-body h1 { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 12pt 0 8pt; }
.doc-body h2 { font-size: 12pt; font-weight: bold; margin: 10pt 0 6pt; }
.doc-body h3 { font-size: 12pt; font-weight: bold; margin: 8pt 0 4pt; }
.doc-body p  { margin-bottom: 8pt; text-align: justify; }
.doc-body ul, .doc-body ol { margin: 6pt 0 6pt 24pt; }
.doc-body li { margin-bottom: 4pt; }
.doc-body strong { font-weight: bold; }
.doc-body em     { font-style: italic; }
.doc-body blockquote { border-left: 3pt solid #999; padding-left: 10pt; color: #333; margin: 8pt 0; }
/* Redline marks: strip for print */
.doc-body ins { text-decoration: none; }
.doc-body del { display: none; }

/* Case table */
.ct { width: 100%; border-collapse: collapse; margin-bottom: 14pt; }
.ct td { padding: 4pt 8pt; border: 1pt solid #bbb; font-size: 11pt; vertical-align: top; }
.ct-l { font-weight: bold; width: 120pt; background: #f5f5f5; }

/* Section heading */
.sec-head { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 14pt 0 8pt; border-bottom: 1pt solid #000; padding-bottom: 3pt; }

/* Consultation history */
.sessions { }
.sess-row   { margin-bottom: 10pt; padding-bottom: 10pt; border-bottom: 0.5pt solid #ddd; }
.sess-date  { font-size: 10pt; color: #555; }
.sess-topic { font-size: 11pt; font-weight: bold; margin-top: 2pt; }
.sess-sub   { font-size: 10.5pt; color: #333; margin-top: 2pt; }
.italic     { font-style: italic; }

/* Meta line */
.meta-line { font-size: 10pt; color: #555; margin-bottom: 12pt; }

/* Hearing table */
.ht { width: 100%; border-collapse: collapse; font-size: 11pt; }
.ht th { background: #eee; font-weight: bold; padding: 5pt 8pt; border: 1pt solid #bbb; text-align: left; }
.ht td { padding: 4pt 8pt; border: 0.5pt solid #ddd; vertical-align: top; }
.ht tr:nth-child(even) td { background: #fafafa; }

/* Footer */
.pf { margin-top: 24pt; font-size: 9pt; color: #999; text-align: center; border-top: 0.5pt solid #ddd; padding-top: 6pt; }
@media print {
  .pf { position: fixed; bottom: 0.3in; left: 0; right: 0; }
}
`

// ── Main export ───────────────────────────────────────────────────────────────

export function buildPrintHtml(opts: BuildPrintOptions): string {
  const { kind, letterhead, provider, data, autoprint } = opts

  const lhHtml   = letterheadHtml(letterhead, provider)
  let bodyHtml: string
  switch (kind) {
    case 'document':     bodyHtml = documentBody(data as DocumentData);        break
    case 'case-sheet':   bodyHtml = caseSheetBody(data as CaseSheetData);      break
    case 'consultation': bodyHtml = consultationBody(data as ConsultationData); break
    case 'hearings':     bodyHtml = hearingsBody(data as HearingsData);         break
    default:             bodyHtml = ''
  }

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${kind === 'document' ? esc((data as DocumentData).title) : kind === 'hearings' ? 'Hearing Schedule' : kind === 'case-sheet' ? 'Case Sheet' : 'Consultation Record'}</title>
  <style>${PRINT_CSS}</style>
  ${autoprint ? `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print() }, 400) })</script>` : ''}
</head>
<body>
  ${lhHtml}
  ${bodyHtml}
  <div class="pf">Generated by Kryla — ${today}</div>
</body>
</html>`
}
