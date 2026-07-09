import { Suspense } from 'react'
import { getPlans } from '@/lib/plans'
import { getEnabledPersonas } from '@/lib/personas'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const [plans, personaRows] = await Promise.all([getPlans(), getEnabledPersonas()])
  const personas = personaRows.map(p => ({ id: p.id, emoji: p.emoji, label: p.label }))
  return (
    <Suspense>
      <OnboardingClient plans={plans} personas={personas} />
    </Suspense>
  )
}
