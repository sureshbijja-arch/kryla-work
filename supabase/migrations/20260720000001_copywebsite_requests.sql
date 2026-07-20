-- CopyWebsite: gated "bring your existing website over" feature.
-- Requests are captured at onboarding (if the member's referral code is
-- allowlisted) and reviewed/approved by hand in /admin/copywebsite.
-- No automatic scraping/cloning — see docs/superpowers/plans (CopyWebsite plan).

CREATE TABLE IF NOT EXISTS website_copy_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid REFERENCES providers(id),
  slug         text NOT NULL,
  source_url   text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'done')),
  output_type  text CHECK (output_type IN ('native', 'clone')),
  admin_note   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS website_copy_requests_status_idx ON website_copy_requests(status);
CREATE INDEX IF NOT EXISTS website_copy_requests_provider_id_idx ON website_copy_requests(provider_id);

-- Gate config: which referral codes unlock the "paste your website URL" field.
-- mode: 'none' (closed for everyone) | 'all' (open for everyone) | 'list' (only codes below).
-- Ships dark (mode: 'none') until enabled from /admin/copywebsite.
INSERT INTO system_config (key, value, updated_at)
VALUES ('copywebsite_gate', '{"mode": "none", "codes": []}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
