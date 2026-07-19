import type { Metadata } from 'next'
import Link from 'next/link'
import { getEnabledPersonas } from '@/lib/personas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/links'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Browse professionals — Kryla',
  description: 'Find tutors, bakers, advocates, and other independent professionals on Kryla.',
  alternates: { canonical: `${SITE_URL}/directory` },
}

async function getPersonaCounts(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('persona')
    .eq('page_live', true)

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { persona: string }[]) {
    counts[row.persona] = (counts[row.persona] ?? 0) + 1
  }
  return counts
}

export default async function DirectoryPage() {
  const [personas, counts] = await Promise.all([getEnabledPersonas(), getPersonaCounts()])
  const listed = personas.filter((p) => (counts[p.id] ?? 0) > 0)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listed.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/directory/${p.id}`,
      name: p.label,
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kryla', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
    ],
  }

  return (
    <main className="min-h-screen bg-kryla-bg px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-kryla-dark mb-8">Browse professionals</h1>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listed.map((p) => (
            <li key={p.id}>
              <Link
                href={`/directory/${p.id}`}
                className="block rounded-2xl border border-kryla-border bg-white p-4 transition-colors hover:border-kryla-dark"
              >
                <span className="text-2xl">{p.emoji}</span>
                <div className="font-semibold text-kryla-dark">{p.label}</div>
                <div className="text-sm text-kryla-muted">{counts[p.id]} listed</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
