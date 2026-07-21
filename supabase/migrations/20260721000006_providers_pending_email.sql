-- Supports self-serve email change (app/api/mychat/email-change/route.ts).
-- Email is both the login identity and the app's ownership key, and had no
-- edit path at all until now. pending_email stashes the intended new
-- address while Supabase Auth's own confirmation flow is in progress;
-- app/auth/callback/route.ts syncs providers.email once confirmed, then
-- clears this column back to null.

alter table providers add column if not exists pending_email text;
