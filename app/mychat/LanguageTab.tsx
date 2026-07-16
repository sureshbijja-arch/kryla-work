'use client'

import { useState } from 'react'

const LANGUAGES = [
  { code: 'hi', label: 'Hindi',     native: 'हिंदी' },
  { code: 'ta', label: 'Tamil',     native: 'தமிழ்' },
  { code: 'te', label: 'Telugu',    native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada',   native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi',   native: 'मराठी' },
  { code: 'gu', label: 'Gujarati',  native: 'ગુજરાતી' },
  { code: 'es', label: 'Spanish',   native: 'Español' },
]

interface Props {
  providerId:      string
  currentLanguage: string
  isMobile?: boolean
}

export default function LanguageTab({ providerId, currentLanguage, isMobile = false }: Props) {
  const [active, setActive]       = useState(currentLanguage)
  const [translating, setTranslating] = useState<string | null>(null)
  const [done, setDone]           = useState<string | null>(null)
  const [error, setError]         = useState('')

  async function translate(code: string) {
    setTranslating(code)
    setError('')
    setDone(null)
    try {
      const res = await fetch('/api/mychat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, language: code }),
      })
      if (!res.ok) throw new Error('Failed')
      setActive(code)
      setDone(code)
      setTimeout(() => setDone(null), 3000)
    } catch {
      setError('Translation failed — please try again')
    } finally {
      setTranslating(null)
    }
  }

  async function setDefault(code: string) {
    setError('')
    try {
      await fetch('/api/mychat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, language: code, setOnly: true }),
      })
      setActive(code)
    } catch {
      setError('Failed to update language')
    }
  }

  return (
    <div className={`flex-1 overflow-y-auto${isMobile ? ' pwa-bottom-nav-clearance' : ''}`}>
      <div className="max-w-xl mx-auto px-4 py-6">

        <div className="mb-5">
          <p className="text-sm font-black text-[#0D0D0D]">Page language</p>
          <p className="text-xs text-[#999] mt-0.5 leading-relaxed">
            Translate your page so customers can read it in their language. A toggle appears on your live page — customers can switch between English and your chosen language.
          </p>
        </div>

        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

        {/* English */}
        <div className={`flex items-center justify-between px-4 py-3 mb-2 rounded-xl border ${
          active === 'en' ? 'border-[#0D0D0D] bg-white' : 'border-[#E5E5E5] bg-white'
        }`}>
          <div>
            <p className="text-sm font-semibold text-[#0D0D0D]">English</p>
            <p className="text-[10px] text-[#999] mt-0.5">Default — your original content</p>
          </div>
          {active === 'en' ? (
            <span className="text-[10px] font-black text-[#0D0D0D] uppercase tracking-wide">Active</span>
          ) : (
            <button onClick={() => setDefault('en')} className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] transition-colors">
              Set default
            </button>
          )}
        </div>

        {LANGUAGES.map(lang => {
          const isActive      = active === lang.code
          const isTranslating = translating === lang.code
          const isDone        = done === lang.code

          return (
            <div key={lang.code} className={`flex items-center justify-between px-4 py-3 mb-2 rounded-xl border transition-colors ${
              isActive ? 'border-[#0D0D0D] bg-white' : 'border-[#E5E5E5] bg-white'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0D0D0D]">{lang.native}</p>
                  <span className="text-[10px] text-[#999]">{lang.label}</span>
                </div>
                {isActive && (
                  <p className="text-[10px] text-[#22C55E] font-semibold mt-0.5">
                    Active · language toggle visible on your page
                  </p>
                )}
              </div>
              <button
                onClick={() => translate(lang.code)}
                disabled={translating !== null}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 ${
                  isDone
                    ? 'bg-[#22C55E] text-white'
                    : isActive
                    ? 'bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E5E5E5]'
                    : 'bg-[#0D0D0D] text-white hover:opacity-80'
                }`}>
                {isTranslating ? 'Translating…' : isDone ? '✓ Done' : isActive ? 'Retranslate' : 'Translate'}
              </button>
            </div>
          )
        })}

        <p className="text-[10px] text-[#CCC] text-center pt-6 pb-2">
          Re-translate after making changes to your page content and publishing
        </p>
      </div>
    </div>
  )
}
