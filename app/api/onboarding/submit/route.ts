import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { inngest, BUILD_PAGE_EVENT, GENERATE_PERSONA_EVENT } from '@/lib/inngest'
import { validateSlug, RESERVED_SLUGS } from '@/lib/slug'
import { getPlans } from '@/lib/plans'
import { inferCountry } from '@/lib/researchPrompt'
import { isCopyWebsiteAllowed } from '@/lib/copywebsite'
import type { OnboardingAnswers } from '@/types/onboarding'

export async function POST(req: NextRequest) {
  let body: OnboardingAnswers
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { persona, firstName, lastName, tagline, location, slug, whatsappCountryCode, whatsappNumber, whatsappPublic, email, plan, region } = body
  const rawReferredBy    = (body as unknown as Record<string, unknown>).referredBy
  const referredBy       = typeof rawReferredBy === 'string' ? rawReferredBy.trim().toUpperCase().slice(0, 5) : null
  const rawCustomPersona = (body as unknown as Record<string, unknown>).customPersonaName
  const customPersonaName = typeof rawCustomPersona === 'string' ? rawCustomPersona.trim() : ''
  const rawSourceUrl = (body as unknown as Record<string, unknown>).sourceUrl
  const sourceUrl = typeof rawSourceUrl === 'string' ? rawSourceUrl.trim() : ''
  const normalizedPersonaName = persona === 'other' && customPersonaName.length >= 2
    ? customPersonaName.slice(0, 60).toLowerCase()
    : undefined

  if (!persona || !firstName || !slug || !plan || !email?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'That slug is reserved' }, { status: 400 })
  }

  // Validate that the submitted plan is currently active
  const activePlans = await getPlans()
  const activePlanIds = activePlans.map(p => p.id)
  if (!activePlanIds.includes(plan)) {
    return NextResponse.json({ error: 'The selected plan is no longer available — please go back and choose an available plan' }, { status: 400 })
  }

  // Derive region from location if not explicitly set by the client
  const derivedCountry = inferCountry(location?.trim() || '')
  const effectiveRegion = region ?? (derivedCountry === 'IN' ? 'india' : 'usa')

  const supabase = createServerClient()

  console.log('[submit] 1. starting for slug:', slug)

  const { data: existing } = await supabase
    .from('providers')
    .select('id, slug, page_live')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    console.log('[submit] existing provider found:', existing.id, 'page_live:', existing.page_live)
    if (existing.page_live) {
      return NextResponse.json({ ok: true, providerId: existing.id, slug: existing.slug })
    }
    try {
      await inngest.send({
        name: BUILD_PAGE_EVENT,
        data: {
          providerId: existing.id, slug: existing.slug, persona,
          firstName: firstName.trim(), lastName: lastName?.trim() || '',
          tagline: tagline?.trim() || '', location: location?.trim() || '', plan,
        },
      })
      console.log('[submit] re-sent Inngest for existing provider:', existing.id)
    } catch (err) {
      console.error('[submit] Inngest re-send failed:', JSON.stringify(err))
    }
    return NextResponse.json({ ok: true, providerId: existing.id, slug: existing.slug })
  }

  console.log('[submit] 2. no existing provider, inserting...')

  // Store as bare digits (no + or spaces) to match Meta webhook msg.from format
  const whatsapp = whatsappNumber
    ? `${whatsappCountryCode || '+1'}${whatsappNumber}`.replace(/\D/g, '')
    : null

  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .insert({
      slug,
      first_name: firstName.trim(),
      last_name: lastName?.trim() || '',
      persona,
      custom_persona_name: normalizedPersonaName ?? null,
      location: location?.trim() || '',
      whatsapp_number: whatsapp,
      whatsapp_public: whatsappPublic !== false,
      email: email?.trim().toLowerCase() || null,
      plan,
      plan_status: 'trialing',
      // First charge deferred to end of 3-month trial. Card can be added anytime
      // during the trial; the first charge will still land at trial_ends_at.
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      referred_by: referredBy || null,
      region: effectiveRegion,
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
  console.log('[submit] 3. provider inserted:', providerId)

  console.log('[submit] 4. saving answers...')
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
      email: email?.trim().toLowerCase() || null,
      plan,
      region: effectiveRegion,
    })
    console.log('[submit] 5. answers saved')
  } catch (err) {
    console.error('[submit] answers insert failed:', JSON.stringify(err))
    // Non-fatal — provider row exists, build can still proceed
  }

  // CopyWebsite: capture a request if the member pasted a URL AND their referral
  // code is allowlisted. Re-checked server-side so a spoofed client can't file
  // one — this never builds/fetches anything, it just queues it for admin review.
  if (sourceUrl) {
    try {
      const allowed = await isCopyWebsiteAllowed(referredBy)
      if (allowed) {
        await supabase.from('website_copy_requests').insert({
          provider_id: providerId,
          slug,
          source_url: sourceUrl,
        })
        console.log('[submit] copywebsite request captured for:', providerId)
      }
    } catch (err) {
      console.error('[submit] copywebsite request insert failed:', JSON.stringify(err))
      // Non-fatal — provider row exists, build can still proceed
    }
  }

  // Insert persona_templates row BEFORE firing build-page (spec constraint)
  let shouldFireGenerate = false
  if (normalizedPersonaName) {
    try {
      const { data: ptExisting } = await supabase
        .from('persona_templates')
        .select('persona_name')
        .eq('persona_name', normalizedPersonaName)
        .maybeSingle()

      if (!ptExisting) {
        const { error: insertError } = await supabase
          .from('persona_templates')
          .insert({ persona_name: normalizedPersonaName })
        if (!insertError) {
          shouldFireGenerate = true
          console.log('[submit] persona_templates row created for:', normalizedPersonaName)
        } else if (insertError.code !== '23505') {
          console.error('[submit] persona_templates insert failed:', insertError.message)
        }
      } else {
        console.log('[submit] persona_templates already exists for:', normalizedPersonaName)
      }
    } catch (err) {
      console.error('[submit] persona_templates handling failed:', JSON.stringify(err))
    }
  }

  console.log('[submit] 6. sending to Inngest...')
  try {
    await inngest.send({
      name: BUILD_PAGE_EVENT,
      data: {
        providerId, slug, persona,
        firstName: firstName.trim(), lastName: lastName?.trim() || '',
        tagline: tagline?.trim() || '', location: location?.trim() || '', plan,
      },
    })
    console.log('[submit] 7. Inngest build event sent')
  } catch (err) {
    console.error('[submit] Inngest send failed:', JSON.stringify(err))
  }

  if (shouldFireGenerate && normalizedPersonaName) {
    try {
      await inngest.send({
        name: GENERATE_PERSONA_EVENT,
        data: { personaName: normalizedPersonaName, providerId, slug },
      })
      console.log('[submit] generate-persona event sent for:', normalizedPersonaName)
    } catch (err) {
      console.error('[submit] generate-persona send failed:', JSON.stringify(err))
    }
  }

  return NextResponse.json({ ok: true, providerId, slug, presenceUrl: `https://${slug}.kryla.work` })
}
