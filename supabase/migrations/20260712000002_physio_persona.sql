-- Add the physio (Physiotherapist) persona to the personas catalog.
-- Mirrors the doctor row but uses id='physio' so it gets its own
-- Working Studio tooling and roster language without touching the doctor persona.

INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config) VALUES
  ('physio', 'Physiotherapist', '🧑‍⚕️', true, 12, 'clinic', 'calm', 'inter', false)
ON CONFLICT (id) DO NOTHING;
