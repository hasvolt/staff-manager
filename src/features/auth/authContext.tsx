import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { syncEngine } from '@/lib/sync/syncEngine';
import { User, Session } from '@supabase/supabase-js';
import { localDb } from '@/lib/db/dexie';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLocalMode: boolean;
  enableGoogleLogin: boolean;
  signInWithPassword: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, pass: string, fullName?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPass: string) => Promise<{ error: Error | null }>;
  updateProfile: (fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const enableGoogleLogin = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true';
  const enableLocalMode = import.meta.env.VITE_ENABLE_LOCAL_MODE !== 'false';

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

  const updateProfile = async (fullName: string, phone?: string) => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('Not authenticated') };
    }
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setUser(null);
    setSession(null);
  };

  const signOutAllDevices = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut({ scope: 'global' });
    }
    setUser(null);
    setSession(null);
  };

  const deleteAccount = async () => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('Not authenticated') };
    }
    // Call the security definer RPC function from the migration
    const { error } = await supabase.rpc('delete_my_account');
    if (!error) {
      await signOut();
    }
    return { error };
  };

  const isLocalMode = !user && enableLocalMode;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isLocalMode,
        enableGoogleLogin,
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
