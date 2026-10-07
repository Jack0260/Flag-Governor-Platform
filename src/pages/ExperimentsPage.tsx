import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Spinner, EmptyState, ProgressBar } from '@/components/ui';
import { formatDate, relativeTime } from '@/lib/utils';
import { FlaskConical, Trophy, Users, TrendingUp } from 'lucide-react';
import type { Experiment, ExperimentVariant, Flag } from '@/types';

export function ExperimentsPage() {
  const { activeOrg } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [variants, setVariants] = useState<Record<string, ExperimentVariant[]>>({});
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [e, f] = await Promise.all([
        supabase.from('experiments').select('*').eq('org_id', activeOrg.id).order('created_at', { ascending: false }),
        supabase.from('flags').select('id, name, key').eq('org_id', activeOrg.id) as any,
      ]);
      setExperiments(e.data ?? []);
      setFlags(f.data ?? []);

      const variantMap: Record<string, ExperimentVariant[]> = {};
      for (const exp of e.data ?? []) {
        const { data: vdata } = await supabase.from('experiment_variants').select('*').eq('experiment_id', exp.id);
        variantMap[exp.id] = vdata ?? [];
      }
      setVariants(variantMap);
      setLoading(false);
    })();
  }, [activeOrg]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Experiments</h1>
        <p className="text-sm text-gray-500 mt-1">A/B test results and variant performance</p>
      </div>

      {experiments.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<FlaskConical className="w-12 h-12" />} title="No experiments" description="Create a multivariate flag to start an experiment." /></Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => {
            const flag = flags.find((f) => f.id === exp.flag_id);
            const expVariants = variants[exp.id] ?? [];
            const totalSamples = expVariants.reduce((s, v) => s + v.sample_size, 0);
            const winner = expVariants.find((v) => v.is_winner);
            const control = expVariants.find((v) => v.is_control);
            const statusColors: Record<string, string> = {
              draft: 'bg-gray-100 text-gray-600 border-gray-200',
              running: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              completed: 'bg-blue-100 text-blue-700 border-blue-200',
              paused: 'bg-amber-100 text-amber-700 border-amber-200',
            };

            return (
              <Card key={exp.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {exp.name}
                      <Badge className={statusColors[exp.status]}>{exp.status}</Badge>
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{exp.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Flag: {flag?.name ?? 'Unknown'}</span>
                      <span>Metric: {exp.metric_name ?? '—'}</span>
                      {exp.start_date && <span>Started {formatDate(exp.start_date, { short: true })}</span>}
                    </div>
                  </div>
                  {winner && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <div>
                        <div className="text-sm font-medium text-amber-700">Winner: {winner.variant_key}</div>
                        <div className="text-xs text-amber-600">{winner.conversion_rate.toFixed(1)}% conversion</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Variant results */}
                {expVariants.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase pb-2 border-b border-gray-100">
                      <div className="col-span-3">Variant</div>
                      <div className="col-span-2 text-right">Samples</div>
                      <div className="col-span-2 text-right">Conversions</div>
                      <div className="col-span-2 text-right">Conv. Rate</div>
                      <div className="col-span-3">Confidence Interval</div>
                    </div>
                    {expVariants.map((v) => {
                      const maxRate = Math.max(...expVariants.map((x) => x.conversion_rate));
                      const barPct = maxRate > 0 ? (v.conversion_rate / maxRate) * 100 : 0;
                      return (
                        <div key={v.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                          <div className="col-span-3 flex items-center gap-2">
                            <span className="font-medium text-gray-900">{v.variant_key}</span>
                            {v.is_control && <Badge className="bg-gray-100 text-gray-500 border-gray-200">Control</Badge>}
                            {v.is_winner && <Trophy className="w-4 h-4 text-amber-500" />}
                          </div>
                          <div className="col-span-2 text-right text-gray-600">{v.sample_size.toLocaleString()}</div>
                          <div className="col-span-2 text-right text-gray-600">{v.conversions.toLocaleString()}</div>
                          <div className="col-span-2 text-right">
                            <span className="font-medium text-gray-900">{v.conversion_rate.toFixed(1)}%</span>
                          </div>
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1"><ProgressBar value={barPct} colorClass={v.is_winner ? 'bg-amber-500' : v.is_control ? 'bg-gray-400' : 'bg-blue-500'} /></div>
                              <span className="text-xs text-gray-400 w-24 text-right">
                                {v.confidence_interval_lower !== null ? `${v.confidence_interval_lower.toFixed(1)}% - ${v.confidence_interval_upper?.toFixed(1)}%` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {totalSamples.toLocaleString()} total samples</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {exp.metric_name ?? 'No metric'}</span>
                  {control && winner && (
                    <span className="text-emerald-600 font-medium">
                      +{(winner.conversion_rate - control.conversion_rate).toFixed(1)}% lift over control
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
