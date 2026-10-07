import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Select, Spinner, EmptyState, Modal } from '@/components/ui';
import { calculateRisk, getRecommendationColor, getScoreColor, getScoreBgColor, type RiskFactorDetail } from '@/lib/riskEngine';
import { FLAG_TYPE_LABELS, CRITICALITY_LABELS, CRITICALITY_COLORS, formatDate } from '@/lib/utils';
import { ShieldAlert, ShieldCheck, Shield, ShieldX, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Flag, RiskAssessment, Service, Environment, RiskFactors, RiskRecommendation, RiskConfig } from '@/types';

interface PageIdProps { onNavigate: (page: string) => void; }

const REC_ICONS: Record<RiskRecommendation, typeof ShieldCheck> = {
  safe: ShieldCheck,
  caution: ShieldAlert,
  approval: Shield,
  block: ShieldX,
};

export function RiskReviewPage({ onNavigate }: PageIdProps) {
  const { activeOrg, user, activeMembership } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [flagEnvs, setFlagEnvs] = useState<{ flag_id: string; environment_id: string; enabled: boolean; rollout_percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRec, setFilterRec] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');
  const [selectedDetail, setSelectedDetail] = useState<{ flag: Flag; env: Environment; assessment: RiskAssessment } | null>(null);
  const [showApprove, setShowApprove] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const orgId = activeOrg.id;
      const [f, r, s, e, fe] = await Promise.all([
        supabase.from('flags').select('*').eq('org_id', orgId),
        supabase.from('risk_assessments').select('*').eq('org_id', orgId),
        supabase.from('services').select('*').eq('org_id', orgId),
        supabase.from('environments').select('*').eq('org_id', orgId).order('display_order'),
        supabase.from('flag_environments').select('flag_id, environment_id, enabled, rollout_percentage'),
      ]);
      setFlags(f.data ?? []);
      setRisks(r.data ?? []);
      setServices(s.data ?? []);
      setEnvironments(e.data ?? []);
      setFlagEnvs(fe.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  const riskData = useMemo(() => {
    return risks.map((r) => {
      const flag = flags.find((f) => f.id === r.flag_id);
      const env = envs.find((e) => e.id === r.environment_id);
      const svc = services.find((s) => s.id === flag?.service_id);
      const fe = flagEnvs.find((fe) => fe.flag_id === r.flag_id && fe.environment_id === r.environment_id);
      return { assessment: r, flag, env, service: svc, flagEnv: fe };
    }).filter((r) => r.flag && r.env);
  }, [risks, flags, envs, services, flagEnvs]);

  const filtered = riskData.filter((r) => {
    if (filterRec !== 'all' && r.assessment.recommendation !== filterRec) return false;
    if (filterEnv !== 'all' && r.env?.id !== filterEnv) return false;
    return true;
  }).sort((a, b) => b.assessment.score - a.assessment.score);

  const summary = {
    safe: riskData.filter((r) => r.assessment.recommendation === 'safe').length,
    caution: riskData.filter((r) => r.assessment.recommendation === 'caution').length,
    approval: riskData.filter((r) => r.assessment.recommendation === 'approval').length,
    block: riskData.filter((r) => r.assessment.recommendation === 'block').length,
  };

  const canApprove = activeMembership?.role === 'admin' || activeMembership?.role === 'manager';

  const handleApprove = async () => {
    if (!selectedDetail || !user || !activeOrg) return;
    await supabase.from('risk_assessments').update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', selectedDetail.assessment.id);
    await supabase.from('audit_logs').insert({
      org_id: activeOrg.id, flag_id: selectedDetail.flag.id,
      action: 'risk.approved', entity_type: 'risk_assessment',
      after_state: { score: selectedDetail.assessment.score, recommendation: selectedDetail.assessment.recommendation },
      reason: `Approved risk review for ${selectedDetail.flag.name} in ${selectedDetail.env.name}`,
    });
    setShowApprove(false);
    // refresh
    const { data } = await supabase.from('risk_assessments').select('*').eq('org_id', activeOrg.id);
    setRisks(data ?? []);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Release Risk Review</h1>
        <p className="text-sm text-gray-500 mt-1">Scores every active rollout and recommends whether it's safe to proceed</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'safe', label: 'Safe to Proceed', count: summary.safe, icon: ShieldCheck, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
          { key: 'caution', label: 'Proceed with Caution', count: summary.caution, icon: ShieldAlert, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
          { key: 'approval', label: 'Require Approval', count: summary.approval, icon: Shield, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
          { key: 'block', label: 'Block Release', count: summary.block, icon: ShieldX, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
        ] as const).map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.key} className={`p-5 border-2 ${s.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${s.text}`}>{s.count}</div>
                  <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${s.text}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRec} onChange={setFilterRec} className="w-44">
          <option value="all">All Recommendations</option>
          <option value="safe">Safe to Proceed</option>
          <option value="caution">Proceed with Caution</option>
          <option value="approval">Require Approval</option>
          <option value="block">Block Release</option>
        </Select>
        <Select value={filterEnv} onChange={setFilterEnv} className="w-40">
          <option value="all">All Environments</option>
          {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </div>

      {/* Risk cards */}
      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<ShieldAlert className="w-12 h-12" />} title="No risk assessments" description="Risk assessments appear when flags are enabled in environments." />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map(({ assessment, flag, env, service, flagEnv }) => {
            const rec = getRecommendationColor(assessment.recommendation);
            const RecIcon = REC_ICONS[assessment.recommendation];
            const isApproved = !!assessment.approved_by;
            return (
              <Card key={assessment.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" >
                <div className="flex items-start justify-between mb-3">
                  <div onClick={() => setSelectedDetail({ flag: flag!, env: env!, assessment })}>
                    <div className="text-sm font-semibold text-gray-900">{flag!.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{flag!.key}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200">{env!.name}</Badge>
                      {service && <Badge className={CRITICALITY_COLORS[service.criticality]}>{CRITICALITY_LABELS[service.criticality]}</Badge>}
                      <Badge className="bg-blue-50 text-blue-600 border-blue-100">{FLAG_TYPE_LABELS[flag!.type]}</Badge>
                    </div>
                  </div>
                  {/* Score gauge */}
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100" />
                      <circle
                        cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
                        className={getScoreColor(assessment.score)}
                        strokeDasharray={`${(assessment.score / 100) * 176} 176`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getScoreColor(assessment.score)}`}>
                      {assessment.score}
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg ${rec.bg} ${rec.border} border`}>
                  <RecIcon className={`w-5 h-5 ${rec.text} flex-shrink-0`} />
                  <span className={`text-sm font-medium ${rec.text}`}>{rec.label}</span>
                  {isApproved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-auto"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>}
                </div>

                {/* Factor mini-bar */}
                <div className="flex gap-0.5 mt-3 h-1.5">
                  {(() => {
                    const factors = assessment.factors as RiskFactors;
                    const result = calculateRisk(factors, activeOrg?.risk_config);
                    return result.factors.slice(0, 8).map((f, i) => (
                      <div key={i} className={`flex-1 rounded-full ${f.status === 'good' ? 'bg-emerald-400' : f.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} title={`${f.label}: ${f.value}`} />
                    ));
                  })()}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">Assessed {formatDate(assessment.assessed_at, { short: true })}</span>
                  {assessment.recommendation === 'approval' && !isApproved && canApprove && (
                    <Button size="sm" variant="success" onClick={() => { setSelectedDetail({ flag: flag!, env: env!, assessment }); setShowApprove(true); }}>
                      Approve
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedDetail && (
        <Modal open={true} onClose={() => { setSelectedDetail(null); setShowApprove(false); }} title="Risk Review Detail" size="lg">
          <RiskDetail flag={selectedDetail.flag} env={selectedDetail.env} assessment={selectedDetail.assessment} services={services} org={activeOrg as any} />
          {selectedDetail.assessment.recommendation === 'approval' && !selectedDetail.assessment.approved_by && canApprove && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="success" onClick={handleApprove}>
                <CheckCircle2 className="w-4 h-4" /> Approve Release
              </Button>
            </div>
          )}
          {selectedDetail.assessment.approved_by && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700">Approved on {formatDate(selectedDetail.assessment.approved_at)}</span>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function RiskDetail({ flag, env, assessment, services, org }: {
  flag: Flag; env: Environment; assessment: RiskAssessment; services: Service[]; org: { risk_config: RiskConfig } | null;
}) {
  const svc = services.find((s) => s.id === flag.service_id);
  const factors = assessment.factors as RiskFactors;
  const result = calculateRisk(factors, org?.risk_config);

  const rec = getRecommendationColor(assessment.recommendation);
  const RecIcon = REC_ICONS[assessment.recommendation];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{flag.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-gray-100 text-gray-600 border-gray-200">{env.name}</Badge>
            {svc && <Badge className={CRITICALITY_COLORS[svc.criticality]}>{CRITICALITY_LABELS[svc.criticality]}</Badge>}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(assessment.score)}`}>{assessment.score}</div>
          <div className="text-xs text-gray-400">Risk Score</div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${rec.bg} ${rec.border} border`}>
        <RecIcon className={`w-6 h-6 ${rec.text} flex-shrink-0`} />
        <div>
          <div className={`font-semibold ${rec.text}`}>{rec.label}</div>
          <div className="text-sm text-gray-600 mt-0.5">{result.recommendationText}</div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Risk Factor Breakdown</h4>
        <div className="space-y-3">
          {result.factors.map((f: RiskFactorDetail, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-40 text-xs text-gray-600 flex-shrink-0">{f.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.status === 'good' ? 'bg-emerald-500' : f.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-32 text-right">{f.value}</span>
                </div>
              </div>
              <div className="text-xs font-medium text-gray-400 w-12 text-right">{f.contribution.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw factors */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        {Object.entries(factors).filter(([k]) => !['isExpired', 'isKilled'].includes(k)).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="font-medium text-gray-700">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
