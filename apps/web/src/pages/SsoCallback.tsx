import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SsoCallback = () => {
  const location = useLocation();

  useEffect(() => {
    // Redirect Chrome/external browser to the native app custom scheme with the Clerk tokens
    const mobileUrl = 'focusforge://sso-callback' + location.search + location.hash;
    window.location.href = mobileUrl;
  }, [location]);

  return (
    <div className="min-h-screen bg-lmls-paper flex items-center justify-center font-body border-4 border-lmls-black">
      <div className="text-center p-8 border-4 border-lmls-black bg-lmls-white shadow-brutal-lg max-w-md">
        <h1 className="text-3xl font-display font-black uppercase mb-4 tracking-tighter">
          AUTHORIZATION NOMINAL
        </h1>
        <div className="text-lg font-display font-black tracking-tight animate-pulse uppercase text-lmls-electric mb-4">
          REDIRECTING TO FOCUSFORGE APP...
        </div>
        <p className="text-sm font-mono text-lmls-concrete leading-relaxed">
          If you are not redirected automatically, tap the link below:
        </p>
        <a 
          href={'focusforge://sso-callback' + location.search + location.hash}
          className="inline-block mt-6 px-6 py-3 bg-lmls-yellow text-lmls-black font-label font-bold uppercase tracking-wider border-2 border-lmls-black shadow-brutal-sm hover:shadow-brutal-hover hover:bg-lmls-white transition-all"
        >
          Open App Manually
        </a>
      </div>
    </div>
  );
};
