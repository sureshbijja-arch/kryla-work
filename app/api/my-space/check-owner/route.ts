import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ isOwner: false })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ isOwner: false })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, persona, location, whatsapp_number, email, plan, plan_status, region, page_live')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ isOwner: false })

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections')
    .eq('provider_id', provider.id)
    .single()

  return NextResponse.json({
    isOwner: true,
    provider: {
      id: provider.id,
      slug: provider.slug,
      firstName: provider.first_name,
      lastName: provider.last_name,
      persona: provider.persona,
      location: provider.location,
      whatsappNumber: provider.whatsapp_number,
      plan: provider.plan ?? 'seed',
      planStatus: provider.plan_status ?? 'active',
      region: (provider.region ?? 'india') as 'india' | 'usa',
      pageLive: provider.page_live ?? false,
    },
    currentProfile: page ? {
      firstName: provider.first_name,
      lastName: provider.last_name,
      persona: provider.persona,
      location: provider.location,
      whatsappNumber: provider.whatsapp_number,
      email: provider.email,
      headline: page.headline ?? '',
      subheadline: page.subheadline ?? '',
      bio: page.bio ?? '',
      ctaPrimary: page.cta_primary ?? '',
      ctaSecondary: page.cta_secondary ?? '',
      services: Array.isArray(page.services) ? page.services : [],
      highlights: Array.isArray(page.highlights) ? page.highlights : [],
      faq: Array.isArray(page.faq) ? page.faq : [],
      palette: page.palette ?? 'professional',
      font: page.font ?? 'inter',
      template: page.template ?? 'focus',
      showSections: page.show_sections ?? {},
    } : null,
  })
}
