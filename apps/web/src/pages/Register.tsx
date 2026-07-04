import { SignUp, useSignUp } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { ShieldAlert, Cpu } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const REGISTER_BOOT_LOGS = [
  'SYSTEM: Readying registration sequences...',
  'KERNEL: Creating tenant sandbox environment...',
  'NEON: Allocating secure PostgreSQL database space...',
  'CLERK: Synchronizing new identity configurations...',
  'PRESETS: Writing productivity defaults (balanced focus: 25m)...',
  'STRIPE: Mapping Stripe webhook listeners...',
  'SUCCESS: Safe registry systems are ONLINE.',
  'USER: Awaiting new operator registry variables...',
];

// Must be whitelisted in Clerk Dashboard → Redirects → Allowed redirect URLs
const OAUTH_REDIRECT_URL = 'https://focusforge-frontend-9hi2.onrender.com/sso-callback';

/**
 * Same fix as NativeGoogleSignIn in Login.tsx — see that file for full explanation.
 * On native, use authenticateWithRedirect() to explicitly point Chrome at
 * the Render production page instead of https://localhost (ERR_CONNECTION_REFUSED).
 */
function NativeGoogleSignUp() {
  const { signUp, isLoaded } = useSignUp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: OAUTH_REDIRECT_URL,
        redirectUrlComplete: '/today',
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Sign-up failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <button
        id="native-google-signup-btn"
        onClick={handleGoogleSignUp}
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
        {loading ? 'Opening Google...' : 'Sign up with Google'}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t-2 border-lmls-black" />
        <span className="font-label font-bold text-xs uppercase tracking-wider text-lmls-concrete">or use email</span>
        <div className="flex-1 border-t-2 border-lmls-black" />
      </div>

      {/* Email/password — no OAuth redirect involved, works fine */}
      <SignUp
        signInUrl="/login"
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

export const Register = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const addLogLine = (index: number) => {
      if (index < REGISTER_BOOT_LOGS.length) {
        setLogs((prev) => [...prev, REGISTER_BOOT_LOGS[index]]);
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
              REGISTRATION ACTIVE
            </h2>
          </div>
          <p className="text-xs text-lmls-concrete leading-relaxed">
            By creating an account, you configure an agent that schedules tasks into optimized calendar intervals. Setup your profile details to engage automated task prioritization.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-lmls-concrete pt-2">
            <span className="border border-[#00FF66] px-2 py-0.5">DB: POSTGRES</span>
            <span className="border border-[#00FF66] px-2 py-0.5">GATEWAY: STRIPE</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Register Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[460px] border-4 border-lmls-black bg-lmls-white p-6 md:p-10 shadow-brutal-lg relative">
          {/* Accent decoration */}
          <div className="absolute -top-3.5 -left-3.5 bg-lmls-yellow text-lmls-black text-xs font-label font-bold px-2 py-0.5 border-2 border-lmls-black shadow-brutal-sm">
            CREATE OPERATOR REGISTRY
          </div>
          
          <div className="mb-6 mt-4">
            <h1 className="text-4xl font-display font-black tracking-tighter flex items-center gap-2.5">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 border-2 border-black object-cover shadow-[2px_2px_0px_#000]" />
              FocusForge
            </h1>
            <p className="text-xs font-body font-bold text-lmls-concrete uppercase tracking-widest mt-1">
              SYSTEM REGISTRY
            </p>
          </div>
          
          {/* Native: custom Google button with explicit redirect URL */}
          {/* Web: standard Clerk component */}
          {Capacitor.isNativePlatform() ? (
            <NativeGoogleSignUp />
          ) : (
            <SignUp 
              signInUrl="/login"
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
