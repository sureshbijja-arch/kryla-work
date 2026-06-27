/**
 * Shared TypeScript types derived directly from the Supabase schema.
 * Column names must match references/database.md exactly.
 */

export type Plan = "seed" | "sprout" | "grow" | "thrive" | "elevate"

export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled"

export type SupportTicketStatus = "open" | "ai_resolved" | "escalated" | "closed"

export type NotificationChannel = "whatsapp" | "email" | "sms"

export type PageEventType = "page_view" | "booking_click" | "whatsapp_click"

// ── Database row shapes ───────────────────────────────────────

export interface Provider {
  id: string
  slug: string
  name: string
  email: string
  phone: string | null
  plan: Plan
  plan_status: "active" | "past_due" | "cancelled"
  stripe_customer_id: string | null
  razorpay_customer_id: string | null
  custom_domain: string | null
  verified: boolean
  page_live: boolean
  persona: string
  city: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  provider_id: string          // FK → providers.id
  services: Service[]          // jsonb
  highlights: Highlight[]      // jsonb
  palette: string
  font: "inter" | "georgia" | "trebuchet"
  template: "focus" | "portfolio" | "clinic" | "storefront" | "premium"
  seo_title: string
  seo_description: string
  show_sections: Record<string, boolean>
  custom_css: string | null
  build_version: number
  created_at: string
  updated_at: string
}

export interface Service {
  name: string
  description: string
  price?: string
  duration?: string
}

export interface Highlight {
  icon?: string
  label: string
  value: string
}

export interface OnboardingAnswers {
  id: string
  provider_id: string
  persona: string
  answers: Record<string, string>   // the 5 Q&A pairs
  claude_prompt: string | null      // raw prompt sent to Claude — for debugging
  claude_response: string | null    // raw response from Claude — for debugging
  created_at: string
}

export interface Booking {
  id: string
  provider_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  service: string
  preferred_date: string | null
  message: string | null
  status: BookingStatus
  notification_sent: boolean
  confirmation_sent: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  provider_id: string
  booking_id: string | null
  channel: NotificationChannel
  recipient: string
  message: string
  delivery_status: "queued" | "sent" | "delivered" | "failed"
  created_at: string
}

export interface SupportTicket {
  id: string
  provider_id: string
  conversation: ConversationMessage[]  // jsonb
  status: SupportTicketStatus
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: "member" | "ai" | "human"
  content: string
  timestamp: string
}

export interface PageEvent {
  id: string
  provider_id: string
  event_type: PageEventType
  referrer: string | null
  created_at: string
}
