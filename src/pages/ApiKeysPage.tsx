import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Spinner, Modal, Input, Select } from '@/components/ui';
import { formatDate, relativeTime } from '@/lib/utils';
import { Key, Plus, Copy, Check, Trash2 } from 'lucide-react';
import type { ApiKey, Environment } from '@/types';

export function ApiKeysPage() {
  const { activeOrg, user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [envs, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const [k, e] = await Promise.all([
        supabase.from('api_keys').select('*').eq('org_id', activeOrg.id).order('created_at', { ascending: false }),
        supabase.from('environments').select('*').eq('org_id', activeOrg.id).order('display_order'),
      ]);
      setKeys(k.data ?? []);
      setEnvironments(e.data ?? []);
      setLoading(false);
    })();
  }, [activeOrg]);

  const handleCreate = async (name: string, envId: string) => {
    const fullKey = `fg_${envId.slice(0, 8)}_${Math.random().toString(36).substring(2, 18)}`;
    const prefix = fullKey.slice(0, 12);
    const hash = btoa(fullKey + activeOrg!.id);
    await supabase.from('api_keys').insert({
      org_id: activeOrg!.id, name, environment_id: envId,
      key_prefix: prefix, key_hash: hash, created_by: user?.id,
    });
    setNewKey(fullKey);
    setShowCreate(false);
    // refresh
    const { data } = await supabase.from('api_keys').select('*').eq('org_id', activeOrg!.id).order('created_at', { ascending: false });
    setKeys(data ?? []);
  };

  const handleRevoke = async (keyId: string) => {
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId);
    const { data } = await supabase.from('api_keys').select('*').eq('org_id', activeOrg!.id).order('created_at', { ascending: false });
    setKeys(data ?? []);
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">Manage keys for programmatic access to flag evaluation</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Key</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Environment</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Key Prefix</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Created</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Last Used</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const env = envs.find((e) => e.id === key.environment_id);
                return (
                  <tr key={key.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{key.name}</td>
                    <td className="px-4 py-3"><Badge className="bg-gray-100 text-gray-600 border-gray-200">{env?.name ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{key.key_prefix}...</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(key.created_at, { short: true })}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{key.last_used_at ? relativeTime(key.last_used_at) : 'Never'}</td>
                    <td className="px-4 py-3">
                      {key.revoked_at ? <Badge className="bg-red-100 text-red-700 border-red-200">Revoked</Badge> : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {!key.revoked_at && (
                        <button onClick={() => handleRevoke(key.id)} className="text-gray-400 hover:text-red-500" title="Revoke">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {keys.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No API keys yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create modal */}
      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} envs={envs} onCreate={handleCreate} />
      )}

      {/* New key display */}
      {newKey && (
        <Modal open={true} onClose={() => setNewKey(null)} title="API Key Created" size="md">
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">Copy your API key now. For security, it will not be shown again.</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg">
              <code className="flex-1 text-sm text-emerald-400 font-mono break-all">{newKey}</code>
              <button onClick={copyKey} className="text-gray-400 hover:text-white p-1">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setNewKey(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateKeyModal({ onClose, envs, onCreate }: {
  onClose: () => void; envs: Environment[]; onCreate: (name: string, envId: string) => void;
}) {
  const [name, setName] = useState('');
  const [envId, setEnvId] = useState(envs[0]?.id ?? '');

  return (
    <Modal open={true} onClose={onClose} title="Create API Key" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <Input value={name} onChange={setName} placeholder="Production SDK Key" className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Environment</label>
          <Select value={envId} onChange={setEnvId} className="mt-1">
            {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onCreate(name || 'Unnamed Key', envId)} disabled={!envId}>Create Key</Button>
        </div>
      </div>
    </Modal>
  );
}
