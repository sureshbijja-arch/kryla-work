-- Hero/section background fit tuning (SmartImg 'auto' fit — see lib/heroFit.ts).
-- cropTolerance: how far an image's aspect ratio can be from its box's before
-- 'auto' switches from cropping (cover) to blurred-fill. Admin-tunable so the
-- crop-vs-blur balance can be adjusted without a deploy.
INSERT INTO system_config (key, value, updated_at)
VALUES ('hero_fit', '{"cropTolerance": 1.35}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
