import { SignIn, useSignIn } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { ShieldAlert, Cpu } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const BOOT_LOGS = [
  'SYSTEM: Initializing FocusForge Secure Link...',
  'KERNEL: Loading AI Focus optimization engines...',
  'NEON: Connection established with postgres://neon-srv-01',
  'CLERK: Syncing authentication state with edge identity provider...',
  'AI: Initializing prompt templates (tone: balanced)...',
  'MODULE: Loaded Pomodoro timer components.',
  'STRIPE: Gateway status: READY.',
  'SUCCESS: FocusForge services are nominal.',
  'TASK: Awaiting operator authentication...',
];

// The Render.com production page that handles SSO and redirects the custom scheme.
// This MUST be whitelisted in your Clerk Dashboard → Redirects → Allowed redirect URLs.
const OAUTH_REDIRECT_URL = 'https://focusforge-frontend-9hi2.onrender.com/sso-callback';

/**
 * WHY THIS COMPONENT EXISTS:
 *
 * On native (Capacitor APK), the app is served from https://localhost.
 * If we use the standard <SignIn> component for Google OAuth, Clerk will
 * redirect Chrome back to https://localhost after Google auth completes.
 * Chrome on Android then tries to open https://localhost — but nothing
 * runs there — so you get: ERR_CONNECTION_REFUSED (black screen).
 *
 * THE FIX: Use authenticateWithRedirect() to explicitly tell Clerk:
 *   "After Google auth, send Chrome to the Render production page."
 * That page then fires focusforge:// → Android opens the native app.
 */
function NativeGoogleSignIn() {
  const { signIn, isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        // WHERE Chrome lands after Google auth (whitelisted in Clerk dashboard)
        redirectUrl: OAUTH_REDIRECT_URL,
        // WHERE the app ultimately navigates after token processing
        redirectUrlComplete: '/today',
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <button
        id="native-google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={loading || !isLoaded}
        className="w-full flex items-center justify-center gap-3 border-2 border-lmls-black rounded-none shadow-brutal-sm hover:shadow-brutal-hover font-label uppercase font-black tracking-wider text-lmls-black hover:bg-lmls-paper transition-all py-3 px-4 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="animate-spin w-4 h-4 border-2 border-lmls-black border-t-transparent rounded-full inline-block" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.7 14.013 17.64 11.791 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
        )}
        {loading ? 'Opening Google...' : 'Continue with Google'}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t-2 border-lmls-black" />
        <span className="font-label font-bold text-xs uppercase tracking-wider text-lmls-concrete">or use email</span>
        <div className="flex-1 border-t-2 border-lmls-black" />
      </div>

      {/* Email/password via Clerk — works fine, no OAuth redirect involved */}
      <SignIn
        signUpUrl="/register"
        routing="hash"
        appearance={{
          elements: {
            rootBox: { width: '100%', minWidth: '0' },
            card: { width: '100%', maxWidth: '100%', minWidth: '0', boxShadow: 'none', border: 'none', padding: '0', backgroundColor: 'transparent' },
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton: 'hidden',
            socialButtonsBlockButtonText: 'hidden',
            dividerRow: 'hidden',
            formButtonPrimary: 'bg-lmls-electric hover:bg-lmls-black text-lmls-white border-2 border-lmls-black rounded-none shadow-brutal-sm hover:shadow-brutal-hover font-display font-black uppercase tracking-widest transition-all py-3 text-sm',
            formFieldInput: 'border-2 border-lmls-black rounded-none font-body p-3 focus:ring-0 focus:border-lmls-electric transition-colors bg-lmls-paper',
            formFieldLabel: 'font-label font-bold uppercase text-xs tracking-wider text-lmls-black mb-1',
            footerActionLink: 'text-lmls-electric hover:text-lmls-black font-black underline',
            footerActionText: 'font-bold font-label text-xs text-lmls-black',
            formFieldSuccessText: 'font-body text-xs text-lmls-green',
            formFieldErrorText: 'font-body text-xs text-lmls-red',
          }
        }}
      />

      {error && (
        <p className="text-xs font-body text-lmls-red font-bold border-2 border-lmls-red p-2 bg-red-50">{error}</p>
      )}
    </div>
  );
}

export const Login = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const addLogLine = (index: number) => {
      if (index < BOOT_LOGS.length) {
        setLogs((prev) => [...prev, BOOT_LOGS[index]]);
        timer = setTimeout(() => addLogLine(index + 1), 600);
      }
    };
    addLogLine(0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-lmls-paper text-lmls-black">
      {/* Left Pane: Interactive Cyberpunk Terminal Dashboard (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-lmls-black text-[#00FF66] p-10 flex-col justify-between border-r-8 border-lmls-black font-body select-none relative overflow-hidden">
        {/* Glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,255,102,0.03)] to-transparent pointer-events-none" />
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#00FF66] pb-4 opacity-80">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 animate-pulse text-[#00FF66]" />
            <span className="font-display font-black text-lg tracking-widest text-[#00FF66]">FOCUSFORGE_SYS_v1.2.0</span>
          </div>
          <span className="text-xs uppercase bg-[#00FF66] text-lmls-black px-1.5 font-bold">ONLINE</span>
        </div>

        {/* Live Logs Stream */}
        <div className="flex-1 my-8 overflow-y-auto space-y-2 text-xs leading-relaxed max-h-[50vh]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#0057FF]">&gt;</span>
              <p className="font-mono">{log}</p>
            </div>
          ))}
          <div className="animate-pulse inline-block w-2.5 h-4 bg-[#00FF66] mt-1" />
        </div>

        {/* Brand/Product Feature Showcase */}
        <div className="border-t border-[#00FF66] pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-lmls-yellow" />
            <h2 className="font-display font-black text-sm uppercase text-lmls-white tracking-wider">
              CRITICAL TASK OPTIMIZER
            </h2>
          </div>
          <p className="text-xs text-lmls-concrete leading-relaxed">
            Google's CTO certified scheduling. FocusForge AI automatically inserts critical focus slots directly into your daily Google Calendar flow to prevent cognitive overload.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-lmls-concrete pt-2">
            <span className="border border-[#00FF66] px-2 py-0.5">AUTH SCHEMA: SECURE</span>
            <span className="border border-[#00FF66] px-2 py-0.5">ENCRYPTION: AES-256</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Auth Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[460px] border-4 border-lmls-black bg-lmls-white p-6 md:p-10 shadow-brutal-lg relative">
          {/* Accent decoration */}
          <div className="absolute -top-3.5 -left-3.5 bg-lmls-yellow text-lmls-black text-xs font-label font-bold px-2 py-0.5 border-2 border-lmls-black shadow-brutal-sm">
            OPERATOR SECURE PORTAL
          </div>
          
          <div className="mb-6 mt-4">
            <h1 className="text-4xl font-display font-black tracking-tighter flex items-center gap-2.5">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 border-2 border-black object-cover shadow-[2px_2px_0px_#000]" />
              FocusForge
            </h1>
            <p className="text-xs font-body font-bold text-lmls-concrete uppercase tracking-widest mt-1">
              SYSTEM AUTHENTICATION
            </p>
          </div>
          
          {/* Native: custom Google button with explicit redirect URL */}
          {/* Web: standard Clerk component */}
          {Capacitor.isNativePlatform() ? (
            <NativeGoogleSignIn />
          ) : (
            <SignIn 
              signUpUrl="/register"
              appearance={{
                elements: {
                  rootBox: { width: '100%', minWidth: '0' },
                  card: { width: '100%', maxWidth: '100%', minWidth: '0', boxShadow: 'none', border: 'none', padding: '24px', backgroundColor: 'transparent' },
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border-2 border-lmls-black rounded-none shadow-brutal-sm hover:shadow-brutal-hover font-label uppercase font-black tracking-wider text-lmls-black hover:bg-lmls-paper transition-all py-3',
                  socialButtonsBlockButtonText: 'font-black font-label text-xs tracking-wider',
                  formButtonPrimary: 'bg-lmls-electric hover:bg-lmls-black text-lmls-white border-2 border-lmls-black rounded-none shadow-brutal-sm hover:shadow-brutal-hover font-display font-black uppercase tracking-widest transition-all py-3 text-sm',
                  formFieldInput: 'border-2 border-lmls-black rounded-none font-body p-3 focus:ring-0 focus:border-lmls-electric transition-colors bg-lmls-paper',
                  formFieldLabel: 'font-label font-bold uppercase text-xs tracking-wider text-lmls-black mb-1',
                  footerActionLink: 'text-lmls-electric hover:text-lmls-black font-black underline',
                  footerActionText: 'font-bold font-label text-xs text-lmls-black',
                  dividerRow: 'hidden',
                  formFieldSuccessText: 'font-body text-xs text-lmls-green',
                  formFieldErrorText: 'font-body text-xs text-lmls-red',
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
