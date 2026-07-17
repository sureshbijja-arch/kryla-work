import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export default function MyChatRedirect({ params }: Props) {
  redirect(`/${params.slug}/mykryla`)
}
