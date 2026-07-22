-- Enable RLS on 3 tables flagged by the Supabase security advisor as fully
-- exposed to the anon/authenticated roles (no RLS = client libraries using
-- the anon key could read/write every row).
--
-- Verified every access to all three goes through the service-role client
-- (supabaseAdmin / createServerClient()), which bypasses RLS regardless —
-- same "RLS enabled, no policies, service-role-only" posture already used
-- by onboarding_answers, studio_*, and clinical_* tables in this project.
-- No client-side (browser anon-key) reads/writes exist for any of the three,
-- so adding no policies is correct here, not an oversight.

ALTER TABLE public.website_copy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_hits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_reaction_hits    ENABLE ROW LEVEL SECURITY;
