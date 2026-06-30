-- Add new rich variants to existing section_types rows
UPDATE section_types SET variants = '["minimal","split","banner","centered","dark","gradient","photo"]' WHERE key = 'hero';
UPDATE section_types SET variants = '["list","grid","menu","pricing","features"]' WHERE key = 'services';
UPDATE section_types SET variants = '["icons","cards","strip","numbered","stats"]' WHERE key = 'highlights';
UPDATE section_types SET variants = '["paragraph","accent","callout","dark"]' WHERE key = 'bio';
UPDATE section_types SET variants = '["grid","masonry","scroll","featured"]' WHERE key = 'gallery';
UPDATE section_types SET variants = '["accordion","twocol"]' WHERE key = 'faq';
UPDATE section_types SET variants = '["both","form","whatsapp","minimal","dark"]' WHERE key = 'contact';
