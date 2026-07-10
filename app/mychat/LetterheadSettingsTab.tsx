'use client'

import { useState, useEffect } from 'react'
import type { Letterhead } from '@/lib/print/template'

interface VerificationData {
  enrolment_no: string | null
  bar_council:  string | null
  state:        string | null
  status:       string
  submitted_at: string | null
}

interface Props {
  providerId: string
}

const EMPTY: Letterhead = {
  mode:           'minimal',
  firmName:       '',
  advocateName:   '',
  enrolmentNo:    '',
  barCouncil:     '',
  chamberAddress: '',
  phone:          '',
  email:          '',
  logoUrl:        '',
}

export default function LetterheadSettingsTab({ providerId }: Props) {
  const [form, setForm]       = useState<Letterhead>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Verification state
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [vForm, setVForm]               = useState({ enrolmentNo: '', barCouncil: '', state: '' })
  const [vSaving, setVSaving]           = useState(false)
  const [vSaved, setVSaved]             = useState(false)
  const [vError, setVError]             = useState('')

  useEffect(() => {
    fetch(`/api/mychat/letterhead?providerId=${providerId}`)
      .then(r => r.json())
      .then(d => { if (d.letterhead) setForm({ ...EMPTY, ...d.letterhead }) })
      .catch(() => setError('Failed to load letterhead settings'))
      .finally(() => setLoading(false))

    fetch(`/api/mychat/verification?providerId=${providerId}`)
      .then(r => r.json())
      .then(d => {
        if (d.verification && Object.keys(d.verification).length > 0) {
          setVerification(d.verification as VerificationData)
          setVForm({
            enrolmentNo: d.verification.enrolment_no ?? '',
            barCouncil:  d.verification.bar_council  ?? '',
            state:       d.verification.state        ?? '',
          })
        }
      })
      .catch(() => {/* silent */})
  }, [providerId])

  function set(key: keyof Letterhead, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mychat/letterhead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, letterhead: form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function submitVerification() {
    if (!vForm.enrolmentNo.trim() || !vForm.barCouncil.trim()) {
      setVError('Enrolment number and Bar Council are required')
      return
    }
    setVSaving(true)
    setVError('')
    try {
      const res = await fetch('/api/mychat/verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId, ...vForm }),
      })
      const data = await res.json()
      if (!res.ok) { setVError(data.error ?? 'Submission failed'); return }
      setVerification(data.verification)
      setVSaved(true)
    } catch {
      setVError('Submission failed')
    } finally {
      setVSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-[#999] py-4">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#0D0D0D] mb-1">Letterhead</h3>
        <p className="text-xs text-[#888]">Appears at the top of every printed document, case sheet, and hearing schedule.</p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Mode selector */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-2">Style</p>
        <div className="flex gap-2">
          {(['minimal', 'full', 'none'] as const).map(m => (
            <button
              key={m}
              onClick={() => set('mode', m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.mode === m
                  ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                  : 'bg-white text-[#555] border-[#E5E5E5] hover:border-[#0D0D0D]'
              }`}>
              {m === 'minimal' ? 'Minimal' : m === 'full' ? 'Full' : 'None'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#aaa] mt-1.5">
          {form.mode === 'minimal' && 'Name + location + contact from your profile. No setup needed.'}
          {form.mode === 'full'    && 'Firm name, bar council credentials, chamber address, optional logo.'}
          {form.mode === 'none'    && 'No header — clean document body only.'}
        </p>
      </div>

      {form.mode === 'full' && (
        <div className="space-y-3">
          <Field label="Firm / Chamber name"   value={form.firmName       ?? ''} onChange={v => set('firmName', v)} />
          <Field label="Advocate name"         value={form.advocateName   ?? ''} onChange={v => set('advocateName', v)}   placeholder="Leave blank to use your profile name" />
          <Field label="Enrolment number"      value={form.enrolmentNo    ?? ''} onChange={v => set('enrolmentNo', v)} />
          <Field label="Bar council"           value={form.barCouncil     ?? ''} onChange={v => set('barCouncil', v)}     placeholder="e.g. Bar Council of Tamil Nadu" />
          <Field label="Chamber address"       value={form.chamberAddress ?? ''} onChange={v => set('chamberAddress', v)} multiline />
          <Field label="Phone (letterhead)"    value={form.phone          ?? ''} onChange={v => set('phone', v)}          placeholder="Leave blank to use your WhatsApp number" />
          <Field label="Email (letterhead)"    value={form.email          ?? ''} onChange={v => set('email', v)}          placeholder="Leave blank to use your profile email" />
          <Field label="Logo URL"              value={form.logoUrl        ?? ''} onChange={v => set('logoUrl', v)}        placeholder="https://…" />
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold disabled:opacity-60 transition-opacity">
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save letterhead'}
      </button>

      {/* Bar Council verification */}
      <div className="pt-4 border-t border-[#F0F0F0]">
        <h3 className="text-sm font-semibold text-[#0D0D0D] mb-1">Advocate verification</h3>
        <p className="text-xs text-[#888] mb-4">Submit your Bar Council enrolment details for verification. A verified badge will appear on your public page.</p>

        {verification?.status === 'verified' && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-[#16A34A]">✓ Verified advocate</p>
            <p className="text-[11px] text-[#555] mt-0.5">{verification.enrolment_no} · {verification.bar_council}</p>
          </div>
        )}

        {verification?.status === 'pending' && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-[#92400E]">Verification pending review</p>
            <p className="text-[11px] text-[#78350F] mt-0.5">Submitted {verification.submitted_at ? new Date(verification.submitted_at).toLocaleDateString('en-IN') : ''}. We will review and update shortly.</p>
          </div>
        )}

        {verification?.status === 'rejected' && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-red-500">Verification rejected</p>
            <p className="text-[11px] text-red-400 mt-0.5">Please resubmit with correct details.</p>
          </div>
        )}

        {vError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{vError}</p>
        )}

        <div className="space-y-3">
          <Field label="Enrolment number" value={vForm.enrolmentNo} onChange={v => setVForm(f => ({ ...f, enrolmentNo: v }))} placeholder="e.g. AP/1234/2018" />
          <Field label="Bar Council"      value={vForm.barCouncil}  onChange={v => setVForm(f => ({ ...f, barCouncil: v }))}  placeholder="e.g. Bar Council of Andhra Pradesh" />
          <Field label="State"            value={vForm.state}       onChange={v => setVForm(f => ({ ...f, state: v }))}       placeholder="e.g. Andhra Pradesh" />
        </div>

        <button
          onClick={submitVerification}
          disabled={vSaving || verification?.status === 'verified'}
          className="w-full mt-3 py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold disabled:opacity-60 transition-opacity">
          {vSaving ? 'Submitting…' : vSaved ? 'Submitted ✓' : verification?.status === 'pending' ? 'Resubmit for verification' : 'Submit for verification'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const cls = 'w-full border border-[#E5E5E5] rounded-xl px-3 py-2 text-sm text-[#0D0D0D] placeholder:text-[#bbb] focus:outline-none focus:border-[#0D0D0D] resize-none'
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#555] mb-1 block">{label}</label>
      {multiline
        ? <textarea rows={2} className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}
