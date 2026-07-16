'use client'

import { useState, useEffect } from 'react'
import ShareAppCard from './components/ShareAppCard'

interface Props {
  providerId: string
  initialCode: string | null
  slug: string
}

export default function ReferTab({ providerId, initialCode, slug }: Props) {
  const [code,           setCode]           = useState(initialCode ?? '')
  const [savedCode,      setSavedCode]      = useState(initialCode)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [saved,          setSaved]          = useState(false)
  const [referralCount,  setReferralCount]  = useState<number | null>(null)
  const [copied,         setCopied]         = useState(false)

  useEffect(() => {
    fetch(`/api/mychat/referral-code?providerId=${encodeURIComponent(providerId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.code)          setSavedCode(data.code)
        if (data.code)          setCode(data.code)
        if (data.referralCount !== undefined) setReferralCount(data.referralCount)
      })
      .catch(() => {})
  }, [providerId])

  function handleInput(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    setCode(clean)
    setSaved(false)
    setError('')
  }

  async function handleSave() {
    if (code.length !== 5) { setError('Code must be exactly 5 characters'); return }
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res  = await fetch('/api/mychat/referral-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setSavedCode(data.code)
      setCode(data.code)
      setSaved(true)
    } catch {
      setError('Something went wrong — try again')
    } finally {
      setSaving(false)
    }
  }

  function copyShareText() {
    if (!savedCode) return
    const text = `Join me on Kryla — use invite code ${savedCode} at kryla.work/join`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {})
  }

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://kryla.work'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-5 max-w-2xl mx-auto w-full space-y-6">

        <ShareAppCard slug={slug} />

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D] mb-1">Your invite code</p>
          <p className="text-xs text-[#666]">Share this code with people you want to invite to Kryla. They enter it at <span className="font-semibold text-[#0D0D0D]">kryla.work/join</span> to get started.</p>
        </div>

        {/* Code input */}
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => handleInput(e.target.value)}
              placeholder="e.g. LUCKY"
              maxLength={5}
              className="flex-1 border border-[#E5E5E5] rounded-xl px-4 py-3 text-center text-xl font-black uppercase tracking-[0.25em] focus:outline-none focus:border-[#0D0D0D] transition-colors placeholder:text-[#CCC] placeholder:tracking-widest placeholder:text-base"
            />
            <button
              onClick={handleSave}
              disabled={saving || code.length !== 5}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#0D0D0D] hover:opacity-80 disabled:opacity-40 transition-opacity whitespace-nowrap">
              {saving ? 'Saving…' : savedCode ? 'Update' : 'Save code'}
            </button>
          </div>
          <p className="text-[10px] text-[#999] mt-2">5 letters or numbers, your choice — e.g. LUCKY, GT123, MARY5</p>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          {saved && <p className="text-green-600 text-xs mt-1">Code saved ✓</p>}
        </div>

        {/* Share card — only shown when code is set */}
        {savedCode && (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1">Your code</p>
                <p className="text-3xl font-black tracking-[0.2em] text-[#0D0D0D]">{savedCode}</p>
              </div>
              {referralCount !== null && (
                <div className="text-right">
                  <p className="text-2xl font-black text-[#0D0D0D]">{referralCount}</p>
                  <p className="text-[10px] text-[#999] font-semibold uppercase tracking-wide">joined with your code</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#F0F0F0] pt-4">
              <p className="text-xs text-[#666] mb-3 font-medium">Share with someone you know:</p>
              <div className="bg-[#FAFAFA] rounded-xl px-4 py-3 text-sm text-[#444] font-medium border border-[#F0F0F0]">
                Join me on Kryla — use invite code <span className="font-black text-[#0D0D0D]">{savedCode}</span> at{' '}
                <span className="text-[#0D0D0D] font-semibold">{APP_URL}/join</span>
              </div>
              <button
                onClick={copyShareText}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors text-[#0D0D0D]">
                {copied ? '✓ Copied to clipboard!' : 'Copy invite message'}
              </button>
            </div>

            {/* WhatsApp share */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join me on Kryla — use invite code ${savedCode} at ${APP_URL}/join`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#25D366' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L0 24l6.336-1.51A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.001-1.374l-.36-.214-3.732.888.938-3.63-.235-.374A9.773 9.773 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
              </svg>
              Share on WhatsApp
            </a>
          </div>
        )}

        {/* Explanation box */}
        <div className="rounded-xl bg-[#FAFAFA] border border-[#F0F0F0] px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-[#0D0D0D]">How referrals work</p>
          <ul className="space-y-1.5 text-xs text-[#666]">
            <li className="flex items-start gap-2"><span className="text-[#F5A623] font-bold mt-0.5">1</span> Share your code with friends, family, or fellow professionals</li>
            <li className="flex items-start gap-2"><span className="text-[#F5A623] font-bold mt-0.5">2</span> They visit kryla.work/join and enter your code</li>
            <li className="flex items-start gap-2"><span className="text-[#F5A623] font-bold mt-0.5">3</span> Once they join, their membership is linked to you — building a trusted Kryla community</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
