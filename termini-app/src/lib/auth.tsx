import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getMyShops, getProfile } from './api';
import type { Profile, Shop } from './types';

type AuthState = {
  loading: boolean; session: Session | null; user: User | null; profile: Profile | null; shops: Shop[];
  /** set when the page was opened from a "reset password" email */
  recovery: boolean;
  refresh: () => Promise<void>; signOut: () => Promise<void>;
};
const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setShops([]); return; }
    try {
      const [p, sh] = await Promise.all([getProfile(s.user.id), getMyShops(s.user.id)]);
      setProfile(p); setShops(sh);
    } catch { /* keep whatever we had; pages show their own errors */ }
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await load(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
      // run after this callback returns, as the Supabase client requires
      setTimeout(() => { if (alive) load(s); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [load]);

  const value: AuthState = {
    loading, session, user: session?.user ?? null, profile, shops, recovery,
    refresh: () => load(session),
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
