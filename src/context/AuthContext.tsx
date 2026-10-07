import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Organization, OrgMember } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  organizations: Organization[];
  activeOrg: Organization | null;
  activeMembership: OrgMember | null;
  setActiveOrg: (org: Organization) => void;
  refreshOrgs: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [activeMembership, setActiveMembership] = useState<OrgMember | null>(null);

  const fetchOrgs = async (userId: string): Promise<void> => {
    try {
      const { data: members, error: mErr } = await supabase
        .from('org_members')
        .select('org_id, role, joined_at, id, user_id, invited_at')
        .eq('user_id', userId);

      if (mErr) throw mErr;
      if (!members || members.length === 0) return;

      const orgIds = members.map((m) => m.org_id);
      const { data: orgs, error: oErr } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (oErr) throw oErr;
      if (orgs && orgs.length > 0) {
        setOrganizations(orgs);
        const stored = localStorage.getItem('activeOrgId');
        const found = stored ? orgs.find((o) => o.id === stored) : null;
        const target = found ?? orgs[0];
        setActiveOrgState(target);
        const member = members.find((m) => m.org_id === target.id);
        if (member) setActiveMembership(member as OrgMember);
      }
    } catch (err) {
      console.error('fetchOrgs error:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchOrgs(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        (async () => {
          await fetchOrgs(sess.user.id);
          setLoading(false);
        })();
      } else {
        setOrganizations([]);
        setActiveOrgState(null);
        setActiveMembership(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const setActiveOrg = (org: Organization) => {
    localStorage.setItem('activeOrgId', org.id);
    setActiveOrgState(org);
    supabase
      .from('org_members')
      .select('*')
      .eq('org_id', org.id)
      .eq('user_id', user?.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveMembership(data as OrgMember);
      });
  };

  const refreshOrgs = async () => {
    if (user) await fetchOrgs(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await ensureDemoMembership(data.user.id);
      await fetchOrgs(data.user.id);
      setLoading(false);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setOrganizations([]);
    setActiveOrgState(null);
    setActiveMembership(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        organizations,
        activeOrg,
        activeMembership,
        setActiveOrg,
        refreshOrgs,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function ensureDemoMembership(userId: string) {
  const { data: existing } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (!existing) {
    await supabase.from('org_members').insert({
      org_id: '00000000-0000-0000-0000-000000000001',
      user_id: userId,
      role: 'admin',
    });
  }

  const { data: flags } = await supabase
    .from('flags')
    .select('id')
    .eq('org_id', '00000000-0000-0000-0000-000000000001')
    .is('owner_id', null);

  if (flags && flags.length > 0) {
    for (const f of flags) {
      await supabase.from('flags').update({ owner_id: userId }).eq('id', f.id);
    }
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
