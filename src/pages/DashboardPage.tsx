import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, ProgressBar, Spinner } from '@/components/ui';
import { calculateRisk, getScoreBgColor } from '@/lib/riskEngine';
import { FLAG_TYPE_LABELS, CRITICALITY_COLORS, CRITICALITY_LABELS, relativeTime, daysSince } from '@/lib/utils';
import { Flag as FlagIcon, ShieldAlert, AlertTriangle, TrendingUp, Activity, CheckCircle2, XCircle } from 'lucide-react';
import type { Flag, RiskAssessment, AuditLog, Service, Environment } from '@/types';

interface PageIdProps { onNavigate: (page: string) => void; }

export function DashboardPage({ onNavigate }: PageIdProps) {
  const { activeOrg } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const orgId = activeOrg.id;
      const [f, r, a, s, e] = await Promise.all([
        supabase.from('flags').select('*').eq('org_id', orgId),
        supabase.from('risk_assessments').select('*').eq('org_id', orgId),
        supabase.from('audit_logs').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(10),
        supabase.from('services').select('*').eq('org_id', orgId),
        supabase.from('environments').select('*').eq('org_id', orgId).order('display_order'),
      ]);
      setFlags(f.data ?? []);
      setRisks(r.data ?? []);
      setAuditLogs(a.data ?? []);
      setServices(s.data ?? []);
      setEnvironments(e.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const activeFlags = flags.filter((f) => f.status === 'active');
  const killedFlags = flags.filter((f) => f.is_killed);
  const staleFlags = flags.filter((f) => {
    const age = daysSince(f.created_at);
    return age > 90 && !f.is_killed;
  });
  const highRisk = risks.filter((r) => r.score >= 60);
  const productionEnv = envs.find((e) => e.is_production);

  const stats = [
    { label: 'Active Flags', value: activeFlags.length, icon: FlagIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'High Risk Rollouts', value: highRisk.length, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Killed Flags', value: killedFlags.length, icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Stale Flags', value: staleFlags.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of {activeOrg?.name}'s feature flag health</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Risk Summary */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Release Risk Summary</h2>
            <button onClick={() => onNavigate('risk-review')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {risks
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((r) => {
                const flag = flags.find((f) => f.id === r.flag_id);
                if (!flag) return null;
                const env = envs.find((e) => e.id === r.environment_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                      <div className={`w-2 h-12 rounded-full ${getScoreBgColor(r.score)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{flag.name}</div>
                      <div className="text-xs text-gray-500">{env?.name ?? '—'} · Score {r.score}</div>
                    </div>
                    <Badge className={
                      r.recommendation === 'safe' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      r.recommendation === 'caution' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      r.recommendation === 'approval' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-red-100 text-red-700 border-red-200'
                    }>
                      {r.recommendation}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Services */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                  <div className="text-xs text-gray-500">Error rate: {s.error_rate.toFixed(1)}%</div>
                </div>
                <Badge className={CRITICALITY_COLORS[s.criticality]}>
                  {CRITICALITY_LABELS[s.criticality]}
                </Badge>
              </div>
            ))}
            {services.length === 0 && <p className="text-sm text-gray-400">No services configured</p>}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button onClick={() => onNavigate('audit')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {auditLogs.map((log) => {
            const flag = flags.find((f) => f.id === log.flag_id);
            return (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 font-medium">{log.action.replace(/_/g, ' ')}</span>
                  {flag && <span className="text-sm text-gray-500"> on {flag.name}</span>}
                  {log.reason && <span className="text-sm text-gray-400"> — {log.reason}</span>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{relativeTime(log.created_at)}</span>
              </div>
            );
          })}
          {auditLogs.length === 0 && <p className="text-sm text-gray-400">No recent activity</p>}
        </div>
      </Card>
    </div>
  );
}
