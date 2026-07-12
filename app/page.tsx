export const dynamic = 'force-dynamic'

import { getPlans } from '@/lib/plans'
import { getEnabledPersonas } from '@/lib/personas'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const [plans, enabledPersonas] = await Promise.all([getPlans(), getEnabledPersonas()])
  const enabledPersonaIds = enabledPersonas.map(p => p.id)
  return <HomeClient plans={plans} enabledPersonaIds={enabledPersonaIds} />
}
