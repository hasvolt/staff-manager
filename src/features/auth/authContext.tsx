import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { deleteOrgStorageFiles } from '@/lib/supabase/storage';
import { syncEngine } from '@/lib/sync/syncEngine';
import { User, Session } from '@supabase/supabase-js';
import { localDb, LocalProfile } from '@/lib/db/dexie';

interface AuthContextType {
  user: User | null;
  profile: LocalProfile | null;
  session: Session | null;
  isLoading: boolean;
  isLocalMode: boolean;
  enableGoogleLogin: boolean;
  loadProfile: (userId?: string) => Promise<LocalProfile | null>;
  signInWithPassword: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, pass: string, fullName?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPass: string) => Promise<{ error: Error | null }>;
  updateProfile: (fullName: string, phone?: string) => Promise<{ error: Error | null; profile?: LocalProfile }>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  deleteAccount: (onProgress?: (status: string) => void) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const enableGoogleLogin = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true';
  const enableLocalMode = import.meta.env.VITE_ENABLE_LOCAL_MODE !== 'false';

  const loadProfile = async (targetUserId?: string): Promise<LocalProfile | null> => {
    const uid = targetUserId || user?.id;
    if (!uid) return null;

    try {
      // 1. Immediately read local IndexedDB copy for offline resilience
      const localCached = await localDb.profiles.get(uid);
      if (localCached) {
        setProfile(localCached);
      }

      if (!isSupabaseConfigured) {
        return localCached || null;
      }

      // 2. Load the row from public.profiles: select id, full_name, phone, language where id = targetUserId
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, language')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return localCached || null;
      }

      // 3. If row exists and is NOT empty:
      if (data && (data.full_name || data.phone)) {
        const fullProfile: LocalProfile = {
          id: data.id,
          full_name: data.full_name || '',
          phone: data.phone || '',
          language: data.language || 'en',
          created_at: localCached?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await localDb.profiles.put(fullProfile);
        setProfile(fullProfile);
        return fullProfile;
      }

      // 4. If row is missing or empty, fall back to user auth metadata (full_name) and upsert on 'id'
      const authUser = user?.id === uid ? user : (await supabase.auth.getUser()).data.user;
      const fallbackName = (data?.full_name ? data.full_name : authUser?.user_metadata?.full_name) || '';
      const fallbackPhone = data?.phone || '';
      const fallbackLanguage = data?.language || 'en';

      const initialProfile: LocalProfile = {
        id: uid,
        full_name: fallbackName,
        phone: fallbackPhone,
        language: fallbackLanguage,
        created_at: localCached?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: upsertedRow } = await supabase
        .from('profiles')
        .upsert({
          id: uid,
          full_name: fallbackName,
          phone: fallbackPhone || null,
          language: fallbackLanguage,
          updated_at: new Date().toISOString(),
        })
        .select('id, full_name, phone, language')
        .maybeSingle();

      const finalProfile: LocalProfile = {
        id: uid,
        full_name: upsertedRow?.full_name ?? fallbackName,
        phone: upsertedRow?.phone ?? fallbackPhone,
        language: upsertedRow?.language ?? fallbackLanguage,
        created_at: initialProfile.created_at,
        updated_at: initialProfile.updated_at,
      };

      await localDb.profiles.put(finalProfile);
      setProfile(finalProfile);
      return finalProfile;
    } catch (err) {
      console.warn('Error in loadProfile:', err);
      const fallback = await localDb.profiles.get(uid);
      if (fallback) setProfile(fallback);
      return fallback || null;
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        syncEngine.registerDevice(session.user.id);
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        syncEngine.registerDevice(session.user.id);
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please add keys to .env.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error };
  };

  const signUpWithPassword = async (email: string, pass: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please add keys to .env.') };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });
    const needsEmailConfirmation = Boolean(data.user && !data.session);
    return { error, needsEmailConfirmation };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !enableGoogleLogin) {
      return { error: new Error('Google sign-in is disabled.') };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPass: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    return { error };
  };

  const updateProfile = async (
    fullName: string,
    phone?: string
  ): Promise<{ error: Error | null; profile?: LocalProfile }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone?.trim() || '';

    // If offline
    if (isSupabaseConfigured && !navigator.onLine) {
      const localRecord: LocalProfile = {
        id: user.id,
        full_name: cleanName,
        phone: cleanPhone,
        language: profile?.language || 'en',
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await localDb.profiles.put(localRecord);
      await localDb.outbox.put({
        id: `profile-${user.id}-${Date.now()}`,
        table_name: 'profiles',
        record_id: user.id,
        action: 'update',
        payload: {
          id: user.id,
          full_name: cleanName,
          phone: cleanPhone || null,
          updated_at: localRecord.updated_at,
        },
        base_revision: 1,
        created_at: new Date().toISOString(),
        attempts: 0,
      });
      setProfile(localRecord);
      return { error: null, profile: localRecord };
    }

    if (!isSupabaseConfigured) {
      const localRecord: LocalProfile = {
        id: user.id,
        full_name: cleanName,
        phone: cleanPhone,
        language: profile?.language || 'en',
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await localDb.profiles.put(localRecord);
      setProfile(localRecord);
      return { error: null, profile: localRecord };
    }

    // 1. Write to Supabase with upsert on 'id'
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: cleanName,
        phone: cleanPhone || null,
        updated_at: new Date().toISOString(),
      });

    if (upsertErr) {
      return { error: new Error(upsertErr.message) };
    }

    // 2. Re-fetch the row from the server
    const { data: serverData, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, full_name, phone, language')
      .eq('id', user.id)
      .single();

    if (fetchErr) {
      return { error: new Error(fetchErr.message) };
    }

    // 3. Keep local copy in IndexedDB
    const savedProfile: LocalProfile = {
      id: serverData.id,
      full_name: serverData.full_name || '',
      phone: serverData.phone || '',
      language: serverData.language || 'en',
      created_at: profile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localDb.profiles.put(savedProfile);
    setProfile(savedProfile);

    try {
      await supabase.auth.updateUser({
        data: { full_name: savedProfile.full_name },
      });
    } catch {
      // ignore
    }

    return { error: null, profile: savedProfile };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const signOutAllDevices = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut({ scope: 'global' });
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const deleteAccount = async (onProgress?: (status: string) => void) => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      // 1. Check businesses owned by this user
      onProgress?.('Inspecting owned businesses...');
      const { data: ownedOrgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id);

      if (orgErr) {
        return { error: new Error(`Failed to check owned businesses: ${orgErr.message}`) };
      }

      // 2. Clean up files under each owned business before running RPC
      if (ownedOrgs && ownedOrgs.length > 0) {
        for (const org of ownedOrgs) {
          onProgress?.(`Cleaning up storage files for ${org.name || 'business'}...`);
          const cleanupRes = await deleteOrgStorageFiles(org.id, onProgress);
          if (!cleanupRes.success || cleanupRes.error) {
            return {
              error: new Error(
                `Storage cleanup failed for business "${org.name || org.id}": ${cleanupRes.error?.message}. Account deletion aborted.`
              ),
            };
          }
        }
      }

      // 3. Only after storage cleanup completes, call security definer RPC
      onProgress?.('Purging account and business data...');
      const { error: rpcErr } = await supabase.rpc('delete_my_account');
      if (rpcErr) {
        return { error: rpcErr };
      }

      await signOut();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const isLocalMode = !user && enableLocalMode;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isLocalMode,
        enableGoogleLogin,
        loadProfile,
        signInWithPassword,
        signUpWithPassword,
        signInWithMagicLink,
        signInWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        updateProfile,
        signOut,
        signOutAllDevices,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
