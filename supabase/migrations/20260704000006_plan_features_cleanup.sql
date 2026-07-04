-- Remove feature labels that reference internal names or unshipped features
-- 'scheduling' and 'crm' features remain functional (unknown key = allows() returns true)

delete from plan_features where label = 'Availability calendar';
delete from plan_features where label = 'Client roster';

-- Replace all custom_domain rows (conflicting duplicates from prior migrations)
-- with a single clean set using the generic label
delete from plan_features where feature_key = 'custom_domain';
insert into plan_features (plan_id, label, description, feature_key, sort_order) values
  ('thrive',  'Custom link', 'Your page gets a personalized link — yourname.kryla.work', 'custom_domain', 60),
  ('elevate', 'Custom link', 'Your page gets a personalized link — yourname.kryla.work', 'custom_domain', 60);
