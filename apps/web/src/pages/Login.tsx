import { SignIn } from '@clerk/clerk-react';
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
          
          <SignIn 
            signUpUrl="/register"
            forceRedirectUrl={Capacitor.isNativePlatform() ? "https://focusforge-frontend-9hi2.onrender.com/sso-callback" : undefined}
            routing={Capacitor.isNativePlatform() ? "hash" : undefined}
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

          {Capacitor.isNativePlatform() && (
            <div className="mt-6 p-4 bg-lmls-yellow text-lmls-black border-2 border-lmls-black shadow-brutal-sm">
              <span className="font-label font-bold text-[10px] uppercase bg-lmls-black text-lmls-white px-2 py-0.5 tracking-wider border border-lmls-black mr-2">
                GOOGLE SIGN-IN TIP
              </span>
              <p className="text-xs font-body leading-relaxed mt-2 font-bold">
                If you sign in using Google, once Chrome finishes and shows the connection page, simply press your phone's **Back** button to return and enter the app automatically!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
