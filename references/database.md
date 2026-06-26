# Kryla.work — Database Schema

All tables live in Supabase (Postgres). Schema file: `db/supabase_schema.sql`.

## Table: providers

One row per Member.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| slug | text | unique, URL-safe, e.g. "priyasharma" |
| name | text | Display name |
| phone | text | WhatsApp number with country code |
| email | text | Optional |
| persona | text | "tutor", "baker", "trainer", etc. |
| plan | text | seed \| sprout \| grow \| thrive \| elevate |
| plan_status | text | active \| past_due \| cancelled |
| stripe_customer_id | text | USA payments |
| razorpay_customer_id | text | India payments |
| custom_domain | text | null until Grow plan |
| verified | boolean | Phone OTP verified |
| page_live | boolean | Profile visible publicly |
| city | text | |
| country | text | "IN" or "US" |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Table: pages

Claude-generated content. One row per provider.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| headline | text | Main headline copy |
| bio | text | About section |
| services | jsonb | Array of {name, description, price, duration} |
| highlights | jsonb | Array of key selling points |
| palette | text | professional \| fresh \| warm \| minimal \| creative \| calm |
| font | text | inter \| georgia \| trebuchet |
| template | text | focus \| portfolio \| clinic \| storefront \| premium |
| seo_title | text | |
| seo_description | text | |
| show_sections | jsonb | {about: true, services: true, reviews: true, ...} |
| custom_css | text | Thrive+ only |
| build_version | int | Increments on each AI rebuild |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Table: onboarding_answers

Raw answers from the 5-question onboarding. Kept for debugging + AI retraining.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| answers | jsonb | {q1: "...", q2: "...", q3: "...", q4: "...", q5: "..."} |
| raw_prompt | text | Full prompt sent to Claude |
| raw_response | text | Full response from Claude |
| created_at | timestamptz | |

## Table: bookings

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| customer_name | text | |
| customer_phone | text | |
| customer_email | text | Optional |
| service | text | Which service they booked |
| requested_date | date | |
| requested_time | text | |
| message | text | Optional note from customer |
| status | text | pending \| accepted \| rejected \| cancelled |
| notification_sent | boolean | WhatsApp to provider sent |
| confirmation_sent | boolean | WhatsApp to customer sent |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Table: notifications

Log of every outbound message.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| booking_id | uuid | FK → bookings.id, nullable |
| channel | text | whatsapp \| email \| sms |
| recipient | text | Phone or email |
| message | text | Full message body |
| status | text | queued \| sent \| delivered \| failed |
| error | text | Error message if failed |
| created_at | timestamptz | |

## Table: support_tickets

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| channel | text | whatsapp \| email |
| conversation | jsonb | Array of {role, content, timestamp} |
| status | text | open \| ai_resolved \| escalated \| closed |
| escalation_reason | text | Why it went to human |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Table: page_events

Lightweight analytics. No PII stored.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| event_type | text | page_view \| booking_click \| whatsapp_click |
| referrer | text | Where they came from |
| country | text | Two-letter code |
| created_at | timestamptz | |

## Key Rules

- Always use `provider_id` as the FK (not `user_id` or `member_id`)
- Never add columns without updating this file first
- `plan` values: `seed | sprout | grow | thrive | elevate` — exact lowercase
- Booking `status`: `pending | accepted | rejected | cancelled`
- Support `status`: `open | ai_resolved | escalated | closed`
