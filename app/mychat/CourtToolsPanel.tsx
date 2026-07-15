'use client'

/**
 * CourtToolsPanel — full-screen advocate-only overlay for India court lookups.
 *
 * Capabilities:
 *   Case / CNR    — validate CNR, copy to clipboard, deep-link to eCourts, watch the case
 *   Watched Cases — manage saved cases and next-hearing dates (feeds reminder pipeline)
 *   Cause List    — pick court + date, open official cause-list portal
 *   Orders        — enter CNR, open official orders portal
 *   Caveat        — open caveat-search portal
 *   Process       — open process/service portal
 *   Find Court    — in-app searchable locator (fully seeded — no external API)
 *
 * v1 strategy: eCourts portals are CAPTCHA-gated so we copy the user's input
 * to their clipboard and open the right portal page. A clear CAPTCHA helper
 * note is shown so this is never a surprise.
 *
 * Slide-in pattern clones DraftingStudio: fixed inset-0 z-50 bg-white.
 */

import { useState, useEffect, useCallback } from 'react'
import type { CourtDirectoryEntry, TribunalEntry, TribunalCategory } from '@/lib/ecourts'
import { validateCnr, normalizeCnr, courtMapUrl, courtTypeLabel, PORTAL_LABELS,
         benchMapUrl, TRIBUNAL_CATEGORY_LABELS } from '@/lib/ecourts'
import type { PortalKind } from '@/lib/ecourts'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelTab = 'cnr' | 'watched' | 'cause_list' | 'orders' | 'caveat' | 'process' | 'locator' | 'tribunals' | 'name_search'

interface WatchedCase {
  id:                string
  cnr:               string | null
  case_title:        string | null
  case_type:         string | null
  court_name:        string | null
  party_name:        string | null
  next_hearing_date: string | null
  next_hearing_note: string | null
  student_id:        string | null
  student_name:      string | null
  status:            'active' | 'disposed' | 'archived'
  source_url:        string | null
  notes:             string | null
  created_at:        string
  updated_at:        string
}

interface Student {
  id:   string
  name: string
}

interface Props {
  providerId: string
  open:       boolean
  onClose:    () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'cnr',         label: 'Case / CNR' },
  { key: 'watched',     label: 'Watched Cases' },
  { key: 'cause_list',  label: 'Cause List' },
  { key: 'orders',      label: 'Orders' },
  { key: 'caveat',      label: 'Caveat' },
  { key: 'process',     label: 'Process' },
  { key: 'locator',     label: 'Find Court' },
  { key: 'tribunals',   label: 'Tribunals' },
  { key: 'name_search', label: 'Search by Name' },
]

const CAPTCHA_NOTE = 'eCourts requires a CAPTCHA — your value has been copied to clipboard. Paste it on the portal page.'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function openPortal(url: string, copyValue?: string) {
  if (copyValue) {
    try { navigator.clipboard.writeText(copyValue) } catch { /* ignore */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourtToolsPanel({ providerId, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('cnr')
  const [portals, setPortals]     = useState<Record<PortalKind, string> | null>(null)

  // ── CNR tab state ────────────────────────────────────────────────────────────
  const [cnrInput, setCnrInput]           = useState('')
  const [cnrTitle, setCnrTitle]           = useState('')
  const [cnrCourt, setCnrCourt]           = useState('')
  const [cnrParty, setCnrParty]           = useState('')
  const [cnrError, setCnrError]           = useState<string | null>(null)
  const [cnrCopied, setCnrCopied]         = useState(false)
  const [watchStudentId, setWatchStudentId] = useState('')
  const [watchSaving, setWatchSaving]     = useState(false)
  const [watchNote, setWatchNote]         = useState<string | null>(null)

  // ── Watched cases tab state ──────────────────────────────────────────────────
  const [watchedCases, setWatchedCases]   = useState<WatchedCase[]>([])
  const [watchedLoading, setWatchedLoading] = useState(false)
  const [editHearingId, setEditHearingId] = useState<string | null>(null)
  const [editHearingDate, setEditHearingDate] = useState('')
  const [editHearingNote, setEditHearingNote] = useState('')
  const [editSaving, setEditSaving]       = useState(false)

  // ── Cause list tab state ─────────────────────────────────────────────────────
  const [causeDate, setCauseDate]         = useState(() => new Date().toISOString().slice(0, 10))
  const [causeCourt, setCauseCourt]       = useState('')

  // ── Orders / Caveat / Process tab state ─────────────────────────────────────
  const [orderCnr, setOrderCnr]           = useState('')
  const [caveatParty, setCaveatParty]     = useState('')
  const [processRef, setProcessRef]       = useState('')

  // ── Locator tab state ────────────────────────────────────────────────────────
  const [locQuery, setLocQuery]           = useState('')
  const [locState, setLocState]           = useState('')
  const [locType, setLocType]             = useState('')
  const [locResults, setLocResults]       = useState<CourtDirectoryEntry[]>([])
  const [locLoading, setLocLoading]       = useState(false)

  // ── Tribunals tab state ───────────────────────────────────────────────────────
  const [tribQuery, setTribQuery]         = useState('')
  const [tribCategory, setTribCategory]   = useState('')
  const [tribResults, setTribResults]     = useState<TribunalEntry[]>([])
  const [tribLoading, setTribLoading]     = useState(false)
  const [expandedTrib, setExpandedTrib]   = useState<string | null>(null)
  const [tribRef, setTribRef]             = useState('')     // shared case-ref input

  // ── Name search tab state ─────────────────────────────────────────────────────
  const [nameQuery, setNameQuery]         = useState('')
  const [nameMode, setNameMode]           = useState<'party' | 'advocate'>('party')
  const [nameLevel, setNameLevel]         = useState<'district' | 'high' | 'supreme'>('district')
  const [nameCopied, setNameCopied]       = useState(false)

  // ── Cause-list alert settings ─────────────────────────────────────────────────
  const [alertEnabled, setAlertEnabled]   = useState(false)
  const [alertHasWa, setAlertHasWa]       = useState(false)
  const [alertLoading, setAlertLoading]   = useState(false)
  const [alertSaving, setAlertSaving]     = useState(false)

  // ── Client roster (for linking watched cases) ────────────────────────────────
  const [students, setStudents]           = useState<Student[]>([])

  // ── Portal config + initial load ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      // Load portals config
      try {
        const res = await fetch(`/api/mychat/court/config?providerId=${encodeURIComponent(providerId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.enabled) setPortals(data.portals)
        }
      } catch { /* ignore */ }

      // Load client roster for linking
      try {
        const res = await fetch(`/api/mychat/students?providerId=${encodeURIComponent(providerId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setStudents((data.students ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
        }
      } catch { /* ignore */ }

      // Load cause-list alert settings
      try {
        setAlertLoading(true)
        const res = await fetch(`/api/mychat/court/settings?providerId=${encodeURIComponent(providerId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.enabled) {
            setAlertEnabled(data.cause_list_alerts_enabled ?? false)
            setAlertHasWa(data.has_whatsapp ?? false)
          }
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setAlertLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, providerId])

  // ── Load watched cases when tab opens ────────────────────────────────────────
  const loadWatchedCases = useCallback(async () => {
    setWatchedLoading(true)
    try {
      const res = await fetch(`/api/mychat/court/watched?providerId=${encodeURIComponent(providerId)}`)
      if (res.ok) {
        const data = await res.json()
        setWatchedCases(data.cases ?? [])
      }
    } catch { /* ignore */ } finally {
      setWatchedLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (open && activeTab === 'watched') loadWatchedCases()
  }, [open, activeTab, loadWatchedCases])

  // ── Locator search ────────────────────────────────────────────────────────────
  const searchCourts = useCallback(async () => {
    setLocLoading(true)
    try {
      const params = new URLSearchParams({ providerId })
      if (locQuery) params.set('q', locQuery)
      if (locState) params.set('state', locState)
      if (locType)  params.set('type', locType)
      const res = await fetch(`/api/mychat/court/locator?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLocResults(data.courts ?? [])
      }
    } catch { /* ignore */ } finally {
      setLocLoading(false)
    }
  }, [providerId, locQuery, locState, locType])

  useEffect(() => {
    if (open && activeTab === 'locator') searchCourts()
  }, [open, activeTab, searchCourts])

  // ── Tribunals search ──────────────────────────────────────────────────────────
  const searchTribunals = useCallback(async () => {
    setTribLoading(true)
    try {
      const params = new URLSearchParams({ providerId })
      if (tribQuery)    params.set('q', tribQuery)
      if (tribCategory) params.set('category', tribCategory)
      const res = await fetch(`/api/mychat/court/tribunals?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTribResults(data.tribunals ?? [])
      }
    } catch { /* ignore */ } finally {
      setTribLoading(false)
    }
  }, [providerId, tribQuery, tribCategory])

  useEffect(() => {
    if (open && activeTab === 'tribunals') searchTribunals()
  }, [open, activeTab, searchTribunals])

  // ── Toggle cause-list alert ───────────────────────────────────────────────────
  async function toggleAlert(newValue: boolean) {
    setAlertSaving(true)
    try {
      const res = await fetch('/api/mychat/court/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, cause_list_alerts_enabled: newValue }),
      })
      if (res.ok) setAlertEnabled(newValue)
    } catch { /* ignore */ } finally {
      setAlertSaving(false)
    }
  }

  // ── Watch a case ──────────────────────────────────────────────────────────────
  async function handleWatchCase() {
    const normalized = normalizeCnr(cnrInput)
    const err = cnrInput.trim() ? validateCnr(normalized) : null
    if (err && cnrInput.trim()) { setCnrError(err); return }
    if (!cnrInput.trim() && !cnrTitle.trim() && !cnrParty.trim()) {
      setCnrError('Enter a CNR, case title, or party name to watch.')
      return
    }
    setCnrError(null)
    setWatchSaving(true)
    try {
      const body: Record<string, string> = { providerId }
      if (normalized) body.cnr = normalized
      if (cnrTitle.trim()) body.case_title = cnrTitle.trim()
      if (cnrCourt.trim()) body.court_name = cnrCourt.trim()
      if (cnrParty.trim()) body.party_name = cnrParty.trim()
      if (watchStudentId) body.student_id = watchStudentId
      const res = await fetch('/api/mychat/court/watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setWatchNote(watchStudentId
          ? 'Case added to your watch list. Next-hearing reminders will go to the linked client.'
          : 'Case saved. Link it to a client to enable WhatsApp hearing reminders.')
        setCnrInput(''); setCnrTitle(''); setCnrCourt(''); setCnrParty(''); setWatchStudentId('')
        setTimeout(() => setWatchNote(null), 6000)
      } else {
        const data = await res.json().catch(() => ({}))
        setCnrError(data.error ?? 'Could not save the case.')
      }
    } catch {
      setCnrError('Network error — please try again.')
    } finally {
      setWatchSaving(false)
    }
  }

  // ── Save hearing date edit ────────────────────────────────────────────────────
  async function saveHearingDate(caseId: string, studentId: string | null) {
    setEditSaving(true)
    try {
      const body: Record<string, string> = { providerId, next_hearing_date: editHearingDate }
      if (editHearingNote.trim()) body.next_hearing_note = editHearingNote.trim()
      if (studentId) body.student_id = studentId
      const res = await fetch(`/api/mychat/court/watched/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditHearingId(null)
        await loadWatchedCases()
      }
    } catch { /* ignore */ } finally {
      setEditSaving(false)
    }
  }

  // ── Archive a watched case ────────────────────────────────────────────────────
  async function archiveCase(caseId: string) {
    try {
      await fetch(`/api/mychat/court/watched/${caseId}?providerId=${encodeURIComponent(providerId)}`, {
        method: 'DELETE',
      })
      setWatchedCases(prev => prev.filter(c => c.id !== caseId))
    } catch { /* ignore */ }
  }

  if (!open) return null

  const portalUrl = (kind: PortalKind) => portals?.[kind] ?? 'https://services.ecourts.gov.in/ecourtindia_v6/'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#0D0D0D" strokeWidth="1.5"/>
            <path d="M5 8l2 2 4-4" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#0D0D0D]">Court Tools</span>
          <span className="text-xs text-[#999] ml-1">India eCourts</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#666] hover:bg-[#F5F5F5] hover:text-[#0D0D0D] transition-colors"
          title="Close Court Tools">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* ── Sub-tab navigation ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-0.5 px-4 pt-2 pb-0 border-b border-[#E5E5E5] bg-white shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[#0D0D0D] text-[#0D0D0D]'
                : 'border-transparent text-[#888] hover:text-[#444]'
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ══ CNR / Case Status ══════════════════════════════════════════════ */}
        {activeTab === 'cnr' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

            {/* eCourts explanation */}
            <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3 text-[12px] text-[#92400E] leading-relaxed">
              <strong>How it works:</strong> Enter your CNR or case details below. We'll copy it to your clipboard and open the official eCourts portal — paste it and complete the CAPTCHA to view the case.
            </div>

            {/* CNR input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">CNR Number</label>
              <input
                type="text"
                value={cnrInput}
                onChange={e => { setCnrInput(e.target.value.toUpperCase()); setCnrError(null) }}
                placeholder="e.g. MHAU010234562019"
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] font-mono text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
              {cnrError && <p className="text-[11px] text-red-500">{cnrError}</p>}
            </div>

            {/* Case details (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Case Title (optional)</label>
                <input
                  type="text"
                  value={cnrTitle}
                  onChange={e => setCnrTitle(e.target.value)}
                  placeholder="e.g. Sharma vs. State of Maharashtra"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Court Name</label>
                <input
                  type="text"
                  value={cnrCourt}
                  onChange={e => setCnrCourt(e.target.value)}
                  placeholder="e.g. Bombay High Court"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Party Name</label>
                <input
                  type="text"
                  value={cnrParty}
                  onChange={e => setCnrParty(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
                />
              </div>
            </div>

            {/* Portal action buttons */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Open in eCourts Portal</p>
              <div className="flex flex-wrap gap-2">
                {(['cnr_status', 'case_status'] as PortalKind[]).map(kind => (
                  <button
                    key={kind}
                    onClick={() => {
                      const v = cnrInput.trim() ? normalizeCnr(cnrInput) : (cnrParty.trim() || cnrTitle.trim() || '')
                      openPortal(portalUrl(kind), v || undefined)
                      if (v) setCnrCopied(true)
                      setTimeout(() => setCnrCopied(false), 3000)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D0D0D] text-white text-[12px] font-medium hover:bg-[#222] transition-colors">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {PORTAL_LABELS[kind]}
                  </button>
                ))}
              </div>
              {cnrCopied && (
                <p className="text-[11px] text-[#059669]">✓ Copied to clipboard. {CAPTCHA_NOTE}</p>
              )}
            </div>

            {/* Link to client */}
            {students.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Link to client (for hearing reminders)</label>
                <select
                  value={watchStudentId}
                  onChange={e => setWatchStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                  <option value="">— no client link —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Watch case */}
            <button
              onClick={handleWatchCase}
              disabled={watchSaving}
              className="w-full py-2.5 rounded-xl bg-[#F5A623] text-white text-[13px] font-semibold hover:bg-[#E5922A] transition-colors disabled:opacity-50">
              {watchSaving ? 'Saving…' : '⊕ Watch this case'}
            </button>

            {watchNote && (
              <p className="text-[12px] text-[#059669] leading-relaxed">{watchNote}</p>
            )}

            {students.length === 0 && (
              <p className="text-[11px] text-[#999] leading-relaxed">
                Add clients in the <strong>Clients</strong> tab to link cases and receive WhatsApp hearing reminders.
              </p>
            )}
          </div>
        )}

        {/* ══ Watched Cases ═══════════════════════════════════════════════════ */}
        {activeTab === 'watched' && (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-[13px] font-semibold text-[#0D0D0D]">Watched Cases</h2>
              <div className="flex items-center gap-3">
                {/* Cause-list WhatsApp digest toggle */}
                {!alertLoading && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#666]">Daily WhatsApp digest</span>
                    {alertHasWa ? (
                      <button
                        onClick={() => toggleAlert(!alertEnabled)}
                        disabled={alertSaving}
                        title={alertEnabled ? 'Disable cause-list digest' : 'Enable cause-list digest'}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                          alertEnabled ? 'bg-[#059669]' : 'bg-[#D1D5DB]'
                        }`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          alertEnabled ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#999]" title="Add your WhatsApp number in Settings to enable">
                        (add WhatsApp number first)
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={loadWatchedCases}
                  className="text-[11px] text-[#666] hover:text-[#0D0D0D] transition-colors">
                  Refresh
                </button>
              </div>
            </div>
            {alertEnabled && (
              <p className="text-[11px] text-[#059669] leading-relaxed">
                ✓ You'll get a WhatsApp digest at ~6 pm every evening listing tomorrow's watched matters.
              </p>
            )}

            {watchedLoading && (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-[#F5F5F5] animate-pulse" />
                ))}
              </div>
            )}

            {!watchedLoading && watchedCases.length === 0 && (
              <div className="text-center py-12 text-[#999] text-[13px]">
                <p>No watched cases yet.</p>
                <p className="mt-1 text-[12px]">Go to the Case / CNR tab and click "Watch this case" to start tracking.</p>
              </div>
            )}

            {!watchedLoading && watchedCases.map(wc => (
              <div key={wc.id} className="border border-[#E5E5E5] rounded-xl p-4 space-y-2 hover:border-[#BBBBBB] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0D0D0D] truncate">
                      {wc.case_title || wc.cnr || wc.party_name || 'Unnamed case'}
                    </p>
                    {wc.cnr && wc.case_title && (
                      <p className="text-[11px] font-mono text-[#888] mt-0.5">{wc.cnr}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {wc.court_name && <span className="text-[11px] text-[#666]">🏛 {wc.court_name}</span>}
                      {wc.case_type  && <span className="text-[11px] text-[#666]">• {wc.case_type}</span>}
                      {wc.student_name && <span className="text-[11px] text-[#059669]">👤 {wc.student_name}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => archiveCase(wc.id)}
                    className="shrink-0 p-1 rounded text-[#ccc] hover:text-red-400 transition-colors"
                    title="Remove from watch list">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Next hearing */}
                {editHearingId === wc.id ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="date"
                      value={editHearingDate}
                      onChange={e => setEditHearingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] text-[12px] text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D]"
                    />
                    <input
                      type="text"
                      value={editHearingNote}
                      onChange={e => setEditHearingNote(e.target.value)}
                      placeholder="Note (e.g. Before J. Sharma, Court 4)"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] text-[12px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveHearingDate(wc.id, wc.student_id)}
                        disabled={editSaving || !editHearingDate}
                        className="flex-1 py-1.5 rounded-lg bg-[#0D0D0D] text-white text-[11px] font-semibold disabled:opacity-50 hover:bg-[#333] transition-colors">
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditHearingId(null)}
                        className="flex-1 py-1.5 rounded-lg border border-[#E5E5E5] text-[11px] text-[#666] hover:bg-[#F5F5F5] transition-colors">
                        Cancel
                      </button>
                    </div>
                    {wc.student_id && (
                      <p className="text-[11px] text-[#059669]">Saving will also update the client's next-session date for hearing reminders.</p>
                    )}
                    {!wc.student_id && students.length > 0 && (
                      <p className="text-[11px] text-[#999]">Link a client to enable WhatsApp hearing reminders.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {wc.next_hearing_date ? (
                        <p className="text-[12px] text-[#0D0D0D]">
                          📅 <strong>Next hearing:</strong> {formatDate(wc.next_hearing_date)}
                          {wc.next_hearing_note && <span className="text-[#666] ml-1">· {wc.next_hearing_note}</span>}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#999]">No hearing date set.</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditHearingId(wc.id)
                        setEditHearingDate(wc.next_hearing_date ?? '')
                        setEditHearingNote(wc.next_hearing_note ?? '')
                      }}
                      className="text-[11px] text-[#666] hover:text-[#0D0D0D] underline transition-colors shrink-0">
                      {wc.next_hearing_date ? 'Edit' : 'Set date'}
                    </button>
                  </div>
                )}

                {/* Open in eCourts */}
                {wc.cnr && (
                  <button
                    onClick={() => openPortal(portalUrl('cnr_status'), wc.cnr ?? undefined)}
                    className="text-[11px] text-[#666] hover:text-[#0D0D0D] transition-colors underline">
                    Open CNR in eCourts ↗
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ Cause List ══════════════════════════════════════════════════════ */}
        {activeTab === 'cause_list' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Enter a court name and date to open the official eCourts cause list. The portal requires CAPTCHA — select your court on the portal page after it opens.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={causeDate}
                  onChange={e => setCauseDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Court / Bench (optional)</label>
                <input
                  type="text"
                  value={causeCourt}
                  onChange={e => setCauseCourt(e.target.value)}
                  placeholder="e.g. Bombay High Court — Court Room 28"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
                />
              </div>
            </div>
            <button
              onClick={() => openPortal(portalUrl('cause_list'), causeDate ? `${causeDate}${causeCourt ? ' ' + causeCourt : ''}` : undefined)}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Open Cause List in eCourts
            </button>
            <p className="text-[11px] text-[#999]">{CAPTCHA_NOTE.replace('your value has been copied to clipboard. Paste it on the portal page.', 'Select your court and date on the portal page.')}</p>
          </div>
        )}

        {/* ══ Orders / Judgments ══════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Enter a CNR or case reference to open the eCourts Orders and Judgments portal. Your CNR will be copied to the clipboard.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">CNR / Case Reference</label>
              <input
                type="text"
                value={orderCnr}
                onChange={e => setOrderCnr(e.target.value.toUpperCase())}
                placeholder="e.g. MHAU010234562019"
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] font-mono text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
            </div>
            <button
              onClick={() => openPortal(portalUrl('orders'), orderCnr.trim() ? normalizeCnr(orderCnr) : undefined)}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Open Orders / Judgments
            </button>
            {orderCnr.trim() && <p className="text-[11px] text-[#999]">{CAPTCHA_NOTE}</p>}
          </div>
        )}

        {/* ══ Caveat ══════════════════════════════════════════════════════════ */}
        {activeTab === 'caveat' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Search for caveats filed by or against a party. Enter the party name to copy to clipboard and open the eCourts caveat search portal.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Party Name</label>
              <input
                type="text"
                value={caveatParty}
                onChange={e => setCaveatParty(e.target.value)}
                placeholder="e.g. Sharma Constructions Pvt Ltd"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
            </div>
            <button
              onClick={() => openPortal(portalUrl('caveat'), caveatParty.trim() || undefined)}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Search Caveats in eCourts
            </button>
            {caveatParty.trim() && <p className="text-[11px] text-[#999]">{CAPTCHA_NOTE}</p>}
          </div>
        )}

        {/* ══ Process / Service ════════════════════════════════════════════════ */}
        {activeTab === 'process' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Check process/summons service status. Enter a case reference or CNR to copy and open the eCourts process portal.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Case Reference / CNR</label>
              <input
                type="text"
                value={processRef}
                onChange={e => setProcessRef(e.target.value.toUpperCase())}
                placeholder="e.g. MHAU010234562019"
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] font-mono text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
            </div>
            <button
              onClick={() => openPortal(portalUrl('process'), processRef.trim() ? normalizeCnr(processRef) : undefined)}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Open Process / Service Portal
            </button>
            {processRef.trim() && <p className="text-[11px] text-[#999]">{CAPTCHA_NOTE}</p>}
          </div>
        )}

        {/* ══ Find Court ══════════════════════════════════════════════════════ */}
        {activeTab === 'locator' && (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <p className="text-[12px] text-[#666]">
              Search Supreme Court, all High Courts, and major district court complexes. Data is local — no CAPTCHA, no portal needed.
            </p>

            {/* Search controls */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={locQuery}
                onChange={e => setLocQuery(e.target.value)}
                placeholder="Search courts…"
                className="flex-1 min-w-[160px] px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
              <input
                type="text"
                value={locState}
                onChange={e => setLocState(e.target.value)}
                placeholder="State (e.g. Maharashtra)"
                className="min-w-[160px] px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
              <select
                value={locType}
                onChange={e => setLocType(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                <option value="">All types</option>
                <option value="supreme">Supreme Court</option>
                <option value="high">High Court</option>
                <option value="district">District Court</option>
              </select>
              <button
                onClick={searchCourts}
                disabled={locLoading}
                className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[12px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-50">
                {locLoading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Results */}
            {locLoading && (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-[#F5F5F5] animate-pulse" />)}
              </div>
            )}

            {!locLoading && locResults.length === 0 && (
              <p className="text-center text-[#999] text-[13px] py-8">
                No courts found. Try a different search term or state.
              </p>
            )}

            {!locLoading && locResults.map(court => {
              const mapLink = courtMapUrl(court)
              return (
                <div key={court.id} className="border border-[#E5E5E5] rounded-xl p-4 hover:border-[#BBBBBB] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#888] shrink-0">
                          {courtTypeLabel(court.court_type)}
                        </span>
                        {court.state !== 'National' && (
                          <span className="text-[10px] text-[#aaa]">{court.state}</span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-[#0D0D0D] mt-0.5">{court.complex_name}</p>
                      <p className="text-[12px] text-[#666] mt-0.5">{court.address}, {court.city}{court.pincode ? ` — ${court.pincode}` : ''}</p>
                    </div>
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F5F5] text-[11px] font-medium text-[#444] hover:bg-[#E5E5E5] hover:text-[#0D0D0D] transition-colors whitespace-nowrap">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <circle cx="5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 7.5C5 7.5 2 10 5 11.5S8 7.5 8 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      Maps
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* ══ Tribunals ═══════════════════════════════════════════════════════ */}
        {activeTab === 'tribunals' && (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <p className="text-[12px] text-[#666] leading-relaxed">
              India's major quasi-judicial bodies — NCLT, ITAT, CESTAT, NGT, consumer commissions and more. Each portal opens in a new tab with your case reference copied to clipboard.
            </p>

            {/* Search + category filter */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={tribQuery}
                onChange={e => setTribQuery(e.target.value)}
                placeholder="Search tribunals…"
                className="flex-1 min-w-[150px] px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
              <select
                value={tribCategory}
                onChange={e => setTribCategory(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D] bg-white">
                <option value="">All categories</option>
                {(Object.entries(TRIBUNAL_CATEGORY_LABELS) as [TribunalCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={searchTribunals}
                disabled={tribLoading}
                className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[12px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-50">
                {tribLoading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Shared case-reference input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Case / Matter Reference (copied to clipboard on open)</label>
              <input
                type="text"
                value={tribRef}
                onChange={e => setTribRef(e.target.value)}
                placeholder="e.g. ITA/123/2024/Del or CP(IB)-123/ND/2024"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] font-mono text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
            </div>

            {tribLoading && (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-[#F5F5F5] animate-pulse" />)}
              </div>
            )}

            {!tribLoading && tribResults.length === 0 && (
              <p className="text-center text-[#999] text-[13px] py-8">
                No tribunals found. Try a different search or category.
              </p>
            )}

            {!tribLoading && tribResults.map(trib => {
              const isExpanded = expandedTrib === trib.id
              return (
                <div key={trib.id} className="border border-[#E5E5E5] rounded-xl overflow-hidden hover:border-[#BBBBBB] transition-colors">
                  {/* Card header */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                            {TRIBUNAL_CATEGORY_LABELS[trib.category]}
                          </span>
                        </div>
                        <p className="text-[14px] font-semibold text-[#0D0D0D] mt-1">{trib.short_name}</p>
                        <p className="text-[12px] text-[#666]">{trib.full_name}</p>
                        {trib.notes && (
                          <p className="text-[11px] text-[#888] mt-1 leading-relaxed">{trib.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Portal deep-link buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        onClick={() => openPortal(trib.portal_url, tribRef.trim() || undefined)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] text-white text-[11px] font-medium hover:bg-[#222] transition-colors">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Open Portal
                      </button>
                      {trib.case_status_url && (
                        <button
                          onClick={() => openPortal(trib.case_status_url!, tribRef.trim() || undefined)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F5F5] text-[#444] text-[11px] font-medium hover:bg-[#E5E5E5] transition-colors">
                          Case Status
                        </button>
                      )}
                      {trib.cause_list_url && (
                        <button
                          onClick={() => openPortal(trib.cause_list_url!, tribRef.trim() || undefined)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F5F5] text-[#444] text-[11px] font-medium hover:bg-[#E5E5E5] transition-colors">
                          Cause List
                        </button>
                      )}
                      {trib.orders_url && (
                        <button
                          onClick={() => openPortal(trib.orders_url!, tribRef.trim() || undefined)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F5F5] text-[#444] text-[11px] font-medium hover:bg-[#E5E5E5] transition-colors">
                          Orders
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveTab('cnr')
                          setCnrCourt(trib.short_name)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ECFDF5] text-[#065F46] text-[11px] font-medium hover:bg-[#D1FAE5] transition-colors">
                        ⊕ Watch a matter
                      </button>
                    </div>

                    {tribRef.trim() && (
                      <p className="text-[11px] text-[#999]">Your reference is copied to clipboard when you open a portal. Paste it on the portal page.</p>
                    )}

                    {/* Benches toggle */}
                    {trib.benches.length > 0 && (
                      <button
                        onClick={() => setExpandedTrib(isExpanded ? null : trib.id)}
                        className="text-[11px] text-[#666] hover:text-[#0D0D0D] transition-colors underline">
                        {isExpanded ? 'Hide benches' : `${trib.benches.length} bench${trib.benches.length > 1 ? 'es' : ''} — show locations`}
                      </button>
                    )}
                  </div>

                  {/* Bench list */}
                  {isExpanded && trib.benches.length > 0 && (
                    <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 space-y-2">
                      {trib.benches.map((bench, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#0D0D0D]">{bench.name}</p>
                            <p className="text-[11px] text-[#666]">{bench.address}</p>
                          </div>
                          <a
                            href={benchMapUrl(bench)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E5E5E5] text-[11px] font-medium text-[#444] hover:bg-[#F5F5F5] transition-colors whitespace-nowrap">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <circle cx="5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                              <path d="M5 7.5C5 7.5 2 10 5 11.5S8 7.5 8 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                            Maps
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══ Search by Name ═══════════════════════════════════════════════════ */}
        {activeTab === 'name_search' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3 text-[12px] text-[#92400E] leading-relaxed">
              <strong>How it works:</strong> Enter the name below. We'll copy it to your clipboard and open the correct official portal — select the right court and paste the name to search.
            </div>

            {/* Mode: party vs advocate */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Search by</label>
              <div className="flex gap-2">
                {(['party', 'advocate'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setNameMode(m)}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-medium border transition-colors ${
                      nameMode === m
                        ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                        : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#BBBBBB]'
                    }`}>
                    {m === 'party' ? 'Party / Litigant name' : 'Advocate / Lawyer name'}
                  </button>
                ))}
              </div>
            </div>

            {/* Court level */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">Court level</label>
              <div className="flex gap-2">
                {([
                  { key: 'district', label: 'District Courts' },
                  { key: 'high',     label: 'High Courts' },
                  { key: 'supreme',  label: 'Supreme Court' },
                ] as const).map(lvl => (
                  <button
                    key={lvl.key}
                    onClick={() => setNameLevel(lvl.key)}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-medium border transition-colors ${
                      nameLevel === lvl.key
                        ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                        : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#BBBBBB]'
                    }`}>
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">
                {nameMode === 'party' ? 'Party / Litigant Name' : 'Advocate / Lawyer Name'}
              </label>
              <input
                type="text"
                value={nameQuery}
                onChange={e => { setNameQuery(e.target.value); setNameCopied(false) }}
                placeholder={nameMode === 'party' ? 'e.g. Sharma Constructions Pvt Ltd' : 'e.g. Adv. Ramesh Kumar'}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#0D0D0D] placeholder-[#ccc] focus:outline-none focus:border-[#0D0D0D] bg-white"
              />
            </div>

            {/* Open portal */}
            <button
              onClick={() => {
                if (!nameQuery.trim()) return
                const portalKey: PortalKind = nameMode === 'advocate'
                  ? (nameLevel === 'supreme' ? 'sci_status' : nameLevel === 'high' ? 'hc_services' : 'advocate_search')
                  : (nameLevel === 'supreme' ? 'sci_status' : nameLevel === 'high' ? 'hc_services' : 'party_search')
                openPortal(portalUrl(portalKey), nameQuery.trim())
                setNameCopied(true)
                setTimeout(() => setNameCopied(false), 3000)
              }}
              disabled={!nameQuery.trim()}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2h8v8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Open {nameLevel === 'supreme' ? 'Supreme Court' : nameLevel === 'high' ? 'High Court' : 'District Court'} search
            </button>

            {nameCopied && (
              <p className="text-[11px] text-[#059669]">
                ✓ Name copied to clipboard. On the portal: select the{' '}
                <strong>{nameMode === 'party' ? 'Party Name' : 'Advocate Name'}</strong> tab and paste it.
              </p>
            )}

            <div className="rounded-xl bg-[#F5F5F5] px-4 py-3 text-[11px] text-[#666] leading-relaxed space-y-1">
              <p><strong>District / High Courts</strong> — use the eCourts national portal. Select your specific court on the portal page after it opens.</p>
              <p><strong>Supreme Court</strong> — goes to sci.gov.in case-status search.</p>
              <p className="text-[#999]">For tribunal-level searches (NCLT, ITAT, CAT, etc.), use the <strong>Tribunals</strong> tab.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
