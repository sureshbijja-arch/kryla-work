import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'kryla' })

export interface BuildPageJobPayload {
  providerId: string
  slug: string
  persona: string
  firstName: string
  lastName: string
  tagline: string
  location: string
  plan: string
}

export const BUILD_PAGE_EVENT = 'kryla/page.build.requested'

export interface GeneratePersonaPayload {
  personaName: string
  providerId: string
  slug: string
}

export const GENERATE_PERSONA_EVENT = 'kryla/persona.template.generate'

export const BILLING_PAYMENT_FAILED_EVENT  = 'kryla/billing.payment.failed'

// Emitted by /api/mychat/student-sessions POST when sendFollowup=true
export const CONSULTATION_LOGGED_EVENT = 'kryla/consultation.logged'

export interface ConsultationLoggedPayload {
  providerId: string
  studentId:  string
  sessionId:  string
}

export interface BillingPaymentFailedPayload {
  providerId:   string
  failureCount: number       // 1 = first missed month, 2 = second consecutive
  periodEnd:    string | null // ISO timestamp — billing period end date
  email:        string | null
  firstName:    string | null
  slug:         string
}
