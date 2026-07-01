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

export const Login = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const { signIn } = useSignIn();

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

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: 'https://focusforge-frontend-9hi2.onrender.com/sso-callback',
      redirectUrlComplete: 'https://focusforge-frontend-9hi2.onrender.com/sso-callback',
    });
  };

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

      {/* Right Pane: Clerk Authorization Card */}
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
          
          {Capacitor.isNativePlatform() ? (
            /* NATIVE: Use headless API so redirect goes to Render, not localhost */
            <div className="pt-4 space-y-4">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 border-2 border-lmls-black py-3 font-label font-black uppercase tracking-wider text-lmls-black hover:bg-lmls-paper transition-all shadow-brutal-sm hover:shadow-brutal-hover"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                CONTINUE WITH GOOGLE
              </button>
              <div className="text-center text-xs font-body text-lmls-concrete pt-2">
                Or sign in with email at <a href="https://focusforge-frontend-9hi2.onrender.com/login" className="text-lmls-electric font-bold underline">focusforge on the web</a>
              </div>
            </div>
          ) : (
            /* WEB: Full Clerk SignIn component */
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
