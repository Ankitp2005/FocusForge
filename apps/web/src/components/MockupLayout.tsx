import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/components/AuthProvider';
import { Trophy, Home, Users, Calendar, Edit3, Sparkles } from 'lucide-react';

interface MockupLayoutProps {
  children: React.ReactNode;
  activeTab: 'challenges' | 'home' | 'friends' | 'calendar' | 'coach';
  floatingButton?: React.ReactNode;
}

export const MockupLayout: React.FC<MockupLayoutProps> = ({ children, activeTab, floatingButton }) => {
  const navigate = useNavigate();
  const { user } = useUser();

  // Extract display details
  const fullName = user?.fullName || 'Sepideh Yazdi';
  const username = user?.username || user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'Sepidy';
  const imageUrl = user?.imageUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sepideh';

  const navItems = [
    { id: 'challenges' as const, label: 'Challenges', path: '/goals', icon: Trophy },
    { id: 'home' as const, label: 'Home', path: '/today', icon: Home },
    { id: 'coach' as const, label: 'AI Coach', path: '/coach', icon: Sparkles },
    { id: 'friends' as const, label: 'Friends', path: '/habits', icon: Users },
    { id: 'calendar' as const, label: 'Calendar', path: '/calendar', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-dot-grid md:py-6 md:px-4 p-0 flex flex-col items-center justify-center font-body relative">
      
      {/* Mockup Phone Card Container */}
      <div className="w-full max-w-full md:max-w-[460px] min-h-screen md:min-h-[92vh] max-h-screen md:max-h-[95vh] bg-transparent md:bg-[#FAF7F2] border-none md:border-[3px] md:border-black rounded-none md:rounded-[42px] shadow-none md:shadow-[8px_8px_0px_#000] flex flex-col justify-between overflow-hidden relative p-4 md:p-6 select-none">
        
        {/* Top Profile Header Widget */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar circle */}
            <div className="w-12 h-12 rounded-full border-[2.5px] border-black overflow-hidden bg-white shrink-0 shadow-[2px_2px_0px_#000]">
              <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover scale-105" />
            </div>
            
            {/* User Details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display font-black text-md leading-tight text-[#0A0A0A]">{fullName}</span>
                <span className="bg-[#C3EE52] text-[#1E3B06] border-[1.5px] border-black px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight leading-none">
                  @{username}
                </span>
              </div>
              <span className="text-[11px] font-label font-bold text-black/75 leading-none mt-1">
                Let's grow together!
              </span>
            </div>
          </div>

          {/* Pencil Edit Icon links to settings */}
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#4CD9E3] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            title="Edit Profile Settings"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Main Content Frame */}
        <div className={`flex-1 overflow-y-auto pr-1 scrollbar-thin ${floatingButton ? 'pb-44' : 'pb-24'}`}>
          {children}
        </div>

        {/* Floating action button inside phone card */}
        {floatingButton && (
          <div className="absolute bottom-[96px] left-6 right-6 z-30 flex justify-end">
            {floatingButton}
          </div>
        )}

        {/* Floating bottom menu */}
        <div className="absolute bottom-4 left-4 right-4 bg-white border-[3px] border-black rounded-[24px] shadow-[4px_4px_0px_#000] flex justify-around items-center py-2 px-1 z-20">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative py-1.5 px-2 flex flex-col items-center justify-center transition-all cursor-pointer group"
              >
                {/* Active marker - solid yellow rounded pill */}
                {active && (
                  <div className="absolute inset-0 w-full h-full bg-[#FFD600] border-[2px] border-black rounded-[14px] z-0 shadow-[2px_2px_0px_#000]" />
                )}
                
                {/* Icon & Label */}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <Icon className={`w-4.5 h-4.5 transition-colors ${active ? 'text-black' : 'text-black/35 group-hover:text-black'}`} />
                  <span className={`text-[9px] font-label font-black transition-colors tracking-wider uppercase ${active ? 'text-black' : 'text-black/35 group-hover:text-black'}`}>
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
