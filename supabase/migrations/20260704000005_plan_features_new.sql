-- Register feature keys for new capabilities

-- scheduling: slot-based booking (all plans)
insert into plan_features (plan_id, label, description, feature_key, sort_order)
values
  ('grow',    'Availability calendar', 'Set your open dates and timeslots', 'scheduling', 40),
  ('thrive',  'Availability calendar', 'Set your open dates and timeslots', 'scheduling', 40),
  ('elevate', 'Availability calendar', 'Set your open dates and timeslots', 'scheduling', 40)
on conflict do nothing;

-- crm: student/client roster (Thrive+)
insert into plan_features (plan_id, label, description, feature_key, sort_order)
values
  ('thrive',  'Client roster', 'Track your students and sessions', 'crm', 50),
  ('elevate', 'Client roster', 'Track your students and sessions', 'crm', 50)
on conflict do nothing;

-- analytics: stats dashboard (all plans)
-- Wire up the existing unkeyed analytics marketing rows first
update plan_features
  set feature_key = 'analytics'
  where feature_key is null and label ilike '%analytic%';

insert into plan_features (plan_id, label, description, feature_key, sort_order)
select 'grow', 'Analytics dashboard', 'View visitor stats and booking trends', 'analytics', 30
where not exists (select 1 from plan_features where plan_id = 'grow' and feature_key = 'analytics');

insert into plan_features (plan_id, label, description, feature_key, sort_order)
select 'thrive', 'Analytics dashboard', 'View visitor stats and booking trends', 'analytics', 30
where not exists (select 1 from plan_features where plan_id = 'thrive' and feature_key = 'analytics');

insert into plan_features (plan_id, label, description, feature_key, sort_order)
select 'elevate', 'Analytics dashboard', 'View visitor stats and booking trends', 'analytics', 30
where not exists (select 1 from plan_features where plan_id = 'elevate' and feature_key = 'analytics');
