import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  gu: 'Gujarati',
  es: 'Spanish',
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, language, setOnly } = body

  if (!providerId || !language) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify ownership
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Setting English (or just updating default) — no translation needed
  if (language === 'en' || setOnly) {
    await supabaseAdmin.from('providers').update({ page_language: language }).eq('id', providerId)
    return NextResponse.json({ ok: true, language })
  }

  const langName = LANG_NAMES[language]
  if (!langName) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })

  // Fetch live page content to translate
  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, translations')
    .eq('provider_id', providerId)
    .single()

  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

  const content = {
    headline:     page.headline     ?? '',
    subheadline:  page.subheadline  ?? '',
    bio:          page.bio          ?? '',
    cta_primary:  page.cta_primary  ?? '',
    cta_secondary: page.cta_secondary ?? '',
    services: (Array.isArray(page.services) ? page.services : []).map((s: Record<string, unknown>) => ({
      name: s.name ?? '', description: s.description ?? '',
    })),
    highlights: (Array.isArray(page.highlights) ? page.highlights : []).map((h: Record<string, unknown>) => ({
      title: h.title ?? '', body: h.body ?? '',
    })),
    faq: (Array.isArray(page.faq) ? page.faq : []).map((f: Record<string, unknown>) => ({
      question: f.question ?? '', answer: f.answer ?? '',
    })),
  }

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate the following JSON to ${langName}. Return ONLY valid JSON in exactly the same shape. Rules:
- Keep all JSON keys in English exactly as-is
- Do not translate proper nouns, brand names, currency, contact info
- Keep arrays the same length and order
- Do not add or remove fields

${JSON.stringify(content, null, 2)}`,
    }],
  })

  const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''
  let translated: Record<string, unknown>
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    translated = JSON.parse(match ? match[0] : raw)
  } catch {
    return NextResponse.json({ error: 'Translation parsing failed' }, { status: 500 })
  }

  const existing = ((page.translations ?? {}) as Record<string, unknown>)
  await Promise.all([
    supabaseAdmin.from('pages').update({ translations: { ...existing, [language]: translated } }).eq('provider_id', providerId),
    supabaseAdmin.from('providers').update({ page_language: language }).eq('id', providerId),
  ])

  return NextResponse.json({ ok: true, language })
}
