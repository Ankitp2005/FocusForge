import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/useTasks'; 
import { useCheckout, usePortal } from '@/hooks/useSubscriptions';
import { MockupLayout } from '@/components/MockupLayout';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Settings as SettingsIcon, 
  CreditCard, 
  Sun, 
  Moon,
  ChevronLeft,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useClerk } from '@/components/AuthProvider';

export const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user, isLoading } = useUser();
  const checkout = useCheckout();
  const portal = usePortal();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('SIGNED OUT SUCCESSFULLY');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Logout failed');
    }
  };

  // Settings states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [workStartHour, setWorkStartHour] = useState(9);
  const [workEndHour, setWorkEndHour] = useState(18);
  const [preferredFocusSessionMins, setPreferredFocusSessionMins] = useState(25);
  const [enableSmartReminders, setEnableSmartReminders] = useState(true);
  const [productivityStyle, setProductivityStyle] = useState('balanced');
  const [aiCoachingTone, setAiCoachingTone] = useState('friendly');
  
  // Theme state
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setActiveTheme(isDark ? 'dark' : 'light');
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setActiveTheme(theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      toast.success('CYBER CONSOLE ENGAGED 🕶');
    } else {
      document.documentElement.classList.remove('dark');
      toast.success('CLASSIC PAPER ENGAGED 📝');
    }
  };

  useEffect(() => {
    if (searchParams.get('success') === 'checkout_completed') {
      toast.success('UPGRADE SUCCESSFUL: WELCOME TO PREMIUM');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setTimezone(user.timezone || 'UTC');
      if (user.preferences) {
        setWorkStartHour(user.preferences.workStartHour ?? 9);
        setWorkEndHour(user.preferences.workEndHour ?? 18);
        setPreferredFocusSessionMins(user.preferences.preferredFocusSessionMins ?? 25);
        setEnableSmartReminders(user.preferences.enableSmartReminders ?? true);
        setProductivityStyle(user.preferences.productivityStyle || 'balanced');
        setAiCoachingTone(user.preferences.aiCoachingTone || 'friendly');
      }
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, timezone }),
      });
      toast.success('PROFILE SAVED');
    } catch (err: any) {
      toast.error(err.message || 'Profile save failed');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          workStartHour,
          workEndHour,
          preferredFocusSessionMins,
          enableSmartReminders,
          productivityStyle,
          aiCoachingTone,
        }),
      });
      toast.success('PREFERENCES SAVED');
    } catch (err: any) {
      toast.error(err.message || 'Preferences save failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center p-8">
        <div className="border-[3px] border-black p-12 text-center bg-[#FAF7F2] shadow-[4px_4px_0px_#000] rounded-[24px]">
          <div className="animate-spin w-8 h-8 border-4 border-[#4CD9E3] border-t-transparent inline-block mb-4 rounded-full" />
          <div className="font-display font-black text-sm tracking-widest uppercase">
            LOADING SETTINGS MODULE...
          </div>
        </div>
      </div>
    );
  }

  const isPremium = user?.plan === 'PRO';

  return (
    <MockupLayout activeTab="home">
      <div className="flex flex-col gap-4 font-body select-none">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/today')}
          className="flex items-center gap-1.5 text-xs font-label font-black text-gray-500 hover:text-black cursor-pointer uppercase pb-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to focus cockpit</span>
        </button>

        {/* Profile Card */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" />
            <span>Profile Identity</span>
          </h3>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-0.5">Email (Read-Only)</label>
              <div className="bg-[#FAF7F2] border border-gray-300 text-gray-500 rounded-lg p-2 text-xs select-all">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-0.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs focus:outline-none focus:border-[#FFD600]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-0.5">Timezone Coord</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs focus:outline-none focus:border-[#FFD600]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-black text-white font-display font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-colors"
            >
              SAVE PROFILE
            </button>
          </form>
        </div>

        {/* Visual Skin Switcher Card */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-[#FFD600]" />
            <span>Theme skin</span>
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleThemeChange('light')}
              className={`py-3 px-2 border-2 border-black rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTheme === 'light' 
                  ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_#000] translate-x-[0.5px] translate-y-[0.5px]' 
                  : 'bg-[#FAF7F2] text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Sun className="w-4 h-4 text-black" />
              <span className="font-label font-black text-[9px] uppercase tracking-wide">Light skin</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`py-3 px-2 border-2 border-black rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTheme === 'dark' 
                  ? 'bg-black text-[#00FF66] shadow-[2px_2px_0px_#000] translate-x-[0.5px] translate-y-[0.5px]' 
                  : 'bg-[#FAF7F2] text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Moon className="w-4 h-4 text-[#00FF66]" />
              <span className="font-label font-black text-[9px] uppercase tracking-wide">Dark skin</span>
            </button>
          </div>
        </div>

        {/* AI Parameters Preferences Card */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
            <SettingsIcon className="w-4 h-4 text-[#FF4B55]" />
            <span>AI Scheduler</span>
          </h3>
          <form onSubmit={handleSavePreferences} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-0.5">Productivity Mode</label>
                <select
                  value={productivityStyle}
                  onChange={(e) => setProductivityStyle(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-[10px] focus:outline-none"
                >
                  <option value="balanced">Balanced</option>
                  <option value="deep_worker">Focus Max</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-0.5">AI Coach Tone</label>
                <select
                  value={aiCoachingTone}
                  onChange={(e) => setAiCoachingTone(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-[10px] focus:outline-none"
                >
                  <option value="friendly">Friendly</option>
                  <option value="strict">Strict</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-label font-black text-gray-400 uppercase mb-0.5">Focus Mins</label>
                <input
                  type="number"
                  value={preferredFocusSessionMins}
                  onChange={(e) => setPreferredFocusSessionMins(parseInt(e.target.value) || 25)}
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-label font-black text-gray-400 uppercase mb-0.5">Start Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={workStartHour}
                  onChange={(e) => setWorkStartHour(parseInt(e.target.value) || 9)}
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-label font-black text-gray-400 uppercase mb-0.5">End Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={workEndHour}
                  onChange={(e) => setWorkEndHour(parseInt(e.target.value) || 18)}
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-black py-1">
              <input
                type="checkbox"
                checked={enableSmartReminders}
                onChange={(e) => setEnableSmartReminders(e.target.checked)}
                className="w-4 h-4 border-2 border-black text-[#4CD9E3] rounded focus:ring-0 cursor-pointer bg-white"
              />
              <span>Enable AI Reminders</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 bg-black text-white font-display font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-colors"
            >
              SAVE PARAMETERS
            </button>
          </form>
        </div>

        {/* Utility Modules Section */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000] flex flex-col gap-3">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 flex items-center gap-1.5 select-none">
            <Sparkles className="w-4 h-4 text-[#FFD600]" />
            <span>AI Coach & Telemetry</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/coach')}
              className="py-2.5 bg-[#FFD600] border-[2.5px] border-black font-display font-black text-[10px] uppercase tracking-wider rounded-xl shadow-[2.5px_2.5px_0px_#000] hover:bg-black hover:text-[#FFD600] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
            >
              CHAT AI COACH
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="py-2.5 bg-[#4CD9E3] border-[2.5px] border-black font-display font-black text-[10px] uppercase tracking-wider rounded-xl shadow-[2.5px_2.5px_0px_#000] hover:bg-black hover:text-[#4CD9E3] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
            >
              VIEW METRICS
            </button>
          </div>
        </div>

        {/* Subscription Tier */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#47D185]" />
            <span>Billing Tier</span>
          </h3>
          <div className="flex flex-col gap-2 mt-1">
            <span className="font-display font-black text-xs uppercase text-black">
              {isPremium ? '★ PREMIUM MEMBERSHIP' : '○ FREE ACCESS PLAN'}
            </span>
            <p className="text-[10px] text-gray-500 leading-normal">
              {isPremium 
                ? 'Your account has PRO status. Unlimited AI optimization scheduler runs and full Calendar integration are active.' 
                : 'Access calendar sync overlays and AI optimized scheduling by upgrading.'}
            </p>
            {isPremium ? (
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="w-full py-2.5 bg-gray-100 border-[2.5px] border-black font-display font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                {portal.isPending ? 'REDIRECTING...' : 'MANAGE BILLING'}
              </button>
            ) : (
              <button
                onClick={() => checkout.mutate('price_premium_monthly')}
                disabled={checkout.isPending}
                className="w-full py-2.5 bg-[#4CD9E3] border-[2.5px] border-black font-display font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#4CD9E3] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                {checkout.isPending ? 'CHECKING OUT...' : 'UPGRADE TO PRO'}
              </button>
            )}
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5 select-none">
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Account Security</span>
          </h3>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-[#FF4B55] text-white border-[2.5px] border-black font-display font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[2.5px_2.5px_0px_#000] hover:bg-black hover:text-[#FF4B55] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
          >
            SIGN OUT ACCOUNT
          </button>
        </div>

      </div>
    </MockupLayout>
  );
};
