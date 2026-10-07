import type { TargetingRule, UserContext, FlagEvaluationResult, FlagEnvironment, FlagVariant } from '@/types';

export function evaluateRule(rule: TargetingRule, ctx: UserContext): boolean {
  const attrValue = ctx[rule.attribute];
  if (attrValue === undefined || attrValue === null) return false;

  switch (rule.operator) {
    case 'equals':
      return String(attrValue) === String(rule.value);
    case 'not_equals':
      return String(attrValue) !== String(rule.value);
    case 'in':
      return Array.isArray(rule.value) && rule.value.some((v) => String(v) === String(attrValue));
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.some((v) => String(v) === String(attrValue));
    case 'greater_than':
      return Number(attrValue) > Number(rule.value);
    case 'less_than':
      return Number(attrValue) < Number(rule.value);
    case 'greater_than_or_equal':
      return Number(attrValue) >= Number(rule.value);
    case 'less_than_or_equal':
      return Number(attrValue) <= Number(rule.value);
    case 'contains':
      return String(attrValue).includes(String(rule.value));
    case 'starts_with':
      return String(attrValue).startsWith(String(rule.value));
    case 'regex':
      try {
        return new RegExp(String(rule.value)).test(String(attrValue));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function evaluateRules(rules: TargetingRule[], ctx: UserContext): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every((rule) => evaluateRule(rule, ctx));
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function isUserInRollout(userId: string | undefined, flagKey: string, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  const bucket = hashString(`${flagKey}:${userId ?? 'anonymous'}`) % 100;
  return bucket < percentage;
}

export function pickVariant(
  flagKey: string,
  userId: string | undefined,
  variants: { key: string; weight: number }[]
): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return variants[0]?.key ?? 'control';
  const bucket = hashString(`${flagKey}:${userId ?? 'anonymous'}`) % totalWeight;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (bucket < cumulative) return v.key;
  }
  return variants[variants.length - 1]?.key ?? 'control';
}

export function evaluateFlag(
  flagEnv: FlagEnvironment | null,
  flagType: string,
  flagKey: string,
  isKilled: boolean,
  ctx: UserContext,
  variants: FlagVariant[]
): FlagEvaluationResult {
  if (isKilled) {
    return { enabled: false, variant: null, reason: 'Kill switch is active' };
  }

  if (!flagEnv || !flagEnv.enabled) {
    return { enabled: false, variant: null, reason: 'Flag is disabled in this environment' };
  }

  if (!evaluateRules(flagEnv.rules, ctx)) {
    return { enabled: false, variant: null, reason: 'User does not match targeting rules' };
  }

  if (flagType === 'percentage' || flagType === 'boolean') {
    const inRollout = isUserInRollout(ctx.user_id, flagKey, flagEnv.rollout_percentage);
    return {
      enabled: inRollout,
      variant: null,
      reason: inRollout ? 'User is within rollout percentage' : 'User is outside rollout percentage',
    };
  }

  if (flagType === 'multivariate') {
    const mappedVariants = variants.map((v) => ({ key: v.key, weight: v.weight }));
    const variant = pickVariant(flagKey, ctx.user_id, mappedVariants);
    return { enabled: true, variant, reason: `Served variant: ${variant}` };
  }

  return {
    enabled: true,
    variant: flagEnv.served_variant,
    reason: 'Flag is enabled',
  };
}

export const ATTRIBUTES = [
  { value: 'user_id', label: 'User ID' },
  { value: 'role', label: 'User Role' },
  { value: 'plan', label: 'Subscription Plan' },
  { value: 'country', label: 'Country' },
  { value: 'organization', label: 'Organization' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'app_version', label: 'App Version' },
  { value: 'custom', label: 'Custom Attribute' },
];

export const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'in', label: 'Is In (comma-separated)' },
  { value: 'not_in', label: 'Is Not In' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'regex', label: 'Matches Regex' },
];
