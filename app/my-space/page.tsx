import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import SpaceClient from './SpaceClient'
import type { SectionEntry } from './SectionsTab'

export const dynamic = 'force-dynamic'

export default async function MySpacePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, persona, location, whatsapp_number, email, plan, plan_status, region, page_live')
    .eq('email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!provider) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-[#0D0D0D] font-semibold mb-2">No profile found</p>
          <p className="text-[#666666] text-sm">
            The email <span className="font-medium">{user.email}</span> isn&apos;t linked to a Kryla profile.
            Complete onboarding first.
          </p>
          <a href="/" className="mt-6 inline-block text-sm font-semibold text-[#F5A623] hover:underline">
            Go to kryla.work →
          </a>
        </div>
      </div>
    )
  }

  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode')
    .eq('provider_id', provider.id)
    .single()

  return (
    <SpaceClient
      providerId={provider.id}
      slug={provider.slug}
      firstName={provider.first_name}
      pageLive={provider.page_live ?? false}
      plan={provider.plan ?? 'seed'}
      planStatus={provider.plan_status ?? 'active'}
      region={(provider.region as 'india' | 'usa') ?? 'india'}
      currentProfile={{
        firstName: provider.first_name,
        lastName: provider.last_name,
        persona: provider.persona,
        location: provider.location,
        whatsappNumber: provider.whatsapp_number,
        email: provider.email,
        headline: page?.headline ?? '',
        subheadline: page?.subheadline ?? '',
        bio: page?.bio ?? '',
        ctaPrimary: page?.cta_primary ?? '',
        ctaSecondary: page?.cta_secondary ?? '',
        services: page?.services ?? [],
        highlights: page?.highlights ?? [],
        faq: page?.faq ?? [],
        palette: page?.palette ?? 'professional',
        font: page?.font ?? 'inter',
        template: page?.template ?? 'focus',
        showSections: page?.show_sections ?? {
          hero: true, services: true, highlights: true,
          booking: true, faq: true, contact: true,
        },
        sections: (page?.sections as SectionEntry[] | null) ?? null,
        designMode: (page?.design_mode as string) ?? 'craft',
      }}
    />
  )
}
