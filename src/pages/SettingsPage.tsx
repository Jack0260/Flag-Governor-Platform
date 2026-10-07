import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Input, Select, Spinner } from '@/components/ui';
import { ROLE_LABELS, ROLE_COLORS, CRITICALITY_LABELS, CRITICALITY_COLORS, SLO_COLORS, formatDate, relativeTime } from '@/lib/utils';
import { Settings, Building2, Users, Server, Sliders, Save } from 'lucide-react';
import type { Service, Environment, OrgMember, RiskConfig } from '@/types';

type Tab = 'general' | 'members' | 'services' | 'environments' | 'risk-config';

export function SettingsPage() {
  const { activeOrg, activeMembership, refreshOrgs } = useAuth();
  const [tab, setTab] = useState<Tab>('general');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [savingRisk, setSavingRisk] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [m, s, e] = await Promise.all([
        supabase.from('org_members').select('*').eq('org_id', activeOrg.id),
        supabase.from('services').select('*').eq('org_id', activeOrg.id).order('name'),
        supabase.from('environments').select('*').eq('org_id', activeOrg.id).order('display_order'),
      ]);
      setMembers(m.data ?? []);
      setServices(s.data ?? []);
      setEnvironments(e.data ?? []);
      setRiskConfig(activeOrg.risk_config);
      setLoading(false);
    })();
  }, [activeOrg]);

  const canManage = activeMembership?.role === 'admin';

  const saveRiskConfig = async () => {
    if (!activeOrg || !riskConfig) return;
    setSavingRisk(true);
    await supabase.from('organizations').update({ risk_config: riskConfig as any }).eq('id', activeOrg.id);
    setSavingRisk(false);
    refreshOrgs();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'environments', label: 'Environments', icon: Settings },
    { id: 'risk-config', label: 'Risk Weights', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization, members, and configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {tab === 'general' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Organization Name</label>
              <div className="text-sm text-gray-900 mt-1">{activeOrg?.name}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Slug</label>
              <div className="text-sm text-gray-900 mt-1 font-mono">{activeOrg?.slug}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="text-sm text-gray-900 mt-1">{formatDate(activeOrg?.created_at ?? '')}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Members */}
      {tab === 'members' && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
                    {m.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.user_id === activeMembership?.user_id ? 'You' : `User ${m.user_id.slice(0, 8)}`}</div>
                    <div className="text-xs text-gray-400">Joined {relativeTime(m.joined_at)}</div>
                  </div>
                </div>
                {canManage ? (
                  <Select
                    value={m.role}
                    onChange={async (v) => {
                      await supabase.from('org_members').update({ role: v as any }).eq('id', m.id);
                      setMembers(members.map((x) => x.id === m.id ? { ...x, role: v as any } : x));
                    }}
                    className="w-32"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                ) : (
                  <Badge className={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Services */}
      {tab === 'services' && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={SLO_COLORS[s.slo_status]}>{s.slo_status.replace('_', ' ')}</Badge>
                  <Badge className={CRITICALITY_COLORS[s.criticality]}>{CRITICALITY_LABELS[s.criticality]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Environments */}
      {tab === 'environments' && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Environments</h2>
          <div className="space-y-2">
            {envs.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{e.name}</span>
                  {e.is_production && <Badge className="bg-red-50 text-red-600 border-red-100">Production</Badge>}
                </div>
                <span className="text-xs text-gray-400">Order: {e.display_order}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Risk config */}
      {tab === 'risk-config' && riskConfig && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Risk Scoring Weights</h2>
            <Button size="sm" onClick={saveRiskConfig} disabled={!canManage || savingRisk}>
              <Save className="w-4 h-4" /> {savingRisk ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Adjust how much each factor contributes to the overall risk score. Weights are normalized to percentages.</p>
          <div className="space-y-4">
            {([
              { key: 'rolloutWeight', label: 'Rollout Percentage', desc: 'How much the rollout percentage affects risk' },
              { key: 'productionWeight', label: 'Production Environment', desc: 'Weight for production vs non-production' },
              { key: 'criticalityWeight', label: 'Service Criticality', desc: 'Weight for the affected service criticality' },
              { key: 'errorRateWeight', label: 'Error Rate', desc: 'Weight for recent service error rate' },
              { key: 'sloWeight', label: 'SLO Status', desc: 'Weight for SLO meeting/at-risk/breaching' },
              { key: 'rollbackWeight', label: 'Rollback Availability', desc: 'Weight for missing rollback plans' },
              { key: 'flagAgeWeight', label: 'Flag Age', desc: 'Weight for how old the flag is' },
              { key: 'missingMetaWeight', label: 'Missing Owner/Expiry', desc: 'Weight for missing owner or expiration date' },
            ] as const).map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">{item.label}</label>
                  <span className="text-sm text-gray-500">{riskConfig[item.key]}</span>
                </div>
                <input
                  type="range" min={0} max={50} step={5}
                  value={riskConfig[item.key]}
                  onChange={(e) => setRiskConfig({ ...riskConfig, [item.key]: Number(e.target.value) })}
                  disabled={!canManage}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
