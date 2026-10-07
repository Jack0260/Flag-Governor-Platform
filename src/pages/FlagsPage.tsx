import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Input, Select, Spinner, EmptyState, Toggle, Modal, Textarea } from '@/components/ui';
import { FLAG_TYPE_LABELS, formatDate, daysSince, daysUntil, isStale, relativeTime } from '@/lib/utils';
import { Flag as FlagIcon, Plus, Search, AlertTriangle, Zap, RotateCcw, X, ChevronRight } from 'lucide-react';
import type { Flag, FlagEnvironment, FlagVariant, Service, Environment, FlagDependency, AuditLog, FlagType } from '@/types';

interface PageIdProps { onNavigate: (page: string) => void; onSelectFlag?: (flagId: string) => void; }

export function FlagsPage({ onNavigate, onSelectFlag }: PageIdProps) {
  const { activeOrg } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagEnvs, setFlagEnvs] = useState<FlagEnvironment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const orgId = activeOrg.id;
      const [f, fe, s, e] = await Promise.all([
        supabase.from('flags').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
        supabase.from('flag_environments').select('*, flags!inner(org_id)').eq('flags.org_id', orgId),
        supabase.from('services').select('*').eq('org_id', orgId),
        supabase.from('environments').select('*').eq('org_id', orgId).order('display_order'),
      ]);
      setFlags(f.data ?? []);
      setFlagEnvs(fe.data ?? []);
      setServices(s.data ?? []);
      setEnvironments(e.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  const filtered = useMemo(() => {
    return flags.filter((f) => {
      if (filterType !== 'all' && f.type !== filterType) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.key.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [flags, search, filterType, filterStatus]);

  const getFlagEnv = (flagId: string, envId: string) => flagEnvs.find((fe) => fe.flag_id === flagId && fe.environment_id === envId);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-sm text-gray-500 mt-1">{flags.length} flags in {activeOrg?.name}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Flag
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={setSearch} placeholder="Search by name or key..." className="pl-9" />
          </div>
          <Select value={filterType} onChange={setFilterType} className="w-44">
            <option value="all">All Types</option>
            {Object.entries(FLAG_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={filterStatus} onChange={setFilterStatus} className="w-36">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </Card>

      {/* Flag List */}
      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FlagIcon className="w-12 h-12" />}
            title="No flags found"
            description="Try adjusting your filters or create a new flag."
            action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Flag</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Flag</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Type</th>
                  {envs.map((e) => (
                    <th key={e.id} className="text-center text-xs font-semibold text-gray-500 uppercase px-3 py-3">{e.name}</th>
                  ))}
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Owner</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Expires</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((flag) => {
                  const staleInfo = isStale(flag.created_at, flag.updated_at, flag.expires_at, !!flag.owner_id);
                  const svc = services.find((s) => s.id === flag.service_id);
                  return (
                    <tr
                      key={flag.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => { onSelectFlag?.(flag.id); onNavigate('flag-detail'); }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{flag.key}</div>
                          </div>
                          {flag.is_killed && <Badge className="bg-red-100 text-red-700 border-red-200">Killed</Badge>}
                          {staleInfo.stale && !flag.is_killed && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Stale</Badge>}
                        </div>
                        {svc && <div className="text-xs text-gray-400 mt-0.5">{svc.name}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200">{FLAG_TYPE_LABELS[flag.type]}</Badge>
                      </td>
                      {envs.map((e) => {
                        const fe = getFlagEnv(flag.id, e.id);
                        return (
                          <td key={e.id} className="px-3 py-3 text-center">
                            {fe ? (
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${fe.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} title={fe.enabled ? `Enabled · ${fe.rollout_percentage}%` : 'Disabled'} />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-xs text-gray-500">{flag.owner_id ? 'Assigned' : <span className="text-amber-600">Missing</span>}</td>
                      <td className="px-4 py-3 text-xs">
                        {flag.expires_at ? (
                          (() => { const d = daysUntil(flag.expires_at); return d !== null ? (
                            <span className={d < 0 ? 'text-red-600' : d <= 7 ? 'text-amber-600' : 'text-gray-500'}>{d < 0 ? `${Math.abs(d)}d ago` : `in ${d}d`}</span>
                          ) : '—'; })()
                        ) : <span className="text-amber-600">No expiry</span>}
                      </td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showCreate && <CreateFlagModal onClose={() => setShowCreate(false)} orgId={activeOrg!.id} services={services} envs={envs} onCreated={() => { setShowCreate(false); window.location.reload(); }} />}
    </div>
  );
}

function CreateFlagModal({ onClose, orgId, services, envs, onCreated }: {
  onClose: () => void; orgId: string; services: Service[]; envs: Environment[]; onCreated: () => void;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<FlagType>('boolean');
  const [serviceId, setServiceId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase.from('flags').insert({
      org_id: orgId, key, name, description, type,
      service_id: serviceId || null,
      expires_at: expiresAt || null,
    }).select().single();
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    for (const env of envs) {
      await supabase.from('flag_environments').insert({
        flag_id: data.id, environment_id: env.id, enabled: false, rollout_percentage: 0, rules: [],
      });
    }
    await supabase.from('audit_logs').insert({
      org_id: orgId, flag_id: data.id, action: 'flag.created', entity_type: 'flag',
      after_state: { key, name, type }, reason: 'Flag created',
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open={true} onClose={onClose} title="Create New Flag" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Flag Key</label>
          <Input value={key} onChange={setKey} placeholder="my-feature-flag" />
          <p className="text-xs text-gray-400 mt-1">Lowercase, hyphen-separated. Used in SDK calls.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
          <Input value={name} onChange={setName} placeholder="My Feature Flag" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <Textarea value={description} onChange={setDescription} placeholder="What does this flag control?" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <Select value={type} onChange={(v) => setType(v as FlagType)}>
              {Object.entries(FLAG_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service</label>
            <Select value={serviceId} onChange={setServiceId}>
              <option value="">No service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiration Date</label>
          <Input type="date" value={expiresAt} onChange={setExpiresAt} />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !key || !name}>{saving ? 'Creating...' : 'Create Flag'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function FlagDetailPage({ flagId, onNavigate }: { flagId: string; onNavigate: (page: string) => void }) {
  const { activeOrg, user } = useAuth();
  const [flag, setFlag] = useState<Flag | null>(null);
  const [flagEnvs, setFlagEnvs] = useState<FlagEnvironment[]>([]);
  const [variants, setVariants] = useState<FlagVariant[]>([]);
  const [deps, setDeps] = useState<FlagDependency[]>([]);
  const [allFlags, setAllFlags] = useState<Flag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [showRollback, setShowRollback] = useState(false);

  const loadFlag = async () => {
    if (!flagId) return;
    const [f, fe, v, d, af, a, e, s] = await Promise.all([
      supabase.from('flags').select('*').eq('id', flagId).maybeSingle(),
      supabase.from('flag_environments').select('*').eq('flag_id', flagId),
      supabase.from('flag_variants').select('*').eq('flag_id', flagId).order('sort_order'),
      supabase.from('flag_dependencies').select('*').eq('flag_id', flagId),
      supabase.from('flags').select('id, key, name, org_id').eq('org_id', activeOrg?.id ?? '') as any,
      supabase.from('audit_logs').select('*').eq('flag_id', flagId).order('created_at', { ascending: false }).limit(20),
      supabase.from('environments').select('*').eq('org_id', activeOrg?.id ?? '').order('display_order'),
      supabase.from('services').select('*').eq('org_id', activeOrg?.id ?? ''),
    ]);
    setFlag(f.data as Flag | null);
    setFlagEnvs(fe.data ?? []);
    setVariants(v.data ?? []);
    setDeps(d.data ?? []);
    setAllFlags(af.data ?? []);
    setAuditLogs(a.data ?? []);
    setEnvironments(e.data ?? []);
    setServices(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadFlag(); }, [flagId, activeOrg]);

  const updateFlagEnv = async (fe: FlagEnvironment, changes: Partial<FlagEnvironment>, reason: string) => {
    const before = { enabled: fe.enabled, rollout_percentage: fe.rollout_percentage };
    const { error } = await supabase.from('flag_environments').update(changes).eq('id', fe.id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        org_id: activeOrg!.id, flag_id: flag!.id, action: 'flag_env.updated', entity_type: 'flag_environment',
        before_state: before, after_state: changes, reason,
      });
      loadFlag();
    }
  };

  const activateKillSwitch = async () => {
    if (!flag) return;
    const before = { is_killed: false };
    await supabase.from('flags').update({ is_killed: true, kill_switch_at: new Date().toISOString() }).eq('id', flag.id);
    await supabase.from('audit_logs').insert({
      org_id: activeOrg!.id, flag_id: flag.id, action: 'flag.kill_switch', entity_type: 'flag',
      before_state: before, after_state: { is_killed: true }, reason: 'Kill switch activated',
    });
    setShowKillSwitch(false);
    loadFlag();
  };

  const performRollback = async () => {
    if (!flag?.last_state) return;
    await supabase.from('flags').update({ is_killed: false, kill_switch_at: null, ...flag.last_state }).eq('id', flag.id);
    await supabase.from('audit_logs').insert({
      org_id: activeOrg!.id, flag_id: flag.id, action: 'flag.rollback', entity_type: 'flag',
      before_state: { is_killed: flag.is_killed }, after_state: flag.last_state, reason: 'Rollback to previous state',
    });
    setShowRollback(false);
    loadFlag();
  };

  const saveEnvConfig = async (fe: FlagEnvironment, enabled: boolean, rollout: number) => {
    await updateFlagEnv(fe, { enabled, rollout_percentage: rollout }, `Updated config: enabled=${enabled}, rollout=${rollout}%`);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!flag) return <Card className="p-6"><EmptyState title="Flag not found" /></Card>;

  const svc = services.find((s) => s.id === flag.service_id);
  const staleInfo = isStale(flag.created_at, flag.updated_at, flag.expires_at, !!flag.owner_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => onNavigate('flags')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to flags
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {flag.name}
            {flag.is_killed && <Badge className="bg-red-100 text-red-700 border-red-200">Killed</Badge>}
            {staleInfo.stale && !flag.is_killed && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Stale</Badge>}
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">{flag.key}</p>
        </div>
        <div className="flex gap-2">
          {flag.is_killed ? (
            <Button variant="secondary" onClick={() => setShowRollback(true)}>
              <RotateCcw className="w-4 h-4" /> Rollback
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setShowKillSwitch(true)}>
              <Zap className="w-4 h-4" /> Kill Switch
            </Button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Type</div>
          <div className="text-sm font-medium text-gray-900">{FLAG_TYPE_LABELS[flag.type]}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Service</div>
          <div className="text-sm font-medium text-gray-900">{svc?.name ?? 'Unassigned'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Created</div>
          <div className="text-sm font-medium text-gray-900">{formatDate(flag.created_at, { short: true })}</div>
          <div className="text-xs text-gray-400">{daysSince(flag.created_at)} days ago</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Expires</div>
          {flag.expires_at ? (
            <>
              <div className="text-sm font-medium text-gray-900">{formatDate(flag.expires_at, { short: true })}</div>
              {(() => { const d = daysUntil(flag.expires_at); return d !== null && <div className={`text-xs ${d < 0 ? 'text-red-600' : d <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>{d < 0 ? `${Math.abs(d)} days ago` : `in ${d} days`}</div>; })()}
            </>
          ) : <div className="text-sm text-amber-600">No expiry set</div>}
        </Card>
      </div>

      {flag.description && (
        <Card className="p-5">
          <div className="text-xs text-gray-500 mb-2">Description</div>
          <p className="text-sm text-gray-700">{flag.description}</p>
        </Card>
      )}

      {/* Environment configs */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Configuration</h2>
        <div className="space-y-4">
          {envs.map((env) => {
            const fe = flagEnvs.find((f) => f.environment_id === env.id);
            if (!fe) return null;
            return <EnvConfigRow key={env.id} env={env} fe={fe} flagType={flag.type} onSave={(en, r) => saveEnvConfig(fe, en, r)} disabled={flag.is_killed} />;
          })}
        </div>
      </Card>

      {/* Variants */}
      {flag.type === 'multivariate' && variants.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Variants</h2>
          <div className="space-y-2">
            {variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-900">{v.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{v.key}</div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">{v.weight}% weight</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dependencies */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dependencies</h2>
        {deps.length > 0 ? (
          <div className="space-y-2">
            {deps.map((d) => {
              const dep = allFlags.find((f) => f.id === d.depends_on_flag_id);
              return (
                <div key={d.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-700">Depends on <strong>{dep?.name ?? dep?.key ?? 'Unknown'}</strong></span>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-gray-400">No dependencies declared</p>}
      </Card>

      {/* Audit trail */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                {log.reason && <span className="text-sm text-gray-500"> — {log.reason}</span>}
              </div>
              <span className="text-xs text-gray-400">{relativeTime(log.created_at)}</span>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="text-sm text-gray-400">No audit entries</p>}
        </div>
      </Card>

      {/* Kill switch modal */}
      <Modal open={showKillSwitch} onClose={() => setShowKillSwitch(false)} title="Activate Kill Switch" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <Zap className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">This will instantly disable <strong>{flag.name}</strong> across ALL environments. This action is logged and cannot be undone without a rollback.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowKillSwitch(false)}>Cancel</Button>
            <Button variant="danger" onClick={activateKillSwitch}>Activate Kill Switch</Button>
          </div>
        </div>
      </Modal>

      {/* Rollback modal */}
      <Modal open={showRollback} onClose={() => setShowRollback(false)} title="Rollback Flag" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700">This will restore <strong>{flag.name}</strong> to its state before the kill switch was activated.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRollback(false)}>Cancel</Button>
            <Button variant="success" onClick={performRollback} disabled={!flag.last_state}>
              {flag.last_state ? 'Perform Rollback' : 'No previous state'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EnvConfigRow({ env, fe, flagType, onSave, disabled }: {
  env: Environment; fe: FlagEnvironment; flagType: string; onSave: (enabled: boolean, rollout: number) => void; disabled: boolean;
}) {
  const [enabled, setEnabled] = useState(fe.enabled);
  const [rollout, setRollout] = useState(fe.rollout_percentage);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setEnabled(fe.enabled); setRollout(fe.rollout_percentage); setDirty(false); }, [fe]);

  const handleChange = (en: boolean, r: number) => { setEnabled(en); setRollout(r); setDirty(true); };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-gray-100">
      <div className="flex items-center gap-3 min-w-40">
        <Toggle checked={enabled} onChange={(v) => handleChange(v, rollout)} disabled={disabled} />
        <div>
          <div className="text-sm font-medium text-gray-900">{env.name}</div>
          {env.is_production && <Badge className="bg-red-50 text-red-600 border-red-100">Production</Badge>}
        </div>
      </div>
      {(flagType === 'percentage' || flagType === 'boolean') && (
        <div className="flex items-center gap-3 flex-1 min-w-40">
          <input
            type="range" min={0} max={100} step={5}
            value={rollout}
            onChange={(e) => handleChange(enabled, Number(e.target.value))}
            disabled={disabled || !enabled}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 w-12 text-right">{rollout}%</span>
        </div>
      )}
      {dirty && (
        <Button size="sm" onClick={() => { onSave(enabled, rollout); setDirty(false); }} disabled={disabled}>
          Save
        </Button>
      )}
    </div>
  );
}
