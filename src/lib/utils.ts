export function formatDate(date: string | null, opts?: { short?: boolean }): string {
  if (!date) return '—';
  const d = new Date(date);
  if (opts?.short) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysSince(date: string): number {
  const now = new Date();
  const past = new Date(date);
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeTime(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function isStale(
  createdAt: string,
  updatedAt: string,
  expiresAt: string | null,
  hasOwner: boolean
): { stale: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ageDays = daysSince(createdAt);
  const updateDays = daysSince(updatedAt);
  const expDays = daysUntil(expiresAt);

  if (ageDays > 90 && updateDays > 30) reasons.push('No changes in over 30 days and older than 90 days');
  if (expDays !== null && expDays < 0) reasons.push('Past expiration date');
  if (!hasOwner) reasons.push('No owner assigned');
  if (expDays !== null && expDays >= 0 && expDays <= 7) reasons.push('Expiring within 7 days');

  return { stale: reasons.length > 0, reasons };
}

export const FLAG_TYPE_LABELS: Record<string, string> = {
  boolean: 'Boolean',
  multivariate: 'Multivariate',
  percentage: 'Percentage Rollout',
  user_targeted: 'User Targeted',
  tenant_targeted: 'Tenant Targeted',
  environment_targeted: 'Environment Targeted',
};

export const CRITICALITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const SLO_COLORS: Record<string, string> = {
  meeting: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  at_risk: 'bg-amber-100 text-amber-700 border-amber-200',
  breaching: 'bg-red-100 text-red-700 border-red-200',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  developer: 'Developer',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-purple-100 text-purple-700 border-purple-200',
  developer: 'bg-teal-100 text-teal-700 border-teal-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const ACTION_LABELS: Record<string, string> = {
  enable: 'Enable',
  disable: 'Disable',
  update_rules: 'Update Rules',
  rollback: 'Rollback',
};
