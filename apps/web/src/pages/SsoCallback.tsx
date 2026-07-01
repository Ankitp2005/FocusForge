import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// This page lives on the Render production domain.
// When Clerk finishes Google OAuth, it redirects Chrome here.
// This page then redirects Chrome to the focusforge:// native scheme,
// which Android intercepts to re-open the native app.
export const SsoCallback = () => {
  const location = useLocation();

  useEffect(() => {
    // Build the native deep link with all Clerk's query params & hash preserved
    const nativeUrl = 'focusforge://sso-callback' + location.search + location.hash;
    window.location.href = nativeUrl;
  }, [location.search, location.hash]);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem', border: '4px solid #0A0A0A', background: '#fff', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Authentication Complete
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          Redirecting you back to FocusForge...
        </p>
        <a
          href={'focusforge://sso-callback' + location.search + location.hash}
          style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#FFD600', color: '#0A0A0A', fontWeight: 900, textTransform: 'uppercase', border: '2px solid #0A0A0A', textDecoration: 'none' }}
        >
          Open FocusForge App
        </a>
      </div>
    </div>
  );
};
