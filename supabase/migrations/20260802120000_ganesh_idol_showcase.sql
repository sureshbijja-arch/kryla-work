-- supabase/migrations/20260802120000_ganesh_idol_showcase.sql
--
-- v3.1 idol-showcase rebuild for sellganeshidols. Root cause fixed: an
-- "idol" and a "size" were the same row in pages.services, so one idol
-- could never have several sizes, a price could never be a real range, and
-- "includes" could never vary by size. This migration:
--   1. Adds personas.order_config — DB-driven order-form vocabulary
--      (occasions, fulfillment, custom-order fields), replacing the
--      hardcoded bakery copy OrderModal/CustomOrderModal used to bake in
--      for every one of the 46 personas.
--   2. Registers the new FactsSection 'idols' variant (idol showcase —
--      photo + name + size range + price range per idol, replacing the
--      text-only Material/Sizes/Colours/Delivery strip for this persona).
--   3. Converts the three existing seeded ganesh idols from flat
--      name+price+size rows into the nested idol→variants shape, and
--      updates the section list so services/collection stands down in
--      favour of facts/idols (both grids would otherwise render the
--      identical catalogue twice on one page).
--
-- Three sync points, same convention as every prior Ganesh section-list
-- change (see 20260801090000_ganesh_v3_theme.sql's header comment):
-- PERSONA_SECTIONS (inngest/build-page.ts, code-only), this migration's
-- layout_presets + live pages.sections updates, and
-- scripts/seed-e2e-provider.mjs.

-- ── 1. personas.order_config ────────────────────────────────────────────────
-- Reusable by any persona, persona-neutral column name — additive, same
-- pattern as personas.studio_config. See lib/orderConfig.ts for the
-- validated TypeScript shape this must match.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS order_config jsonb;

UPDATE personas SET order_config = '{
  "occasions": ["Ganesh Chaturthi", "Home puja", "Society mandal", "Gifting", "Other"],
  "notesPlaceholder": "e.g. specific mukut, dhoti colour, seated or standing pose",
  "fulfillment": [
    {"key": "pickup", "label": "Pickup"},
    {"key": "transport", "label": "Transport arranged on request", "areaPlaceholder": "Area / society name"}
  ],
  "customOrder": {
    "whatLabel": "What are you looking for?",
    "whatOptions": ["Single idol", "Society / mandal idol", "Bulk order", "Other"],
    "sizeLabel": "Size",
    "sizeOptions": ["1–2 ft", "3–4 ft", "5–7 ft", "Larger", "Not sure"],
    "detailPlaceholders": {
      "finish": "e.g. natural clay, gold detailing, painted",
      "design": "e.g. seated Ganesh, specific mukut, reference photo available"
    }
  }
}'::jsonb
WHERE id = 'sellganeshidols' AND order_config IS NULL;

-- Preserve today's bakery-shaped copy exactly for the two personas that
-- currently rely on it, so this migration changes ganesh's vocabulary
-- without silently changing baker/chef's (they keep the same words they
-- show today — this just moves those words from hardcoded TSX into DB
-- config, per the no-hardcoding rule, for every persona at once).
UPDATE personas SET order_config = '{
  "occasions": ["Birthday", "Anniversary", "Wedding", "Festive", "Corporate", "Graduation", "Other"],
  "notesPlaceholder": "e.g. Write ''Happy Birthday Priya'', chocolate frosting, no nuts",
  "fulfillment": [
    {"key": "pickup", "label": "Pickup"},
    {"key": "delivery", "label": "Delivery", "areaPlaceholder": "Delivery area / address"}
  ],
  "customOrder": {
    "whatLabel": "What are you looking for?",
    "whatOptions": ["Cake", "Cupcakes", "Cookies", "Bread", "Hamper", "Other"],
    "sizeLabel": "Servings / Size",
    "sizeOptions": ["Feeds 4–6", "Feeds 8–10", "Feeds 12–15", "Feeds 20+", "Not sure"],
    "detailPlaceholders": {
      "finish": "e.g. Chocolate truffle, eggless vanilla, butterscotch",
      "design": "e.g. 3-tier floral design, soft pink and gold, write ''Happy 30th Priya''"
    }
  }
}'::jsonb
WHERE id IN ('baker', 'chef') AND order_config IS NULL;

-- Every other persona: NULL order_config is a valid, intentional state —
-- lib/personas.ts's getOrderConfig() falls back to the same bakery-shaped
-- default at read time, so app behaviour for the other 43 personas is
-- unchanged by this migration. No blanket UPDATE for the rest.

-- ── 2. Register the 'idols' facts-strip variant ─────────────────────────────
-- section_types is the admin-only /admin/layouts registry — informational
-- only, does not gate rendering (see precedent comment in
-- 20260731093000_register_missing_variants.sql).

UPDATE section_types SET variants = '["strip", "idols"]'::jsonb WHERE key = 'facts';

-- ── 3. layout_presets "Shadu" — services/collection drops out, facts
--    becomes idols. Matches PERSONA_SECTIONS in inngest/build-page.ts.

UPDATE layout_presets SET sections = '[
  {"sectionKey": "hero",     "variant": "pdp",       "order": 1},
  {"sectionKey": "facts",    "variant": "idols",     "order": 2},
  {"sectionKey": "bio",      "variant": "story",     "order": 3},
  {"sectionKey": "faq",      "variant": "accordion", "order": 4},
  {"sectionKey": "contact",  "variant": "enquiry",   "order": 5}
]'::jsonb
WHERE persona = 'sellganeshidols' AND name = 'Shadu';

-- ── 4. Convert live ganesh pages: flat services → idol→variants, and
--    section list facts/strip + services/collection → facts/idols.
--
-- Verified against live prod data before writing this: sellganeshidols has
-- THREE real providers, not one uniform shape —
--   - one is still on the pre-v3 layout (hero/auto + services/menu, no
--     `facts` section at all, no `price` on any service row);
--   - one is on v3 (facts/strip + services/collection) but its catalogue is
--     placeholder/AI-drafted content — every row has the same flat price
--     and a unit string like "Per idol", not a real size;
--   - the e2e seed provider matches the shape this migration was designed
--     around exactly.
-- Scope is therefore the same `facts/strip` guard for BOTH updates below —
-- a provider still on the pre-v3 layout is deliberately left untouched
-- (they never opted into the idol-showcase design), not silently migrated.
--
-- The three seeded rows (Natural Shadu / Gold-Finish / Custom Society) are
-- three DISTINCT idols, not one idol at three sizes — each becomes one idol
-- with a single variant that preserves its original size/price exactly,
-- not a merge. Sellers can add more sizes per idol afterwards via MyKryla
-- -> My Services (IdolsTab).
--
-- `price` defaults to 'On request' when absent — ServiceVariant.price is a
-- required string in the app (app/[slug]/types.ts), so a bare
-- jsonb_strip_nulls without this default would silently drop the key and
-- produce an invalid variant (verified against the placeholder-content
-- provider above, whose rows have no price field at all).
--
-- Idempotency guard: only rows that still have the OLD flat shape (no
-- `variants` key on the first service) are converted, so re-running this
-- migration — or running it after a seller has already edited their
-- catalogue via IdolsTab — never clobbers real data.

UPDATE pages SET services = (
  SELECT jsonb_agg(
    item - 'price' - 'duration_or_unit' - 'compareAtPrice' || jsonb_build_object(
      'variants',
      jsonb_build_array(
        jsonb_build_object(
          'size', COALESCE(item->>'duration_or_unit', ''),
          'price', COALESCE(item->>'price', 'On request'),
          'compareAtPrice', item->'compareAtPrice'
        )
      )
    )
  )
  FROM jsonb_array_elements(services) AS item
)
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND jsonb_array_length(services) > 0
  AND NOT (services->0 ? 'variants')
  AND sections @> '[{"sectionKey": "facts", "variant": "strip"}]'::jsonb;

UPDATE pages SET sections = '[
  {"sectionKey": "hero",     "variant": "pdp",       "order": 1},
  {"sectionKey": "facts",    "variant": "idols",     "order": 2},
  {"sectionKey": "bio",      "variant": "story",     "order": 3},
  {"sectionKey": "faq",      "variant": "accordion", "order": 4},
  {"sectionKey": "contact",  "variant": "enquiry",   "order": 5}
]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND sections @> '[{"sectionKey": "facts", "variant": "strip"}]'::jsonb;
