import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface ClerkUserCompatibility {
  id: string;
  fullName: string;
  username: string | null;
  primaryEmailAddress: {
    emailAddress: string;
  } | null;
  imageUrl: string;
}

interface AuthContextType {
  session: Session | null;
  user: ClerkUserCompatibility | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: (callback?: () => void) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<ClerkUserCompatibility | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncUser = (sbUser: SupabaseUser | null) => {
    if (!sbUser) {
      setUser(null);
      return;
    }

    const email = sbUser.email || '';
    const username = sbUser.user_metadata?.preferred_username || sbUser.user_metadata?.username || email.split('@')[0] || 'operator';
    const fullName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0] || 'Operator';
    const avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    setUser({
      id: sbUser.id,
      fullName,
      username,
      primaryEmailAddress: {
        emailAddress: email,
      },
      imageUrl: avatarUrl,
    });
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      syncUser(session?.user ?? null);
      setIsLoaded(true);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      syncUser(session?.user ?? null);
      setIsLoaded(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const signOut = async (callback?: () => void) => {
    await supabase.auth.signOut();
    if (callback) {
      callback();
    }
  };

  const isSignedIn = !!session;

  return (
    <AuthContext.Provider value={{ session, user, isLoaded, isSignedIn, getToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Drop-in replacement hooks
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    getToken: context.getToken,
  };
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user,
  };
};

export const useClerk = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useClerk must be used within an AuthProvider');
  }
  return {
    signOut: context.signOut,
  };
};

// Drop-in replacement components
export const SignedIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
};

export const SignedOut: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
};

export const RedirectToSignIn: React.FC = () => {
  useEffect(() => {
    window.location.href = '/#/login';
  }, []);
  return null;
};
