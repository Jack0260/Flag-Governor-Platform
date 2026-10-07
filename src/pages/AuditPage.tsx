import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Select, Spinner, EmptyState, Input } from '@/components/ui';
import { formatDate, relativeTime } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import type { AuditLog, Flag } from '@/types';

export function AuditPage() {
  const { activeOrg } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterFlag, setFilterFlag] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [l, f] = await Promise.all([
        supabase.from('audit_logs').select('*').eq('org_id', activeOrg.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('flags').select('id, name, key').eq('org_id', activeOrg.id) as any,
      ]);
      setLogs(l.data ?? []);
      setFlags(f.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  const actions = [...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (filterFlag !== 'all' && l.flag_id !== filterFlag) return false;
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !(l.reason?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Complete history of every flag change</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input value={search} onChange={setSearch} placeholder="Search action or reason..." className="flex-1 min-w-48" />
          <Select value={filterAction} onChange={setFilterAction} className="w-48">
            <option value="all">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select value={filterFlag} onChange={setFilterFlag} className="w-48">
            <option value="all">All Flags</option>
            {flags.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<ScrollText className="w-12 h-12" />} title="No audit entries" /></Card>
      ) : (
        <Card className="p-5">
          <div className="space-y-1">
            {filtered.map((log) => {
              const flag = flags.find((f) => f.id === log.flag_id);
              return (
                <div key={log.id} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100">{log.action.replace(/_/g, ' ')}</Badge>
                      {flag && <span className="text-sm font-medium text-gray-900">{flag.name}</span>}
                      <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                    </div>
                    {log.reason && <p className="text-sm text-gray-500 mt-1">{log.reason}</p>}
                    {log.before_state && log.after_state && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-mono">{JSON.stringify(log.before_state)}</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-gray-600 font-mono">{JSON.stringify(log.after_state)}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{relativeTime(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
