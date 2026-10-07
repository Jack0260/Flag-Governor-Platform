/*
# Flag Governor — Seed Demo Data
Inserts demo org with all related data.
*/

INSERT INTO organizations (id, name, slug, risk_config) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'demo-org',
   '{"rolloutWeight": 25, "productionWeight": 20, "criticalityWeight": 20, "errorRateWeight": 15, "sloWeight": 10, "rollbackWeight": 5, "flagAgeWeight": 5, "missingMetaWeight": 10}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO environments (id, org_id, name, is_production, display_order) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Production', true, 1),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Staging', false, 2),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Development', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, org_id, name, criticality, slo_status, error_rate, description) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Checkout API', 'critical', 'meeting', 0.3, 'Core payment processing service handling all checkout transactions'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'User Service', 'high', 'meeting', 0.5, 'Authentication, profile, and account management service'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Search Engine', 'medium', 'at_risk', 2.1, 'Product search and filtering service with autocomplete'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Analytics Pipeline', 'low', 'meeting', 0.1, 'Event ingestion and reporting data pipeline')
ON CONFLICT (id) DO NOTHING;

INSERT INTO flags (id, org_id, key, name, description, type, service_id, status, is_killed, created_at, expires_at) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001',
   'new-checkout-flow', 'New Checkout Flow', 'Redesigned checkout experience with simplified payment steps and progress indicator',
   'percentage', '00000000-0000-0000-0000-000000000020', 'active', false,
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001',
   'dark-mode-ui', 'Dark Mode UI', 'System-wide dark theme with automatic switching based on user preference',
   'boolean', '00000000-0000-0000-0000-000000000021', 'active', false,
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001',
   'beta-dashboard-v2', 'Beta Dashboard v2', 'Complete redesign of the analytics dashboard with real-time widgets and customizable layouts',
   'multivariate', '00000000-0000-0000-0000-000000000023', 'active', false,
   NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001',
   'payment-gateway-v2', 'Payment Gateway v2', 'Migration to new payment gateway with support for additional currencies and lower fees',
   'percentage', '00000000-0000-0000-0000-000000000020', 'active', false,
   NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001',
   'ai-recommendations', 'AI Product Recommendations', 'Machine learning powered product recommendations on product pages and cart',
   'user_targeted', '00000000-0000-0000-0000-000000000022', 'active', false,
   NOW() - INTERVAL '45 days', NULL),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000001',
   'legacy-search-toggle', 'Legacy Search Toggle', 'Emergency toggle to switch back to the old search engine if the new one has issues',
   'boolean', '00000000-0000-0000-0000-000000000022', 'active', false,
   NOW() - INTERVAL '180 days', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000001',
   'mobile-push-notifications', 'Mobile Push Notifications', 'Push notification system for iOS and Android with personalized content',
   'tenant_targeted', '00000000-0000-0000-0000-000000000021', 'active', false,
   NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000001',
   'tenant-isolation-v2', 'Tenant Isolation v2', 'Upgraded data isolation architecture for enterprise tenants with dedicated infrastructure',
   'environment_targeted', '00000000-0000-0000-0000-000000000021', 'active', false,
   NOW() - INTERVAL '20 days', NOW() + INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO flag_variants (id, flag_id, key, name, description, weight, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000032', 'control', 'Control (v1)', 'Current dashboard layout', 33, 1),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000032', 'variant_a', 'Variant A (Compact)', 'Compact layout with smaller widgets and more data density', 34, 2),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000032', 'variant_b', 'Variant B (Spacious)', 'Spacious layout with larger widgets and guided tour', 33, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO flag_environments (flag_id, environment_id, enabled, rollout_percentage, rules, served_variant) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', true, 25, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000011', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000012', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', true, 50, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000011', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000012', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000010', true, 10, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000011', true, 50, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000010', true, 100,
   '[{"attribute":"plan","operator":"equals","value":"enterprise"},{"attribute":"country","operator":"in","value":["US","CA","GB"]}]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000011', true, 100,
   '[{"attribute":"plan","operator":"equals","value":"enterprise"}]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000010', false, 0, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000010', true, 100,
   '[{"attribute":"tenant","operator":"in","value":["acme-enterprise","globex-corp"]}]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000011', true, 100, '[]'::jsonb, NULL),
  ('00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000012', true, 100, '[]'::jsonb, NULL)
ON CONFLICT (flag_id, environment_id) DO NOTHING;

UPDATE flags SET is_killed = true, kill_switch_at = NOW() - INTERVAL '90 days'
WHERE id = '00000000-0000-0000-0000-000000000035';

INSERT INTO flag_dependencies (flag_id, depends_on_flag_id) VALUES
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000030'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000032')
ON CONFLICT (flag_id, depends_on_flag_id) DO NOTHING;

INSERT INTO flag_conflicts (org_id, flag_a_id, flag_b_id, description) VALUES
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000033',
   'Both flags target the checkout flow simultaneously. Payment Gateway v2 depends on New Checkout Flow being enabled. Enabling both in production may compound error rates.')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (org_id, flag_id, action, entity_type, before_state, after_state, reason, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'flag.created', 'flag', NULL, '{"key":"new-checkout-flow","type":"percentage","status":"active"}'::jsonb, 'Initial creation for new checkout rollout', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'flag_env.updated', 'flag_environment', '{"enabled":false,"rollout_percentage":0}'::jsonb, '{"enabled":true,"rollout_percentage":10}'::jsonb, 'Enabled in production at 10% rollout', NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'flag_env.updated', 'flag_environment', '{"enabled":true,"rollout_percentage":10}'::jsonb, '{"enabled":true,"rollout_percentage":25}'::jsonb, 'Increased production rollout to 25%', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', 'flag.created', 'flag', NULL, '{"key":"dark-mode-ui","type":"boolean","status":"active"}'::jsonb, 'Initial creation', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000035', 'flag.kill_switch', 'flag', '{"is_killed":false}'::jsonb, '{"is_killed":true}'::jsonb, 'Emergency kill switch activated due to search performance degradation', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', 'flag.created', 'flag', NULL, '{"key":"payment-gateway-v2","type":"percentage","status":"active"}'::jsonb, 'Initial creation for payment gateway migration', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', 'flag_env.updated', 'flag_environment', '{"enabled":false,"rollout_percentage":0}'::jsonb, '{"enabled":true,"rollout_percentage":10}'::jsonb, 'Enabled in production at 10% for initial canary', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032', 'flag.created', 'flag', NULL, '{"key":"beta-dashboard-v2","type":"multivariate","status":"active"}'::jsonb, 'Initial creation for dashboard A/B test', NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

INSERT INTO experiments (id, org_id, flag_id, name, description, status, start_date, end_date, metric_name, metric_description) VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000032',
   'Dashboard Redesign A/B Test',
   'Comparing three dashboard layouts to measure engagement improvement',
   'running', NOW() - INTERVAL '14 days', NOW() + INTERVAL '16 days',
   'Daily Active Users', 'Number of unique users who interact with the dashboard each day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO experiment_variants (id, experiment_id, variant_key, sample_size, conversions, conversion_rate, confidence_interval_lower, confidence_interval_upper, is_winner, is_control) VALUES
  ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000040', 'control', 12000, 3600, 30.0, 28.5, 31.5, false, true),
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000040', 'variant_a', 11800, 4130, 35.0, 33.4, 36.6, false, false),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000040', 'variant_b', 12200, 4392, 36.0, 34.4, 37.6, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO scheduled_changes (org_id, flag_id, environment_id, action, scheduled_for, status, notes) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'enable', NOW() + INTERVAL '3 days', 'pending', 'Increase production rollout from 25% to 50%'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000010', 'enable', NOW() + INTERVAL '7 days', 'pending', 'Increase payment gateway v2 rollout to 25% pending risk review approval'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', 'disable', NOW() + INTERVAL '1 day', 'pending', 'Disable stale dark-mode-ui flag past expiration date'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', 'update_rules', NOW() + INTERVAL '5 days', 'pending', 'Update targeting rules for beta dashboard to include Pro plan users')
ON CONFLICT DO NOTHING;

INSERT INTO risk_assessments (org_id, flag_id, environment_id, score, recommendation, factors) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 55, 'caution', '{"rolloutPercentage":25,"isProduction":true,"serviceCriticality":"critical","errorRate":0.3,"sloStatus":"meeting","rollbackAvailable":true,"flagAgeDays":30,"hasOwner":false,"hasExpiry":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', 35, 'caution', '{"rolloutPercentage":100,"isProduction":true,"serviceCriticality":"high","errorRate":0.5,"sloStatus":"meeting","rollbackAvailable":true,"flagAgeDays":90,"hasOwner":false,"hasExpiry":true,"isExpired":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', 45, 'caution', '{"rolloutPercentage":50,"isProduction":true,"serviceCriticality":"low","errorRate":0.1,"sloStatus":"meeting","rollbackAvailable":true,"flagAgeDays":15,"hasOwner":false,"hasExpiry":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000010', 78, 'approval', '{"rolloutPercentage":10,"isProduction":true,"serviceCriticality":"critical","errorRate":0.3,"sloStatus":"meeting","rollbackAvailable":false,"flagAgeDays":5,"hasOwner":false,"hasExpiry":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000010', 62, 'caution', '{"rolloutPercentage":100,"isProduction":true,"serviceCriticality":"medium","errorRate":2.1,"sloStatus":"at_risk","rollbackAvailable":true,"flagAgeDays":45,"hasOwner":false,"hasExpiry":false}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000010', 90, 'block', '{"rolloutPercentage":0,"isProduction":true,"serviceCriticality":"medium","errorRate":2.1,"sloStatus":"at_risk","rollbackAvailable":false,"flagAgeDays":180,"hasOwner":false,"hasExpiry":true,"isExpired":true,"isKilled":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000010', 30, 'safe', '{"rolloutPercentage":100,"isProduction":true,"serviceCriticality":"high","errorRate":0.5,"sloStatus":"meeting","rollbackAvailable":true,"flagAgeDays":60,"hasOwner":false,"hasExpiry":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000012', 15, 'safe', '{"rolloutPercentage":100,"isProduction":false,"serviceCriticality":"high","errorRate":0.5,"sloStatus":"meeting","rollbackAvailable":true,"flagAgeDays":20,"hasOwner":false,"hasExpiry":true}'::jsonb)
ON CONFLICT (flag_id, environment_id) DO NOTHING;

INSERT INTO api_keys (org_id, name, environment_id, key_prefix, key_hash, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Production SDK Key', '00000000-0000-0000-0000-000000000010', 'fg_prod_', 'demo_hash_1', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'Staging SDK Key', '00000000-0000-0000-0000-000000000011', 'fg_stag_', 'demo_hash_2', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'Development SDK Key', '00000000-0000-0000-0000-000000000012', 'fg_dev_', 'demo_hash_3', NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;