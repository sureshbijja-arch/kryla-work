-- Commerce Working Studios — 2 new archetypes + 8 modes (4 each).
-- Uses the config-driven studio engine (20260712000005_studio_engine.sql).
-- PractitionerStudio.tsx renders these automatically when personas.studio_archetype is set.
-- No UI or API code changes required.

-- feature_key = 'studio_storefront': register this key in plan_features to gate the studio.
-- has_library = false (v1): no content library for commerce studios initially.

-- ── 1. Studio archetypes ──────────────────────────────────────────────────────

INSERT INTO studio_archetypes (id, label, base_guidance, disclaimer, has_library, library_label, feature_key) VALUES

('storefront_product', 'Commerce — Products',
'GUARDRAIL — COMMERCE CONTENT AID:
(a) You are a content generation tool helping product sellers create professional, sales-ready content. All output is a draft for the seller''s review and edit before publishing.
(b) Write in warm, conversational Indian English. ₹ pricing, UPI/GPay/PhonePe references, and WhatsApp enquiry flows are natural and expected.
(c) Never invent certifications, awards, or customer testimonials. If specific claims are needed, insert [ADD YOUR OWN DETAIL HERE].
(d) Festival and seasonal context (Diwali, Rakhi, wedding season, Onam, Pongal, etc.) adds strong purchase motivation — use it naturally when the context warrants.
(e) Content for WhatsApp must be under 150 words. For Instagram, keep captions punchy and end with 3–5 relevant hashtags.

OUTPUT FORMAT: Return plain text unless the mode specifies otherwise. For catalog/product listing output, use a clear labelled list format. For WhatsApp messages, keep under 150 words. For Instagram captions, include emojis naturally.',
'',
false, 'Templates', 'studio_storefront'),

('storefront_service', 'Commerce — Services & Booking',
'GUARDRAIL — COMMERCE CONTENT AID:
(a) You are a content generation tool helping service-based sellers create professional, sales-ready content. All output is a draft for the seller''s review and edit before publishing.
(b) Write in warm, conversational Indian English. ₹ pricing, advance booking flows, and WhatsApp enquiry patterns are natural and expected.
(c) Never invent testimonials or reviews. If specific claims are needed, insert [ADD YOUR OWN DETAIL HERE].
(d) For booking-based services (bridal, event, seasonal), lead times, availability windows, and festival season context add urgency — use naturally.
(e) Content for WhatsApp must be under 150 words. For Instagram, keep captions punchy and end with 3–5 relevant hashtags.

OUTPUT FORMAT: Return plain text unless the mode specifies otherwise. For package/service listing output, use a clear structured format. For WhatsApp messages, keep under 150 words. For Instagram captions, include emojis naturally.',
'',
false, 'Templates', 'studio_storefront')

ON CONFLICT (id) DO NOTHING;

-- ── 2. Studio modes — storefront_product (4 modes) ───────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('storefront_product', 'catalog', 'Catalog Builder', 1,
'[
  {"id":"product_list","label":"Products (one per line, with price)","type":"textarea","placeholder":"e.g.\nMango Pickle 500g – ₹180\nGinger-Garlic Paste 200g – ₹90\nDiwali Gift Hamper – ₹499","required":true,"group":"main","rows":7},
  {"id":"brand_voice","label":"Your brand feel","type":"select","options":[{"value":"warm_homemade","label":"Warm & homemade"},{"value":"premium_artisan","label":"Premium & artisan"},{"value":"bold_festive","label":"Bold & festive"},{"value":"clean_modern","label":"Clean & modern"}],"required":false,"group":"main"},
  {"id":"target_customer","label":"Who buys from you?","type":"text","placeholder":"e.g. Urban families, NRIs gifting back home, working professionals","required":false,"group":"main"}
]',
'Generate a complete, sales-ready product catalog listing for the items above. For each product write: a warm 1–2 sentence description highlighting what makes it special, key details (shelf life, weight, variants if mentioned), and a clear order CTA (WhatsApp/DM to order). Lead with the most popular or flagship item. Use the brand voice and target customer to calibrate tone. End with a contact/order call-out block. Return as plain text, ready to copy-paste into Instagram bio, WhatsApp status, or a website page.',
'html'),

('storefront_product', 'reply', 'Order & Enquiry Reply', 2,
'[
  {"id":"customer_message","label":"Customer''s message or enquiry","type":"textarea","placeholder":"e.g. Hi, do you have Diwali gift hampers? What''s the minimum order?","required":true,"group":"main","rows":3},
  {"id":"availability","label":"What you have available / your answer","type":"textarea","placeholder":"e.g. Yes, Diwali hampers from ₹499, minimum 5 pieces, ready by 20 Oct. Can customise with logo.","required":true,"group":"main","rows":3},
  {"id":"tone","label":"Reply tone","type":"select","options":[{"value":"warm_friendly","label":"Warm & friendly"},{"value":"professional","label":"Professional"},{"value":"brief","label":"Short & direct"}],"required":false,"group":"main"}
]',
'Draft a warm, professional WhatsApp reply to the customer''s enquiry using the details above. Be concise (under 120 words), address their question directly, mention pricing or next steps clearly, and end with a call to action (WhatsApp, DM, or order link). Use natural conversational Indian English — not stiff formal language. Return as plain text, ready to copy and paste.',
'html'),

('storefront_product', 'campaign', 'Festival Campaign', 3,
'[
  {"id":"occasion","label":"Festival or occasion","type":"text","placeholder":"e.g. Diwali 2026 / Raksha Bandhan / Wedding season / New Year","required":true,"group":"main"},
  {"id":"offer","label":"Your offer or promotion","type":"textarea","placeholder":"e.g. 20% off all hampers above ₹999 / Free delivery above ₹500 / Limited Diwali collection now live","required":true,"group":"main","rows":3},
  {"id":"focus","label":"Product to highlight","type":"text","placeholder":"e.g. Diwali gift hampers / Home-made sweets","required":false,"group":"main"},
  {"id":"channel","label":"Where will you post?","type":"select","options":[{"value":"instagram_caption","label":"Instagram caption"},{"value":"whatsapp_status","label":"WhatsApp status"},{"value":"both","label":"Both Instagram + WhatsApp"}],"required":false,"group":"main"}
]',
'Generate a festive campaign post for the occasion above. Create: (1) An Instagram caption — 80–120 words, warm festive tone, relevant emojis, ends with 3–5 hashtags. (2) A WhatsApp status message — 40–60 words, punchy, includes the offer clearly. Lead with the occasion''s emotion (gifting, celebration, togetherness) before revealing the offer. Include a clear CTA (DM/WhatsApp to order). Return both as separate clearly labelled blocks of plain text.',
'html'),

('storefront_product', 'followup', 'Follow-up & Reviews', 4,
'[
  {"id":"customer_context","label":"Customer details","type":"text","placeholder":"e.g. Priya ordered Diwali hampers last week / Ritu bought 3 soy candles for gifting","required":true,"group":"main"},
  {"id":"goal","label":"Goal of this message","type":"select","options":[{"value":"review","label":"Ask for a review or referral"},{"value":"reorder","label":"Encourage a repeat order"},{"value":"check_in","label":"Friendly check-in after delivery"}],"required":true,"group":"main"},
  {"id":"tone","label":"Tone","type":"select","options":[{"value":"warm_personal","label":"Warm & personal"},{"value":"brief","label":"Short & casual"}],"required":false,"group":"main"}
]',
'Draft a warm, brief WhatsApp follow-up message for the customer above. Match the goal: review/referral request, repeat order nudge, or friendly post-delivery check-in. Keep it under 80 words. Sound like a real person — not a marketing email. Use natural conversational Indian English. End with a gentle CTA (leave a Google/Instagram review / WhatsApp if you need anything / order again). Return as plain text, ready to copy and paste.',
'html')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── 3. Studio modes — storefront_service (4 modes) ───────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('storefront_service', 'catalog', 'Packages & Menu', 1,
'[
  {"id":"services_list","label":"Services / packages (one per line, with price)","type":"textarea","placeholder":"e.g.\nBridal Makeup – ₹8,000\nParty Makeup – ₹3,500\nEngagement Look – ₹5,000\nHD + Airbrush available","required":true,"group":"main","rows":7},
  {"id":"brand_voice","label":"Your brand feel","type":"select","options":[{"value":"luxury_bridal","label":"Luxury & bridal"},{"value":"warm_friendly","label":"Warm & friendly"},{"value":"professional_clean","label":"Professional & clean"},{"value":"bold_creative","label":"Bold & creative"}],"required":false,"group":"main"},
  {"id":"target_customer","label":"Who are your typical clients?","type":"text","placeholder":"e.g. Brides, working women, college students for events","required":false,"group":"main"}
]',
'Generate a complete, sales-ready services and packages listing for the items above. For each service write: a warm 1–2 sentence description of what''s included, who it''s for, and what makes it special. Add a natural "book early" or "limited slots" urgency note where relevant (especially for bridal). Use the brand voice and typical client to calibrate tone. End with a booking call-out (WhatsApp/DM to book or enquire). Return as plain text, ready to copy-paste into Instagram bio, WhatsApp Business profile, or a website page.',
'html'),

('storefront_service', 'reply', 'Booking & Enquiry Reply', 2,
'[
  {"id":"customer_message","label":"Customer''s message or enquiry","type":"textarea","placeholder":"e.g. Hi, I want bridal mehndi for my wedding on 15 Nov. How much do you charge?","required":true,"group":"main","rows":3},
  {"id":"availability","label":"Your answer / availability","type":"textarea","placeholder":"e.g. Bridal mehndi from ₹2,500, available on 15 Nov. Trial preferred 1 week before. Only 2 bridal slots left in Nov.","required":true,"group":"main","rows":3},
  {"id":"tone","label":"Reply tone","type":"select","options":[{"value":"warm_friendly","label":"Warm & friendly"},{"value":"professional","label":"Professional"},{"value":"brief","label":"Short & direct"}],"required":false,"group":"main"}
]',
'Draft a warm, professional WhatsApp reply to the client''s enquiry using the details above. Be concise (under 120 words), address their question directly, mention pricing and next steps (trial, booking advance, availability), and end with a clear CTA (WhatsApp to confirm / book now / DM for more details). Use natural conversational Indian English. Return as plain text, ready to copy and paste.',
'html'),

('storefront_service', 'campaign', 'Festival Campaign', 3,
'[
  {"id":"occasion","label":"Festival or occasion","type":"text","placeholder":"e.g. Wedding season 2026 / Diwali party season / New Year events","required":true,"group":"main"},
  {"id":"offer","label":"Your offer or availability note","type":"textarea","placeholder":"e.g. Bridal slots open for Nov–Dec / 10% off party bookings before 31 Oct / New bridal package with pre-bridal skin prep","required":true,"group":"main","rows":3},
  {"id":"focus","label":"Service to highlight","type":"text","placeholder":"e.g. Bridal mehndi packages / HD airbrush makeup","required":false,"group":"main"},
  {"id":"channel","label":"Where will you post?","type":"select","options":[{"value":"instagram_caption","label":"Instagram caption"},{"value":"whatsapp_status","label":"WhatsApp status"},{"value":"both","label":"Both Instagram + WhatsApp"}],"required":false,"group":"main"}
]',
'Generate a festive campaign post for the occasion above. Create: (1) An Instagram caption — 80–120 words, warm festive tone, relevant emojis, ends with 3–5 hashtags. (2) A WhatsApp status message — 40–60 words, punchy, includes the offer or availability note clearly. Lead with the occasion''s emotion (celebration, new beginnings, togetherness) before your service. Include a clear booking CTA (DM/WhatsApp to book). Return both as separate clearly labelled blocks of plain text.',
'html'),

('storefront_service', 'followup', 'Follow-up & Reviews', 4,
'[
  {"id":"customer_context","label":"Client details","type":"text","placeholder":"e.g. Ritu had bridal mehndi on 5 Nov / Priya booked tiffin subscription last month","required":true,"group":"main"},
  {"id":"goal","label":"Goal of this message","type":"select","options":[{"value":"review","label":"Ask for a review or referral"},{"value":"reorder","label":"Encourage a repeat booking"},{"value":"check_in","label":"Friendly check-in after service"}],"required":true,"group":"main"},
  {"id":"tone","label":"Tone","type":"select","options":[{"value":"warm_personal","label":"Warm & personal"},{"value":"brief","label":"Short & casual"}],"required":false,"group":"main"}
]',
'Draft a warm, brief WhatsApp follow-up message for the client above. Match the goal: review/referral request, repeat booking nudge, or friendly post-service check-in. Keep it under 80 words. Sound like a real person — not a marketing email. Use natural conversational Indian English. End with a gentle CTA (leave a Google/Instagram review / WhatsApp if you need anything / book again for your next event). Return as plain text, ready to copy and paste.',
'html')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── 4. Plan gating — register studio_storefront feature key ──────────────────
-- Add studio_storefront to plan_features for the plans that should have access.
-- Adjust plan_id and sort_order values to match your plan IDs and gating tier.
-- Example: gate at 'sprout' level (sort_order = 2) and above.
-- UPDATE THIS to match your plans table values before applying.
--
-- INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order)
-- SELECT id, 'Commerce Studio', 'AI content studio for catalog, replies, campaigns and follow-ups', 'studio_storefront', 5
-- FROM plans
-- WHERE sort_order >= 2  -- adjust to taste (sprout and above, or grow and above)
-- ON CONFLICT DO NOTHING;
