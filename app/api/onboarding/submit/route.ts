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
    const code = providerError?.code
    if (code === '23505') {
      return NextResponse.json({ error: 'That address is already taken — try a different one' }, { status: 409 })
    }
    if (code === '23502') {
      console.error('[submit] Not-null violation:', providerError)
      return NextResponse.json({ error: 'Some required information is missing — please go back and check' }, { status: 400 })
    }
    if (code === '23503') {
      return NextResponse.json({ error: 'Something went wrong linking your account — please try again' }, { status: 500 })
    }
    console.error('[submit] Provider insert error:', providerError?.code, providerError?.message, providerError?.details)
    return NextResponse.json({ error: "Something went wrong on our end — we're on it" }, { status: 500 })
  }

  const providerId = provider.id
  console.log('[submit] Provider inserted:', providerId, slug)

  try {
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
    console.log('[submit] Answers saved for:', providerId)
  } catch (err) {
    console.error('[submit] Answers insert failed:', JSON.stringify(err))
    // Non-fatal — provider row exists, build can still proceed
  }

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
    console.log('[submit] Inngest event sent for:', providerId)
  } catch (err) {
    console.error('[submit] Inngest send failed:', JSON.stringify(err))
    // Non-fatal — member is created, build will be retried or triggered manually
  }

  return NextResponse.json({ ok: true, providerId, slug, presenceUrl: `https://${slug}.kryla.work` })
}
