# Kryla.work — Platform Architecture

> Full architecture details to be expanded here.
> See CLAUDE.md for the summary overview.

## 5-Layer Platform

### 1. Public Layer
The Member's presence that their Customers see.
- Member profile (slug.kryla.work)
- Business inquiry / booking form
- Booking confirmation page

### 2. Member Layer
Where Members manage their business.
- Booking inbox (accept/reject)
- WhatsApp-based page updates
- How their business is doing (analytics)

### 3. Platform Core
- **Vertical Config Engine** — JSON config per persona, activates right features/questions/templates
- **Booking Engine** — receives, routes, notifies, confirms
- **Notification Service** — WhatsApp + email + SMS, with retry logic
- **AI Page Generator** — Claude API via Inngest queue
- **Domain Manager** — wildcard DNS → custom domain pipeline
- **Billing** — Stripe (USA) + Razorpay (India)

### 4. Infrastructure
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (hosting + edge functions)
- Cloudflare (DNS + SSL + CDN + WAF)
- Inngest (background job queue)

### 5. Operations Layer
- Onboarding flow (5 questions → live profile)
- AI support chatbot (Claude, 80% resolution)
- Admin panel
- Uptime monitoring (Uptime Robot)

## Key Routing: middleware.ts

`middleware.ts` is the most critical file. It reads the subdomain from every request and routes it internally:
- `priya.kryla.work` → `/priya` (member profile)
- `kryla.work` → `/` (landing page)
- `kryla.work/onboarding` → `/onboarding`

Never bypass middleware for subdomain routing.

## Data Flow: Page Generation

1. Member completes 5-question onboarding
2. API route `/api/onboarding` receives answers
3. Answers saved to `onboarding_answers` table immediately
4. Inngest job queued (user sees "Building your profile..." — max 200ms wait)
5. Inngest worker calls Claude API with persona-specific prompt
6. Claude returns structured JSON (services, highlights, palette, template, copy)
7. `pages` table updated with generated content
8. `providers.page_live = true`
9. Member WhatsApp: "You're live! Here's your link → priya.kryla.work"

## Vertical Config Engine

Each persona has a JSON config file. Example:

```json
{
  "persona": "tutor",
  "onboarding_questions": [
    "What subjects do you teach?",
    "What age groups do you work with?",
    "Where are you based?",
    "What are your rates?",
    "What makes you different?"
  ],
  "features": ["booking", "reviews", "batch_groups"],
  "template_default": "focus",
  "schema_type": "EducationalOrganization"
}
```

One codebase reads the config. Never fork the codebase per persona.
