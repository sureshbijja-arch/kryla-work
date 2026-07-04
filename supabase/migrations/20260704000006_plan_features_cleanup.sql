-- Remove feature labels that reference internal names or unshipped features
-- 'scheduling' and 'crm' features remain functional (unknown key = allows() returns true)

delete from plan_features where label = 'Availability calendar';
delete from plan_features where label = 'Client roster';

-- Remove krityabijja example from custom_domain feature label
-- Delete duplicates first, then rename remaining rows
delete from plan_features where feature_key = 'custom_domain' and label = 'Custom link';
update plan_features
  set label       = 'Custom link',
      description = 'Your page gets a personalized link — yourname.kryla.work'
  where feature_key = 'custom_domain';
