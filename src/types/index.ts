export type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'user_targeted' | 'tenant_targeted' | 'environment_targeted';
export type FlagStatus = 'active' | 'inactive' | 'archived';
export type ServiceCriticality = 'critical' | 'high' | 'medium' | 'low';
export type SloStatus = 'meeting' | 'at_risk' | 'breaching';
export type MemberRole = 'admin' | 'manager' | 'developer' | 'viewer';
export type RiskRecommendation = 'safe' | 'caution' | 'approval' | 'block';
export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'paused';
export type ScheduledAction = 'enable' | 'disable' | 'update_rules' | 'rollback';
export type ScheduledStatus = 'pending' | 'executed' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  risk_config: RiskConfig;
  created_at: string;
}

export interface RiskConfig {
  rolloutWeight: number;
  productionWeight: number;
  criticalityWeight: number;
  errorRateWeight: number;
  sloWeight: number;
  rollbackWeight: number;
  flagAgeWeight: number;
  missingMetaWeight: number;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  invited_at: string | null;
}

export interface Service {
  id: string;
  org_id: string;
  name: string;
  criticality: ServiceCriticality;
  slo_status: SloStatus;
  error_rate: number;
  description: string | null;
  created_at: string;
}

export interface Environment {
  id: string;
  org_id: string;
  name: string;
  is_production: boolean;
  display_order: number;
  created_at: string;
}

export interface Flag {
  id: string;
  org_id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  owner_id: string | null;
  service_id: string | null;
  status: FlagStatus;
  is_killed: boolean;
  kill_switch_at: string | null;
  last_state: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface FlagVariant {
  id: string;
  flag_id: string;
  key: string;
  name: string;
  description: string | null;
  weight: number;
  sort_order: number;
}

export interface TargetingRule {
  attribute: string;
  operator: string;
  value: unknown;
}

export interface FlagEnvironment {
  id: string;
  flag_id: string;
  environment_id: string;
  enabled: boolean;
  rollout_percentage: number;
  rules: TargetingRule[];
  served_variant: string | null;
  updated_at: string;
}

export interface FlagDependency {
  id: string;
  flag_id: string;
  depends_on_flag_id: string;
  created_at: string;
}

export interface FlagConflict {
  id: string;
  org_id: string;
  flag_a_id: string;
  flag_b_id: string;
  description: string;
  detected_at: string;
  resolved_at: string | null;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  flag_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface Experiment {
  id: string;
  org_id: string;
  flag_id: string;
  name: string;
  description: string | null;
  status: ExperimentStatus;
  start_date: string | null;
  end_date: string | null;
  metric_name: string | null;
  metric_description: string | null;
  created_at: string;
}

export interface ExperimentVariant {
  id: string;
  experiment_id: string;
  variant_key: string;
  sample_size: number;
  conversions: number;
  conversion_rate: number;
  confidence_interval_lower: number | null;
  confidence_interval_upper: number | null;
  is_winner: boolean;
  is_control: boolean;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  environment_id: string;
  key_prefix: string;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface ScheduledChange {
  id: string;
  org_id: string;
  flag_id: string;
  environment_id: string;
  action: ScheduledAction;
  scheduled_for: string;
  executed_at: string | null;
  status: ScheduledStatus;
  requested_by: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  org_id: string;
  flag_id: string;
  environment_id: string;
  score: number;
  recommendation: RiskRecommendation;
  factors: RiskFactors;
  assessed_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface RiskFactors {
  rolloutPercentage?: number;
  isProduction?: boolean;
  serviceCriticality?: ServiceCriticality;
  errorRate?: number;
  sloStatus?: SloStatus;
  rollbackAvailable?: boolean;
  flagAgeDays?: number;
  hasOwner?: boolean;
  hasExpiry?: boolean;
  isExpired?: boolean;
  isKilled?: boolean;
}

export interface UserContext {
  user_id?: string;
  role?: string;
  plan?: string;
  country?: string;
  organization?: string;
  tenant?: string;
  app_version?: string;
  [key: string]: unknown;
}

export interface FlagEvaluationResult {
  enabled: boolean;
  variant: string | null;
  reason: string;
}
