/**
 * /consent/[token] — Public, unauthenticated consent withdrawal page.
 * Client visits this URL (from WhatsApp message footer) to withdraw WhatsApp consent.
 */

import { notFound }     from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ConsentWithdrawPanel from './ConsentWithdrawPanel'

interface Props {
  params: { token: string }
}

export default async function ConsentWithdrawPage({ params }: Props) {
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, name, whatsapp_consent, pii_erased_at, provider:providers!provider_id(first_name, last_name)')
    .eq('consent_token', params.token)
    .single()

  if (!student) return notFound()

  const provider = student.provider as unknown as { first_name: string; last_name: string } | null
  const advocateName = provider ? `${provider.first_name} ${provider.last_name}` : 'your advocate'

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-[#E5E5E5] rounded-2xl p-8 shadow-sm">
        <div className="text-3xl mb-4">⚖️</div>
        <h1 className="text-lg font-bold text-[#0D0D0D] mb-1">WhatsApp consent</h1>
        <p className="text-sm text-[#666] mb-6">
          You gave consent for {advocateName}&apos;s office to contact you on WhatsApp.
        </p>

        {student.pii_erased_at ? (
          <p className="text-sm text-[#888] bg-[#F5F5F5] rounded-xl px-4 py-3">
            Your data has already been erased. No further messages will be sent.
          </p>
        ) : (
          <ConsentWithdrawPanel
            token={params.token}
            alreadyWithdrawn={!student.whatsapp_consent}
          />
        )}
      </div>
    </div>
  )
}
