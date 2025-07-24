import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Getting initial session...');
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (process.env.NODE_ENV === 'development') {
          console.log('Session result:', { session: !!session, error, sessionData: session });
        }
        if (error) {
          console.error('Session error details:', error);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error('Error getting session:', err);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signOut
  };
}