/*
# Flag Governor — Core Schema (Part 1: Tables)

Creates all tables for the multi-tenant feature flag platform.
Policies are added in a separate step after all tables exist.
*/

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  risk_config jsonb NOT NULL DEFAULT '{"rolloutWeight": 25, "productionWeight": 20, "criticalityWeight": 20, "errorRateWeight": 15, "sloWeight": 10, "rollbackWeight": 5, "flagAgeWeight": 5, "missingMetaWeight": 10}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORG MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'developer' CHECK (role IN ('admin', 'manager', 'developer', 'viewer')),
  invited_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  criticality text NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  slo_status text NOT NULL DEFAULT 'meeting' CHECK (slo_status IN ('meeting', 'at_risk', 'breaching')),
  error_rate numeric NOT NULL DEFAULT 0 CHECK (error_rate >= 0 AND error_rate <= 100),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ============================================================
-- ENVIRONMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_production boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ============================================================
-- FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('boolean', 'multivariate', 'percentage', 'user_targeted', 'tenant_targeted', 'environment_targeted')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_killed boolean NOT NULL DEFAULT false,
  kill_switch_at timestamptz,
  last_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(org_id, key)
);

-- ============================================================
-- FLAG VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS flag_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  weight int NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE(flag_id, key)
);

-- ============================================================
-- FLAG ENVIRONMENTS (per-env config)
-- ============================================================
CREATE TABLE IF NOT EXISTS flag_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  served_variant text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flag_id, environment_id)
);

-- ============================================================
-- FLAG DEPENDENCIES
-- ============================================================
CREATE TABLE IF NOT EXISTS flag_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  depends_on_flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flag_id, depends_on_flag_id),
  CHECK (flag_id != depends_on_flag_id)
);

-- ============================================================
-- FLAG CONFLICTS
-- ============================================================
CREATE TABLE IF NOT EXISTS flag_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_a_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  flag_b_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  description text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flag_id uuid REFERENCES flags(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT 'flag',
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPERIMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  start_date timestamptz,
  end_date timestamptz,
  metric_name text,
  metric_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPERIMENT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS experiment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  sample_size int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  confidence_interval_lower numeric,
  confidence_interval_upper numeric,
  is_winner boolean NOT NULL DEFAULT false,
  is_control boolean NOT NULL DEFAULT false,
  UNIQUE(experiment_id, variant_key)
);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- ============================================================
-- SCHEDULED CHANGES
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('enable', 'disable', 'update_rules', 'rollback')),
  scheduled_for timestamptz NOT NULL,
  executed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled')),
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  before_state jsonb,
  after_state jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RISK ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  recommendation text NOT NULL DEFAULT 'safe' CHECK (recommendation IN ('safe', 'caution', 'approval', 'block')),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  UNIQUE(flag_id, environment_id)
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_flags_org ON flags(org_id);
CREATE INDEX IF NOT EXISTS idx_flags_owner ON flags(owner_id);
CREATE INDEX IF NOT EXISTS idx_flags_status ON flags(status);
CREATE INDEX IF NOT EXISTS idx_flag_env_flag ON flag_environments(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_env_env ON flag_environments(environment_id);
CREATE INDEX IF NOT EXISTS idx_variants_flag ON flag_variants(flag_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_flag ON audit_logs(flag_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_org ON services(org_id);
CREATE INDEX IF NOT EXISTS idx_env_org ON environments(org_id);
CREATE INDEX IF NOT EXISTS idx_exp_org ON experiments(org_id);
CREATE INDEX IF NOT EXISTS idx_exp_flag ON experiments(flag_id);
CREATE INDEX IF NOT EXISTS idx_expvar_exp ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_sched_org ON scheduled_changes(org_id);
CREATE INDEX IF NOT EXISTS idx_sched_flag ON scheduled_changes(flag_id);
CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_flag ON risk_assessments(flag_id);
CREATE INDEX IF NOT EXISTS idx_deps_flag ON flag_dependencies(flag_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_org ON flag_conflicts(org_id);

-- ============================================================
-- UPDATED_AT TRIGGER for flags
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flags_updated_at ON flags;
CREATE TRIGGER flags_updated_at BEFORE UPDATE ON flags
FOR EACH ROW EXECUTE FUNCTION update_updated_at();