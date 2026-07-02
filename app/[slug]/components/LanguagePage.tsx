'use client'

import { useState, useEffect } from 'react'
import LayoutRenderer from './LayoutRenderer'
import StudioTemplate from './templates/StudioTemplate'
import FocusTemplate from './templates/FocusTemplate'
import PortfolioTemplate from './templates/PortfolioTemplate'
import StorefrontTemplate from './templates/StorefrontTemplate'
import ClinicTemplate from './templates/ClinicTemplate'
import type { ProfileData } from '../types'
import type { SectionEntry } from './LayoutRenderer'

type TranslationEntry = {
  headline?: string
  subheadline?: string
  bio?: string
  cta_primary?: string
  cta_secondary?: string
  services?: { name?: string; description?: string }[]
  highlights?: { title?: string; body?: string }[]
  faq?: { question?: string; answer?: string }[]
}

const LANG_LABELS: Record<string, string> = {
  hi: 'हिंदी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  es: 'Español',
}

function merge(profile: ProfileData, t: TranslationEntry): ProfileData {
  return {
    ...profile,
    headline:     t.headline     ?? profile.headline,
    subheadline:  t.subheadline  ?? profile.subheadline,
    bio:          t.bio          ?? profile.bio,
    ctaPrimary:   t.cta_primary  ?? profile.ctaPrimary,
    ctaSecondary: t.cta_secondary ?? profile.ctaSecondary,
    services: profile.services.map((s, i) => ({
      ...s,
      name:        t.services?.[i]?.name        ?? s.name,
      description: t.services?.[i]?.description ?? s.description,
    })),
    highlights: profile.highlights.map((h, i) => ({
      ...h,
      title: t.highlights?.[i]?.title ?? h.title,
      body:  t.highlights?.[i]?.body  ?? h.body,
    })),
    faq: profile.faq.map((f, i) => ({
      ...f,
      question: t.faq?.[i]?.question ?? f.question,
      answer:   t.faq?.[i]?.answer   ?? f.answer,
    })),
  }
}

interface Props {
  profileData:  ProfileData
  translations: Record<string, TranslationEntry>
  defaultLang:  string
  pageSections: SectionEntry[] | null
  template:     string
  isTutor:      boolean
}

export default function LanguagePage({ profileData, translations, defaultLang, pageSections, template, isTutor }: Props) {
  const [lang, setLang] = useState(defaultLang)

  useEffect(() => {
    const stored = localStorage.getItem(`klang_${profileData.providerId}`)
    if (stored === 'en' || (stored && translations[stored])) setLang(stored)
  }, [profileData.providerId, translations])

  const hasTranslation = defaultLang !== 'en' && !!translations[defaultLang]
  const data = (lang !== 'en' && translations[lang]) ? merge(profileData, translations[lang]) : profileData

  function toggle() {
    const next = lang === 'en' ? defaultLang : 'en'
    setLang(next)
    localStorage.setItem(`klang_${profileData.providerId}`, next)
  }

  return (
    <>
      {pageSections ? (
        <LayoutRenderer sections={pageSections} data={data} />
      ) : isTutor ? (
        <StudioTemplate data={data} />
      ) : template === 'portfolio' ? (
        <PortfolioTemplate data={data} />
      ) : template === 'storefront' ? (
        <StorefrontTemplate data={data} />
      ) : template === 'clinic' ? (
        <ClinicTemplate data={data} />
      ) : (
        <FocusTemplate data={data} />
      )}

      {hasTranslation && (
        <button
          onClick={toggle}
          aria-label="Toggle page language"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-[#E5E5E5] shadow-md rounded-full px-4 py-2 text-xs font-semibold hover:shadow-lg transition-shadow">
          <span className={lang === 'en' ? 'text-[#0D0D0D]' : 'text-[#BBB]'}>EN</span>
          <span className="text-[#DDD]">|</span>
          <span className={lang !== 'en' ? 'text-[#0D0D0D]' : 'text-[#BBB]'}>
            {LANG_LABELS[defaultLang] ?? defaultLang.toUpperCase()}
          </span>
        </button>
      )}
    </>
  )
}
