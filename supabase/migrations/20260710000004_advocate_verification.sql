-- Advocate verification + compliance columns; seed compliance_copy in system_config

ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification jsonb DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS compliance   jsonb DEFAULT '{}';

INSERT INTO system_config (key, value, updated_at)
VALUES (
  'compliance_copy',
  '{
    "bci_disclaimer": "This page is for informational purposes only and does not constitute legal advice, solicitation, or advertising within the meaning of the Bar Council of India Rules. The information provided is not a substitute for legal counsel. Contacting this office does not create an advocate-client relationship.",
    "privilege_notice": "All communications through this intake form are confidential and protected by attorney-client privilege. Information shared will only be used to assess your legal matter.",
    "intake_cta_label": "Contact the office"
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
