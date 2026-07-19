import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEnabledPersonas } from '@/lib/personas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl, SITE_URL } from '@/lib/links'

export const revalidate = 3600

interface Props {
  params: { persona: string }
}

interface MemberRow {
  slug:       string
  first_name: string
  last_name:  string
  location:   string
  avatar_url: string | null
}

async function getPersonaLabel(personaId: string): Promise<string | null> {
  const personas = await getEnabledPersonas()
  return personas.find((p) => p.id === personaId)?.label ?? null
}

export async function generateStaticParams() {
  const personas = await getEnabledPersonas()
  return personas.map((p) => ({ persona: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const label = await getPersonaLabel(params.persona)
  if (!label) return { title: 'Not found' }

  return {
    title: { absolute: `${label}s on Kryla` },
    description: `Browse independent ${label.toLowerCase()}s with a live presence on Kryla.`,
    alternates: { canonical: `${SITE_URL}/directory/${params.persona}` },
  }
}

async function getMembers(personaId: string): Promise<MemberRow[]> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('slug, first_name, last_name, location, avatar_url')
    .eq('persona', personaId)
    .eq('page_live', true)
    .order('created_at', { ascending: false })

  return (data ?? []) as MemberRow[]
}

export default async function DirectoryPersonaPage({ params }: Props) {
  const label = await getPersonaLabel(params.persona)
  if (!label) return notFound()

  const members = await getMembers(params.persona)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kryla', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
      { '@type': 'ListItem', position: 3, name: `${label}s`, item: `${SITE_URL}/directory/${params.persona}` },
    ],
  }

  return (
    <main className="min-h-screen bg-kryla-bg px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-kryla-dark mb-8">{label}s on Kryla</h1>
        {members.length === 0 ? (
          <p className="text-kryla-muted">No {label.toLowerCase()}s are live yet.</p>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.slug}>
                <a
                  href={memberUrl(m.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-kryla-border bg-white p-4 transition-colors hover:border-kryla-dark"
                >
                  {m.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-semibold text-kryla-dark">{m.first_name} {m.last_name}</div>
                    {m.location && <div className="text-sm text-kryla-muted">{m.location}</div>}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
