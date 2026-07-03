import { getPlans } from '@/lib/plans'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const plans = await getPlans()
  return <HomeClient plans={plans} />
}
