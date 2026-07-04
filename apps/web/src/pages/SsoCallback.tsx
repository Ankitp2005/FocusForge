import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Capacitor } from '@capacitor/core';

// Two behaviours depending on context:
//
// 1. WEB (Render production site):
//    Clerk finishes Google OAuth and redirects the browser here.
//    We immediately redirect to the focusforge:// custom scheme so
//    Android can hand control back to the native app.
//
// 2. NATIVE APP (Capacitor / Android):
//    The deep-link handler in App.tsx navigates here via navigate().
//    We let Clerk's AuthenticateWithRedirectCallback process the token
//    and redirect the user to the dashboard — no further redirects needed.
export const SsoCallback = () => {
  const location = useLocation();

  // --- Native app path ---
  // Clerk will handle the token and call afterSignInUrl when done.
  if (Capacitor.isNativePlatform()) {
    return (
      <AuthenticateWithRedirectCallback
        afterSignInUrl="/today"
        afterSignUpUrl="/today"
      />
    );
  }

  // --- Web path ---
  // Redirect browser to the custom scheme so Android opens the native app.
  return <WebSsoRedirect search={location.search} hash={location.hash} />;
};

function WebSsoRedirect({ search, hash }: { search: string; hash: string }) {
  useEffect(() => {
    const nativeUrl = 'focusforge://sso-callback' + search + hash;
    window.location.href = nativeUrl;
  }, [search, hash]);

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
          href={'focusforge://sso-callback' + search + hash}
          style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#FFD600', color: '#0A0A0A', fontWeight: 900, textTransform: 'uppercase', border: '2px solid #0A0A0A', textDecoration: 'none' }}
        >
          Open FocusForge App
        </a>
      </div>
    </div>
  );
}
