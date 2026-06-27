import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { inngest, BUILD_PAGE_EVENT } from '@/lib/inngest'
import { validateSlug, RESERVED_SLUGS } from '@/lib/slug'
import type { OnboardingAnswers } from '@/types/onboarding'

export async function POST(req: NextRequest) {
  let body: OnboardingAnswers
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { persona, firstName, lastName, tagline, location, slug, whatsappCountryCode, whatsappNumber, email, plan, region } = body

  if (!persona || !firstName || !slug || !plan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'That slug is reserved' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'That address was just taken — pick another' }, { status: 409 })
  }

  const whatsapp = whatsappNumber
    ? `${whatsappCountryCode || '+1'}${whatsappNumber.replace(/\D/g, '')}`
    : null

  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .insert({
      slug,
      first_name: firstName.trim(),
      last_name: lastName?.trim() || '',
      persona,
      location: location?.trim() || '',
      whatsapp_number: whatsapp,
      email: email?.trim() || null,
      plan,
      plan_status: plan === 'seed' ? 'active' : 'pending_payment',
      region,
      page_live: false,
      verified: false,
    })
    .select('id')
    .single()

  if (providerError || !provider) {
    console.error('[submit] Provider insert error:', providerError)
    return NextResponse.json({ error: "Something went wrong on our end — we're on it" }, { status: 500 })
  }

  const providerId = provider.id

  await supabase.from('onboarding_answers').insert({
    provider_id: providerId,
    persona,
    first_name: firstName.trim(),
    last_name: lastName?.trim() || '',
    tagline: tagline?.trim() || '',
    location: location?.trim() || '',
    slug,
    whatsapp_number: whatsapp,
    plan,
    region,
  })

  try {
    await inngest.send({
      name: BUILD_PAGE_EVENT,
      data: {
        providerId,
        slug,
        persona,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || '',
        tagline: tagline?.trim() || '',
        location: location?.trim() || '',
        plan,
      },
    })
  } catch (err) {
    console.error('[submit] Inngest send error:', err)
  }

  return NextResponse.json({ ok: true, providerId, slug, presenceUrl: `https://${slug}.kryla.work` })
}
