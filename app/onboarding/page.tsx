import { Suspense } from 'react'
import { getPlans } from '@/lib/plans'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const plans = await getPlans()
  return (
    <Suspense>
      <OnboardingClient plans={plans} />
    </Suspense>
  )
}
