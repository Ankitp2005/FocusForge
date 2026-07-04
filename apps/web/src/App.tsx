import { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

import { AuthProvider, SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@/components/AuthProvider';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Today } from '@/pages/Today';
import { AiCoach } from '@/pages/AiCoach';
import { Calendar } from '@/pages/Calendar';
import { Settings } from '@/pages/Settings';
import { Analytics } from '@/pages/Analytics';
import { Goals } from '@/pages/Goals';
import { Habits } from '@/pages/Habits';
import { SsoCallback } from '@/pages/SsoCallback';
import { initializeSocket, disconnectSocket } from '@/lib/socket';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

import { useSnoozeTask } from '@/hooks/useTasks';

const queryClient = new QueryClient();

interface Reminder {
  reminderId: string;
  taskId: string;
  title: string;
  priority: string;
  message: string;
}

function AppContent() {
  const queryClientInstance = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const snoozeTask = useSnoozeTask();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Handle deep link redirects
      CapApp.addListener('appUrlOpen', (event: any) => {
        try {
          const url = new URL(event.url);
          if (url.protocol === 'focusforge:') {
            if (url.hostname === 'sso-callback') {
              // Parse Supabase access & refresh tokens from deep link hash
              // Scheme: focusforge://sso-callback#access_token=...&refresh_token=...
              const hash = url.hash.substring(1);
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              
              if (accessToken && refreshToken) {
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                }).then(() => {
                  navigate('/today', { replace: true });
                }).catch(err => {
                  console.error('Failed to set Supabase session from deep link:', err);
                });
              }
            } else {
              const path = url.pathname || url.hash.replace('#', '');
              if (path) {
                navigate(path);
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse deep link url:', event.url, e);
        }
      });

      // 2. Handle native back button / swipe back gestures
      const backListener = CapApp.addListener('backButton', () => {
        const rootPaths = ['/today', '/login', '/register', '/'];
        if (rootPaths.includes(location.pathname)) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });

      return () => {
        backListener.then(handler => handler.remove());
      };
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handleTaskUpdated = () => {
      queryClientInstance.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleReminderFired = (reminder: Reminder) => {
      setActiveReminder(reminder);
      toast(`ALARM FIRED: ${reminder.title}`, {
        icon: '🚨',
        className: 'border-2 border-lmls-red font-body font-bold',
      });
    };

    const initSocket = async () => {
      try {
        const token = await getToken();
        if (token) {
          initializeSocket(token, handleTaskUpdated, handleReminderFired);
        }
      } catch (err) {}
    };

    if (isLoaded && isSignedIn) {
      initSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isLoaded, isSignedIn, queryClientInstance, getToken]);

  const handleStartTask = async () => {
    if (!activeReminder) return;
    try {
      await fetchApi(`/tasks/${activeReminder.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      queryClientInstance.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('TASK ENGAGED — focus mode recommended');
      setActiveReminder(null);
      navigate('/today');
    } catch (err: any) {
      toast.error(err.message || 'FAILED TO START TASK');
    }
  };

  const handleSnooze = async () => {
    if (!activeReminder) return;
    const snoozeUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    try {
      await snoozeTask.mutateAsync({
        taskId: activeReminder.taskId,
        snoozeUntil,
        useSmartSnooze: true,
      });
      setActiveReminder(null);
    } catch (err) {
      // Handled by mutation toast
    }
  };

  const handleAskAI = () => {
    if (!activeReminder) return;
    setActiveReminder(null);
    navigate('/coach');
  };

  const handleDismiss = () => {
    setActiveReminder(null);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center font-body border-4 border-[#0A0A0A]">
        <div className="text-xl font-display font-black tracking-tight animate-pulse uppercase">
          SECURE_SESSION_INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lmls-white text-lmls-black font-body relative">
      {/* Brutalist Alert Banner (SECURITY.md / DESIGN_SYSTEM.md §4.8) */}
      {activeReminder && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 bg-lmls-red text-lmls-white border-b-4 border-lmls-black shadow-brutal-lg animate-siren flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <span className="font-label font-bold text-xs uppercase bg-lmls-black text-lmls-white px-2 py-1 tracking-widest border border-lmls-white mr-4">
              {activeReminder.priority} PRIORITY
            </span>
            <h3 className="font-display font-black text-xl md:text-2xl uppercase mt-2">
              {activeReminder.message}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-lmls-black text-lmls-white hover:text-lmls-black hover:bg-lmls-white" onClick={handleStartTask}>
              START NOW
            </Button>
            <Button variant="outline" className="bg-lmls-white text-lmls-black" onClick={handleSnooze}>
              SNOOZE 30M
            </Button>
            <Button variant="electric" onClick={handleAskAI}>
              ASK AI COACH
            </Button>
            <Button variant="ghost" className="text-lmls-white border-lmls-white hover:bg-lmls-white hover:text-lmls-black" onClick={handleDismiss}>
              DISMISS
            </Button>
          </div>
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/sso-callback" element={<SsoCallback />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route 
          path="/dashboard" 
          element={<Navigate to="/today" replace />} 
        />
        <Route path="/today" element={<><SignedIn><Today /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/coach" element={<><SignedIn><AiCoach /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/calendar" element={<><SignedIn><Calendar /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/settings" element={<><SignedIn><Settings /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/analytics" element={<><SignedIn><Analytics /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/goals" element={<><SignedIn><Goals /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
        <Route path="/habits" element={<><SignedIn><Habits /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
      </Routes>
    </div>
  );
}

function App() {
  const RouterComponent = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <AppContent />
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            className: 'border-2 border-black rounded-none shadow-brutal-md font-body',
            style: {
              borderRadius: '0px',
              border: '2px solid #0A0A0A',
              boxShadow: '4px 4px 0px #0A0A0A',
              color: '#0A0A0A',
            },
          }}
        />
      </RouterComponent>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
