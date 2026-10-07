import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Spinner, Button, Modal, Select, Input } from '@/components/ui';
import { formatDate, daysUntil, ACTION_LABELS } from '@/lib/utils';
import { Calendar, Plus, Clock, AlertCircle } from 'lucide-react';
import type { ScheduledChange, Flag, Environment } from '@/types';

export function CalendarPage() {
  const { activeOrg } = useAuth();
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [c, f, e] = await Promise.all([
        supabase.from('scheduled_changes').select('*').eq('org_id', activeOrg.id).order('scheduled_for'),
        supabase.from('flags').select('id, name, key').eq('org_id', activeOrg.id) as any,
        supabase.from('environments').select('*').eq('org_id', activeOrg.id).order('display_order'),
      ]);
      setChanges(c.data ?? []);
      setFlags(f.data ?? []);
      setEnvironments(e.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [viewMonth]);

  const getChangesForDay = (date: Date) => {
    return changes.filter((c) => {
      const cd = new Date(c.scheduled_for);
      return cd.toDateString() === date.toDateString();
    });
  };

  const actionColors: Record<string, string> = {
    enable: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    disable: 'bg-red-100 text-red-700 border-red-200',
    update_rules: 'bg-blue-100 text-blue-700 border-blue-200',
    rollback: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const upcomingChanges = changes
    .filter((c) => c.status === 'pending' && new Date(c.scheduled_for) >= new Date())
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
    .slice(0, 8);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Scheduled flag changes across environments</p>
        </div>
        <Button onClick={() => setShowSchedule(true)}><Plus className="w-4 h-4" /> Schedule Change</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>←</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMonth(new Date())}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>→</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
            {calendarDays.map((date, i) => {
              if (!date) return <div key={i} />;
              const dayChanges = getChangesForDay(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={`min-h-20 p-1.5 rounded-lg border text-xs ${
                    isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{date.getDate()}</div>
                  <div className="space-y-0.5 mt-1">
                    {dayChanges.slice(0, 3).map((c) => {
                      const flag = flags.find((f) => f.id === c.flag_id);
                      return (
                        <div key={c.id} className={`px-1 py-0.5 rounded text-[10px] truncate border ${actionColors[c.action] ?? 'bg-gray-100'}`} title={flag?.name}>
                          {ACTION_LABELS[c.action]}: {flag?.name ?? 'Unknown'}
                        </div>
                      );
                    })}
                    {dayChanges.length > 3 && <div className="text-[10px] text-gray-400">+{dayChanges.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Upcoming
          </h2>
          <div className="space-y-3">
            {upcomingChanges.map((c) => {
              const flag = flags.find((f) => f.id === c.flag_id);
              const env = envs.find((e) => e.id === c.environment_id);
              const daysAway = daysUntil(c.scheduled_for);
              return (
                <div key={c.id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={actionColors[c.action] ?? 'bg-gray-100'}>{ACTION_LABELS[c.action]}</Badge>
                    <span className="text-xs text-gray-400">{daysAway !== null ? daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days` : ''}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{flag?.name ?? 'Unknown flag'}</div>
                  <div className="text-xs text-gray-500">{env?.name ?? '—'}</div>
                  {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                </div>
              );
            })}
            {upcomingChanges.length === 0 && <p className="text-sm text-gray-400">No upcoming changes</p>}
          </div>
        </Card>
      </div>

      {showSchedule && activeOrg && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          orgId={activeOrg.id}
          flags={flags}
          envs={envs}
          onCreated={() => { setShowSchedule(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}

function ScheduleModal({ onClose, orgId, flags, envs, onCreated }: {
  onClose: () => void; orgId: string; flags: { id: string; name: string }[]; envs: Environment[]; onCreated: () => void;
}) {
  const [flagId, setFlagId] = useState(flags[0]?.id ?? '');
  const [envId, setEnvId] = useState(envs[0]?.id ?? '');
  const [action, setAction] = useState('enable');
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('scheduled_changes').insert({
      org_id: orgId, flag_id: flagId, environment_id: envId, action,
      scheduled_for: new Date(date).toISOString(), notes,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open={true} onClose={onClose} title="Schedule Change" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Flag</label>
          <Select value={flagId} onChange={setFlagId} className="mt-1">
            {flags.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Environment</label>
          <Select value={envId} onChange={setEnvId} className="mt-1">
            {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Action</label>
          <Select value={action} onChange={setAction} className="mt-1">
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Date</label>
          <Input type="date" value={date} onChange={setDate} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <Input value={notes} onChange={setNotes} placeholder="Why is this change scheduled?" className="mt-1" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !flagId || !envId}>{saving ? 'Saving...' : 'Schedule'}</Button>
        </div>
      </div>
    </Modal>
  );
}
