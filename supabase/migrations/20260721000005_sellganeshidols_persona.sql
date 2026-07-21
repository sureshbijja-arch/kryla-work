-- Replace "Home Food Brand" (homefoods) with "Sell Ganesh Idols" (sellganeshidols).
-- homefoods was seeded in 20260713200000_storefront_personas.sql — that migration is
-- historical and immutable, so this migration removes the row and inserts the new one
-- instead of editing it in place.
--
-- Reuses the storefront_product archetype (physical-product seller, same family as
-- homefoods/maker/gifting/florist/jeweller) — no new archetype/studio modes needed.
--
-- mykryla_tools is set directly here (not derived automatically — the backfill in
-- 20260718033607_mykryla_tools_config.sql was a one-time UPDATE, not a trigger) so the
-- Studio tool card appears in My Tools for this persona from day one.

DELETE FROM personas WHERE id = 'homefoods';

INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config, studio_archetype, studio_guidance, studio_config) VALUES

('sellganeshidols', 'Sell Ganesh Idols', '🕉️', true, 23, 'storefront', 'warm', 'inter', false, 'storefront_product',
'DOMAIN: GANESH IDOL SELLER
You are assisting a Ganesh idol maker/seller with their business content and customer communications.
CONTEXT: Sellers offer handcrafted clay Ganesh idols for Ganesh Chaturthi — typically both plain natural clay and gold-colour/decorated finishes, in sizes ranging roughly 1–7 feet. Key language: "idol", "clay (matti)", "eco-friendly", "natural colours", "size", "advance order", "doorstep delivery", "Ganesh Chaturthi". ₹ pricing, advance/custom orders, and doorstep delivery within the local area are standard. Demand is sharply seasonal — heaviest in the weeks before Ganesh Chaturthi — so advance-order timing and lead time matter a lot. WhatsApp enquiry and Instagram photos of finished idols are the primary sales channels; eco-friendly/natural-clay sourcing is a strong differentiator from Plaster of Paris idols.
CONTENT FOCUS: Create idol catalog listings (by type and size), customer enquiry reply drafts, Ganesh Chaturthi season campaigns, and advance-order confirmation/follow-up messages.',
'{"patient_noun":"customer","patient_noun_plural":"customers","studio_label":"Commerce Studio","content_noun":"idol","content_noun_plural":"idols","mykryla_tools_label":"Commerce Studio","mykryla_tools":[{"action":"studio","icon":"🧰","title":"Commerce Studio","description":"Generate and manage your documents"}]}')

ON CONFLICT (id) DO UPDATE SET
  label             = EXCLUDED.label,
  emoji             = EXCLUDED.emoji,
  enabled           = EXCLUDED.enabled,
  sort_order        = EXCLUDED.sort_order,
  template          = EXCLUDED.template,
  palette           = EXCLUDED.palette,
  font              = EXCLUDED.font,
  needs_config      = EXCLUDED.needs_config,
  studio_archetype  = EXCLUDED.studio_archetype,
  studio_guidance   = EXCLUDED.studio_guidance,
  studio_config     = EXCLUDED.studio_config;
