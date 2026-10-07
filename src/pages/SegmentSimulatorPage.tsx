import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Input, Select, Spinner } from '@/components/ui';
import { evaluateFlag, ATTRIBUTES } from '@/lib/flagEvaluator';
import { FLAG_TYPE_LABELS } from '@/lib/utils';
import { Users, Play, CheckCircle2, XCircle } from 'lucide-react';
import type { Flag, FlagEnvironment, FlagVariant, Environment, UserContext } from '@/types';

export function SegmentSimulatorPage() {
  const { activeOrg } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagEnvs, setFlagEnvs] = useState<FlagEnvironment[]>([]);
  const [variants, setVariants] = useState<FlagVariant[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnv, setSelectedEnv] = useState('');

  const [ctx, setCtx] = useState<UserContext>({
    user_id: 'user-123',
    role: 'user',
    plan: 'free',
    country: 'US',
    organization: 'acme',
    tenant: 'acme-enterprise',
    app_version: '2.4.0',
  });

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [f, fe, v, e] = await Promise.all([
        supabase.from('flags').select('*').eq('org_id', activeOrg.id).eq('status', 'active'),
        supabase.from('flag_environments').select('*'),
        supabase.from('flag_variants').select('*'),
        supabase.from('environments').select('*').eq('org_id', activeOrg.id).order('display_order'),
      ]);
      setFlags(f.data ?? []);
      setFlagEnvs(fe.data ?? []);
      setVariants(v.data ?? []);
      setEnvironments(e.data ?? []);
      if (e.data && e.data.length > 0) setSelectedEnv(e.data[0].id);
      setLoading(false);
    })();
  }, [activeOrg]);

  const results = useMemo(() => {
    if (!selectedEnv) return [];
    return flags.map((flag) => {
      const fe = flagEnvs.find((fe) => fe.flag_id === flag.id && fe.environment_id === selectedEnv) ?? null;
      const flagVariants = variants.filter((v) => v.flag_id === flag.id);
      const result = evaluateFlag(fe, flag.type, flag.key, flag.is_killed, ctx, flagVariants);
      return { flag, result };
    });
  }, [flags, flagEnvs, variants, selectedEnv, ctx]);

  const enabledCount = results.filter((r) => r.result.enabled).length;

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Segment Simulator</h1>
        <p className="text-sm text-gray-500 mt-1">See which flags would be enabled for a specific user segment</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User context panel */}
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> User Context
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Environment</label>
              <Select value={selectedEnv} onChange={setSelectedEnv} className="mt-1">
                {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </div>
            {[
              { key: 'user_id', label: 'User ID' },
              { key: 'role', label: 'Role' },
              { key: 'plan', label: 'Plan' },
              { key: 'country', label: 'Country' },
              { key: 'organization', label: 'Organization' },
              { key: 'tenant', label: 'Tenant' },
              { key: 'app_version', label: 'App Version' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-gray-500">{field.label}</label>
                <Input
                  value={String(ctx[field.key] ?? '')}
                  onChange={(v) => setCtx({ ...ctx, [field.key]: v })}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Results panel */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Evaluation Results</h2>
            <Badge className="bg-blue-50 text-blue-700 border-blue-100">
              {enabledCount} / {results.length} enabled
            </Badge>
          </div>
          <div className="space-y-2">
            {results.map(({ flag, result }) => (
              <div key={flag.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                {result.enabled ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                  <div className="text-xs text-gray-400">{result.reason}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {result.variant && <Badge className="bg-blue-50 text-blue-600 border-blue-100">Variant: {result.variant}</Badge>}
                  <Badge className="bg-gray-100 text-gray-500 border-gray-200">{FLAG_TYPE_LABELS[flag.type]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
