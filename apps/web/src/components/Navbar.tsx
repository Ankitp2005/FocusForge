import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClerk, useUser } from '@/components/AuthProvider';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Flame, 
  MessageSquareCode, 
  Target, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut,
  Sparkles
} from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    signOut(() => navigate('/login'));
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: 'hover:bg-lmls-paper hover:text-lmls-black' },
    { path: '/today', label: 'FOCUS', icon: Flame, color: 'hover:bg-lmls-yellow-bg hover:text-lmls-black' },
    { path: '/coach', label: 'AI COACH', icon: MessageSquareCode, color: 'hover:bg-lmls-red-bg hover:text-lmls-red' },
    { path: '/goals', label: 'GOALS', icon: Target, color: 'hover:bg-pink-100 hover:text-pink-600' },
    { path: '/habits', label: 'HABITS', icon: CheckSquare, color: 'hover:bg-orange-100 hover:text-orange-600' },
    { path: '/calendar', label: 'CALENDAR', icon: CalendarIcon, color: 'hover:bg-lmls-green-bg hover:text-lmls-green' },
    { path: '/analytics', label: 'ANALYTICS', icon: BarChart3, color: 'hover:bg-yellow-100 hover:text-yellow-600' },
    { path: '/settings', label: 'SETTINGS', icon: SettingsIcon, color: 'hover:bg-lmls-paper hover:text-lmls-black' },
  ];

  return (
    <header className="border-b-4 border-lmls-black bg-lmls-black text-lmls-white">
      {/* Upper Status Ticker */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-2 border-b border-[rgba(245,240,232,0.15)] text-[11px] font-body tracking-wider text-lmls-concrete gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lmls-green animate-pulse inline-block" />
            FOCUSFORGE CORE SECURE v1.2.0
          </span>
          {user && (
            <span className="hidden md:inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-lmls-yellow" />
              OPERATOR: {user.fullName || user.primaryEmailAddress?.emailAddress}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 font-bold text-lmls-white">
          <span>{format(time, 'EEEE, d MMMM yyyy').toUpperCase()}</span>
          <span className="bg-lmls-electric text-lmls-white px-2 py-0.5 border border-lmls-white select-none">
            {format(time, 'HH:mm:ss')}
          </span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between px-4 lg:px-6">
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 py-4 lg:py-0 font-display font-black text-2xl tracking-tighter cursor-pointer hover:text-lmls-yellow transition-colors group select-none mr-4"
        >
          <img 
            src="/logo.png" 
            alt="FocusForge Logo" 
            className="w-8 h-8 border-2 border-lmls-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 object-cover shadow-[2px_2px_0px_#000]"
          />
          <span>FOCUSFORGE</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 flex flex-wrap items-stretch h-full gap-1 overflow-x-auto py-2 lg:py-0">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-label font-black tracking-widest transition-all select-none border-b-4 ${
                  active 
                    ? 'bg-lmls-white text-lmls-black border-lmls-yellow' 
                    : `border-transparent text-lmls-concrete hover:border-lmls-white ${item.color}`
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-lmls-electric' : 'opacity-70'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="flex items-center py-4 lg:py-3 border-t lg:border-t-0 border-[rgba(245,240,232,0.15)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-lmls-red border-lmls-red hover:bg-lmls-red hover:text-lmls-white flex items-center gap-2 font-bold font-label tracking-widest text-xs py-2 w-full lg:w-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
