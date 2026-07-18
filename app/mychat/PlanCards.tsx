'use client'

import { useRef, useState } from 'react'

/**
 * Display name + custom-link cards shown at the bottom of the My Plan tile's
 * "Plan & billing" detail body, below `PlanSection`. Restored verbatim from
 * the pre-Phase-1 SpaceClient.tsx (deleted during the Phase 1 tile-launcher
 * rewrite along with the rest of the old flat-tab JSX) — see
 * `.superpowers/pre-phase1-spaceclient-reference.tsx` lines ~1261-1489.
 */

export function DisplayNameCard({ providerId, initialFirstName, initialLastName, onSaved }: { providerId: string; initialFirstName: string; initialLastName: string; onSaved: () => void }) {
  const initial = [initialFirstName, initialLastName].filter(Boolean).join(' ')
  const [value, setValue]   = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [saved, setSaved]   = useState(false)

  async function save() {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/mychat/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, displayName: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pb-6">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">Display name</p>
      <div className="rounded-2xl border border-[#E5E5E5] p-5 bg-white">
        <div className="mb-4">
          <p className="font-bold text-[#0D0D0D] text-sm mb-0.5">Name shown in your hero</p>
          <p className="text-xs text-[#999]">This is the name that appears at the top of your public page.</p>
        </div>
        <div className="flex items-center gap-0 border border-[#E5E5E5] rounded-xl overflow-hidden focus-within:border-[#0D0D0D] transition-colors">
          <input
            type="text"
            placeholder="Your display name"
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); setSaved(false) }}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            className="flex-1 py-2.5 pl-3.5 pr-2 text-sm text-[#0D0D0D] placeholder:text-[#bbb] focus:outline-none bg-transparent"
          />
          <button
            onClick={save}
            disabled={saving || !value.trim() || value.trim() === initial}
            className="shrink-0 text-sm font-semibold text-white bg-[#0D0D0D] px-4 py-2.5 disabled:opacity-40 hover:opacity-80 transition-opacity">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    </div>
  )
}

export function CustomNameCard({ providerId, slug, canUse, initialDomain }: { providerId: string; slug: string; canUse: boolean; initialDomain: string | null }) {
  const [label, setLabel]             = useState(initialDomain ?? '')
  const [savedLabel, setSavedLabel]   = useState(initialDomain)
  const [saving, setSaving]           = useState(false)
  const [removing, setRemoving]       = useState(false)
  const [error, setError]             = useState('')
  const [avail, setAvail]             = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [copied, setCopied]           = useState(false)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'
  const vanityUrl  = savedLabel ? `https://${savedLabel}.${APP_DOMAIN}` : null

  function handleChange(val: string) {
    setLabel(val)
    setError('')
    setAvail('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = val.trim()
    if (!trimmed) return
    debounceRef.current = setTimeout(async () => {
      setAvail('checking')
      try {
        const res = await fetch(`/api/mychat/custom-domain?label=${encodeURIComponent(trimmed)}&providerId=${providerId}`)
        const data = await res.json()
        if (data.error) { setAvail('invalid'); setError(data.error); return }
        setAvail(data.available ? 'available' : 'taken')
        if (!data.available) setError('That name is already taken — try another')
      } catch {
        setAvail('idle')
      }
    }, 500)
  }

  async function save() {
    const trimmed = label.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mychat/custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, domain: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setLabel(data.domain)
      setSavedLabel(data.domain)
      setAvail('idle')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await fetch('/api/mychat/custom-domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      setLabel('')
      setSavedLabel(null)
      setAvail('idle')
      setError('')
    } finally {
      setRemoving(false)
    }
  }

  function copyUrl() {
    if (!vanityUrl) return
    navigator.clipboard.writeText(vanityUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const canSave = avail === 'available' || (label.trim() === savedLabel && !!savedLabel)

  return (
    <div className="px-4 pb-6">
      <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">Your custom link</p>
      <div className="rounded-2xl border border-[#E5E5E5] p-5 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <p className="font-bold text-[#0D0D0D] text-sm mb-0.5">Custom link</p>
            <p className="text-xs text-[#999]">
              {canUse
                ? `Pick a custom name for your page — it'll live at yourname.${APP_DOMAIN}`
                : 'Upgrade to Thrive to get a custom link for your page.'}
            </p>
          </div>
          {!canUse && (
            <span className="shrink-0 text-[10px] font-semibold bg-[#F5F5F5] text-[#999] px-2 py-0.5 rounded-full uppercase tracking-wide">Thrive+</span>
          )}
        </div>

        {canUse ? (
          <>
            {/* Input row */}
            <div className="flex items-center gap-0 mb-1 border border-[#E5E5E5] rounded-xl overflow-hidden focus-within:border-[#0D0D0D] transition-colors">
              <span className="pl-3.5 text-sm text-[#bbb] shrink-0 select-none">{APP_DOMAIN}/</span>
              <input
                type="text"
                placeholder={slug}
                value={label}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSave) save() }}
                className="flex-1 py-2.5 pr-2 text-sm text-[#0D0D0D] placeholder:text-[#bbb] focus:outline-none bg-transparent"
              />
              <button
                onClick={save}
                disabled={saving || !label.trim() || !canSave}
                className="shrink-0 text-sm font-semibold text-white bg-[#0D0D0D] px-4 py-2.5 disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Availability indicator */}
            {label.trim() && label.trim() !== savedLabel && (
              <p className={`text-[11px] mb-2 ${avail === 'available' ? 'text-[#22C55E]' : avail === 'checking' ? 'text-[#999]' : 'text-red-500'}`}>
                {avail === 'checking' ? 'Checking…'
                  : avail === 'available' ? `✓ ${label.trim()}.${APP_DOMAIN} is available`
                  : avail === 'taken' || avail === 'invalid' ? error
                  : ''}
              </p>
            )}

            {error && avail === 'idle' && <p className="text-red-500 text-xs mb-2">{error}</p>}

            {/* Live vanity URL display */}
            {vanityUrl && (
              <div className="mt-3 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-2">Your custom link is live</p>
                <div className="flex items-center gap-2">
                  <a
                    href={vanityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 font-mono text-[12px] text-[#0D0D0D] hover:underline break-all">
                    {vanityUrl}
                  </a>
                  <button
                    onClick={copyUrl}
                    className="shrink-0 text-[11px] font-semibold text-[#0D0D0D] bg-white border border-[#E5E5E5] rounded-lg px-2.5 py-1 hover:bg-[#F5F5F5] transition-colors">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-[#bbb] mt-2">
                  Also works as <span className="font-mono">{savedLabel}.{APP_DOMAIN}</span>
                </p>
                <button
                  onClick={remove}
                  disabled={removing}
                  className="mt-2 text-[11px] text-[#bbb] hover:text-red-500 transition-colors">
                  {removing ? 'Removing…' : 'Remove custom link'}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-[#bbb]">Available on the Thrive plan and above.</p>
        )}
      </div>
    </div>
  )
}
