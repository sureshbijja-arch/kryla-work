export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getPlans } from '@/lib/plans'
import { getEnabledPersonas } from '@/lib/personas'
import { SITE_URL } from '@/lib/links'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: { absolute: 'Kryla.work — One platform, built around your craft' },
  description: 'Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.',
  alternates: { canonical: SITE_URL },
}

export default async function HomePage() {
  const [plans, enabledPersonas] = await Promise.all([getPlans(), getEnabledPersonas()])
  const enabledPersonaIds = enabledPersonas.map(p => p.id)
  return <HomeClient plans={plans} enabledPersonaIds={enabledPersonaIds} />
}
