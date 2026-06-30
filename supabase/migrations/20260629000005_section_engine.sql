-- Section-based layout engine
-- section_types: the registry of available sections and their visual variants
CREATE TABLE IF NOT EXISTS section_types (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key        text NOT NULL UNIQUE,
  label      text NOT NULL,
  variants   jsonb NOT NULL DEFAULT '[]',
  sort_order int  NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO section_types (key, label, variants, sort_order) VALUES
('hero', 'Hero', '[
  {"key":"minimal","label":"Minimal — avatar + headline, pill CTAs"},
  {"key":"split","label":"Split — text left, photo right"},
  {"key":"banner","label":"Banner — full-width accent header"},
  {"key":"centered","label":"Centered — everything centered"}
]', 0),
('services', 'Services', '[
  {"key":"list","label":"List — stacked rows"},
  {"key":"grid","label":"Grid — 2-column cards"},
  {"key":"menu","label":"Menu — price-forward rows"},
  {"key":"pricing","label":"Pricing — bold price cards"}
]', 1),
('highlights', 'Highlights', '[
  {"key":"icons","label":"Icons — 3-column emoji grid"},
  {"key":"cards","label":"Cards — bordered icon cards"},
  {"key":"strip","label":"Strip — horizontal scroll"},
  {"key":"numbered","label":"Numbered — step-by-step"}
]', 2),
('bio', 'About / Bio', '[
  {"key":"paragraph","label":"Paragraph — plain text"},
  {"key":"accent","label":"Accent Bar — left colour bar"},
  {"key":"callout","label":"Callout — tinted box"}
]', 3),
('gallery', 'Gallery', '[
  {"key":"grid","label":"Grid — 2×3 square grid"},
  {"key":"masonry","label":"Masonry — variable heights"},
  {"key":"scroll","label":"Scroll — horizontal strip"}
]', 4),
('faq', 'FAQ', '[
  {"key":"accordion","label":"Accordion — expand/collapse"},
  {"key":"twocol","label":"Two Column — always visible"}
]', 5),
('contact', 'Contact', '[
  {"key":"both","label":"Form + WhatsApp button"},
  {"key":"form","label":"Booking Form only"},
  {"key":"whatsapp","label":"WhatsApp Button only"},
  {"key":"minimal","label":"Minimal — links only"}
]', 6)
ON CONFLICT (key) DO NOTHING;

-- Add sections column to layout_presets
ALTER TABLE layout_presets ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT NULL;

-- Add sections column to pages (stores the active section layout for the live page)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT NULL;
