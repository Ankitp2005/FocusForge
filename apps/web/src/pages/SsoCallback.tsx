import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const SsoCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically parses tokens from URL hash.
    // We listen to the auth state change and redirect when signed in.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/today', { replace: true });
      } else {
        // If auth failed or no session, send to login after a brief timeout
        const timer = setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem', border: '4px solid #0A0A0A', background: '#fff', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
          SECURE CONNECTION
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          Establishing secure user session...
        </p>
        <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '4px solid #0A0A0A', borderTopColor: '#FFD600', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
