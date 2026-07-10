import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ComplianceCopy {
  bci_disclaimer:   string
  privilege_notice: string
  intake_cta_label: string
}

export const DEFAULT_COMPLIANCE_COPY: ComplianceCopy = {
  bci_disclaimer:
    'This page is for informational purposes only and does not constitute legal advice, solicitation, or advertising within the meaning of the Bar Council of India Rules. The information provided is not a substitute for legal counsel. Contacting this office does not create an advocate-client relationship.',
  privilege_notice:
    'All communications through this intake form are confidential and protected by attorney-client privilege. Information shared will only be used to assess your legal matter.',
  intake_cta_label: 'Contact the office',
}

export async function getComplianceCopy(admin: typeof supabaseAdmin): Promise<ComplianceCopy> {
  const { data } = await admin
    .from('system_config')
    .select('value')
    .eq('key', 'compliance_copy')
    .single()
  const dbCopy = (data?.value ?? {}) as Partial<ComplianceCopy>
  return { ...DEFAULT_COMPLIANCE_COPY, ...dbCopy }
}
