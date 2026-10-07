import type {
  RiskFactors,
  RiskRecommendation,
  RiskConfig,
  ServiceCriticality,
  SloStatus,
} from '@/types';

const DEFAULT_CONFIG: RiskConfig = {
  rolloutWeight: 25,
  productionWeight: 20,
  criticalityWeight: 20,
  errorRateWeight: 15,
  sloWeight: 10,
  rollbackWeight: 5,
  flagAgeWeight: 5,
  missingMetaWeight: 10,
};

const criticalityScores: Record<ServiceCriticality, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const sloScores: Record<SloStatus, number> = {
  meeting: 0,
  at_risk: 60,
  breaching: 100,
};

export interface RiskFactorDetail {
  label: string;
  value: string;
  score: number;
  weight: number;
  contribution: number;
  status: 'good' | 'warning' | 'danger';
}

export interface RiskResult {
  score: number;
  recommendation: RiskRecommendation;
  recommendationText: string;
  factors: RiskFactorDetail[];
}

export function calculateRisk(
  factors: RiskFactors,
  config: RiskConfig = DEFAULT_CONFIG
): RiskResult {
  const factorDetails: RiskFactorDetail[] = [];

  // Rollout percentage
  const rolloutPct = factors.rolloutPercentage ?? 0;
  const rolloutScore = Math.min(rolloutPct, 100);
  factorDetails.push({
    label: 'Rollout Percentage',
    value: `${rolloutPct}% of users`,
    score: rolloutScore,
    weight: config.rolloutWeight,
    contribution: (rolloutScore * config.rolloutWeight) / 100,
    status: rolloutPct >= 75 ? 'danger' : rolloutPct >= 25 ? 'warning' : 'good',
  });

  // Production environment
  const isProd = factors.isProduction ?? false;
  const prodScore = isProd ? 100 : 20;
  factorDetails.push({
    label: 'Environment',
    value: isProd ? 'Production' : 'Non-production',
    score: prodScore,
    weight: config.productionWeight,
    contribution: (prodScore * config.productionWeight) / 100,
    status: isProd ? 'danger' : 'good',
  });

  // Service criticality
  const criticality = factors.serviceCriticality ?? 'medium';
  const critScore = criticalityScores[criticality] ?? 50;
  factorDetails.push({
    label: 'Service Criticality',
    value: criticality.charAt(0).toUpperCase() + criticality.slice(1),
    score: critScore,
    weight: config.criticalityWeight,
    contribution: (critScore * config.criticalityWeight) / 100,
    status: critScore >= 75 ? 'danger' : critScore >= 50 ? 'warning' : 'good',
  });

  // Error rate
  const errorRate = factors.errorRate ?? 0;
  const errorScore = Math.min(errorRate * 20, 100);
  factorDetails.push({
    label: 'Recent Error Rate',
    value: `${errorRate.toFixed(1)}%`,
    score: errorScore,
    weight: config.errorRateWeight,
    contribution: (errorScore * config.errorRateWeight) / 100,
    status: errorRate >= 2 ? 'danger' : errorRate >= 1 ? 'warning' : 'good',
  });

  // SLO status
  const sloStatus = factors.sloStatus ?? 'meeting';
  const sloScore = sloScores[sloStatus] ?? 0;
  factorDetails.push({
    label: 'SLO Status',
    value: sloStatus === 'meeting' ? 'Meeting SLO' : sloStatus === 'at_risk' ? 'At Risk' : 'Breaching',
    score: sloScore,
    weight: config.sloWeight,
    contribution: (sloScore * config.sloWeight) / 100,
    status: sloScore >= 100 ? 'danger' : sloScore >= 50 ? 'warning' : 'good',
  });

  // Rollback availability
  const hasRollback = factors.rollbackAvailable ?? false;
  const rollbackScore = hasRollback ? 0 : 100;
  factorDetails.push({
    label: 'Rollback Plan',
    value: hasRollback ? 'Available' : 'Missing',
    score: rollbackScore,
    weight: config.rollbackWeight,
    contribution: (rollbackScore * config.rollbackWeight) / 100,
    status: hasRollback ? 'good' : 'danger',
  });

  // Flag age
  const ageDays = factors.flagAgeDays ?? 0;
  const ageScore = Math.min(ageDays / 180 * 100, 100);
  factorDetails.push({
    label: 'Flag Age',
    value: ageDays < 1 ? 'Less than 1 day' : `${Math.floor(ageDays)} days old`,
    score: ageScore,
    weight: config.flagAgeWeight,
    contribution: (ageScore * config.flagAgeWeight) / 100,
    status: ageDays > 90 ? 'danger' : ageDays > 30 ? 'warning' : 'good',
  });

  // Missing owner or expiry
  const missingItems: string[] = [];
  if (!factors.hasOwner) missingItems.push('owner');
  if (!factors.hasExpiry) missingItems.push('expiry date');
  const missingScore = missingItems.length > 0 ? 100 : 0;
  factorDetails.push({
    label: 'Ownership & Expiry',
    value: missingItems.length === 0 ? 'Both assigned' : `Missing: ${missingItems.join(', ')}`,
    score: missingScore,
    weight: config.missingMetaWeight,
    contribution: (missingScore * config.missingMetaWeight) / 100,
    status: missingItems.length > 0 ? 'danger' : 'good',
  });

  // Extra penalty for expired flags
  if (factors.isExpired) {
    factorDetails.push({
      label: 'Expiration Status',
      value: 'Expired',
      score: 100,
      weight: config.missingMetaWeight / 2,
      contribution: (100 * config.missingMetaWeight / 2) / 100,
      status: 'danger',
    });
  }

  // Extra penalty for killed flags
  if (factors.isKilled) {
    factorDetails.push({
      label: 'Kill Switch',
      value: 'Activated',
      score: 100,
      weight: config.missingMetaWeight / 2,
      contribution: (100 * config.missingMetaWeight / 2) / 100,
      status: 'danger',
    });
  }

  const totalScore = Math.round(
    Math.min(factorDetails.reduce((sum, f) => sum + f.contribution, 0), 100)
  );

  let recommendation: RiskRecommendation;
  let recommendationText: string;

  if (totalScore >= 80 || factors.isKilled) {
    recommendation = 'block';
    recommendationText = 'Block release — critical risk factors detected. Do not proceed without resolving the blocking issues.';
  } else if (totalScore >= 60) {
    recommendation = 'approval';
    recommendationText = 'Require approval — significant risk factors present. A manager or admin must review and approve this rollout before proceeding.';
  } else if (totalScore >= 35) {
    recommendation = 'caution';
    recommendationText = 'Proceed with caution — some risk factors detected. Monitor closely after rollout and ensure rollback is ready.';
  } else {
    recommendation = 'safe';
    recommendationText = 'Safe to proceed — risk factors are within acceptable limits. Standard monitoring applies.';
  }

  return { score: totalScore, recommendation, recommendationText, factors: factorDetails };
}

export function getRecommendationColor(rec: RiskRecommendation): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (rec) {
    case 'safe':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Safe to Proceed' };
    case 'caution':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Proceed with Caution' };
    case 'approval':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Require Approval' };
    case 'block':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Block Release' };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 35) return 'text-amber-600';
  return 'text-emerald-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 35) return 'bg-amber-500';
  return 'bg-emerald-500';
}
