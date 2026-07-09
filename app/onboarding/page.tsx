import { Suspense } from 'react'
import { getPlans, getPersonaFeatureMap } from '@/lib/plans'
import { getEnabledPersonas } from '@/lib/personas'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const [plans, personaRows, personaFeatureMap] = await Promise.all([
    getPlans(), getEnabledPersonas(), getPersonaFeatureMap(),
  ])
  const personas = personaRows.map(p => ({ id: p.id, emoji: p.emoji, label: p.label }))
  return (
    <Suspense>
      <OnboardingClient plans={plans} personas={personas} personaFeatureMap={personaFeatureMap} />
    </Suspense>
  )
}
