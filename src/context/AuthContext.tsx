import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const DESIGNATED_ADMIN_EMAIL = 'arujagadeesh801@gmail.com';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isSupabaseLive: boolean;
  isRealSession: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string, fullName: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRealSession, setIsRealSession] = useState<boolean>(false);
  const isSupabaseLive = isSupabaseConfigured();

  const fetchSupabaseProfile = useCallback(async (userId: string, email: string) => {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`No AuraForm profile exists for ${email}. Apply the latest Supabase migration.`);

    const liveUser: UserProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || data.email,
      role: data.role,
      avatarUrl: data.avatar_url
    };
    setUser(liveUser);
    setAuthError(null);
    setIsRealSession(true);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (isSupabaseLive && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchSupabaseProfile(session.user.id, session.user.email || '');
      }
    }
  }, [isSupabaseLive, fetchSupabaseProfile]);

  useEffect(() => {
    let mounted = true;
    let profileLoadTimer: number | undefined;
    if (isSupabaseLive && supabase) {
      // Safety timeout to ensure loading never hangs on slow networks
      const safetyTimer = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 3000);

      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        if (session?.user) {
          fetchSupabaseProfile(session.user.id, session.user.email || '').catch((err) => {
            console.error('Failed to load authenticated profile:', err);
            setAuthError(err instanceof Error ? err.message : 'Failed to load your AuraForm profile.');
            setUser(null);
            setLoading(false);
          });
        } else {
          setIsRealSession(false);
          setUser(null);
          setLoading(false);
        }
      }).catch((err) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        console.warn('Session check warning:', err);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (session?.user) {
          window.clearTimeout(profileLoadTimer);
          profileLoadTimer = window.setTimeout(() => {
            if (!mounted) return;
            fetchSupabaseProfile(session.user.id, session.user.email || '').catch((err) => {
              console.error('Failed to load authenticated profile:', err);
              setAuthError(err instanceof Error ? err.message : 'Failed to load your AuraForm profile.');
              setUser(null);
              setLoading(false);
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setIsRealSession(false);
          setUser(null);
          setAuthError(null);
          setLoading(false);
        } else {
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        window.clearTimeout(profileLoadTimer);
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [isSupabaseLive, fetchSupabaseProfile]);

  const signInWithEmailPassword = async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseLive || !supabase) {
      throw new Error('Sign-in requires valid Supabase credentials in the project .env file.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    if (data.user) {
      await fetchSupabaseProfile(data.user.id, data.user.email || email.trim());
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, fullName: string) => {
    setAuthError(null);
    if (!isSupabaseLive || !supabase) {
      throw new Error('Account creation requires valid Supabase credentials in the project .env file.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.href
      }
    });
    if (error) throw error;
    if (data.session && data.user) {
      await fetchSupabaseProfile(data.user.id, data.user.email || email.trim());
    }
    return !data.session;
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!isSupabaseLive || !supabase) {
      throw new Error('Google sign-in requires valid Supabase credentials in the project .env file.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (isSupabaseLive && supabase) {
      await supabase.auth.signOut();
    }
    setIsRealSession(false);
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isSupabaseLive,
        isRealSession,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        signInWithGoogle,
        signOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
