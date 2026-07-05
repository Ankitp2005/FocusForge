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
      
      {/* Phone Card Container — sharper corners, heavier border, deeper shadow */}
      <div className="w-full max-w-full md:max-w-[460px] min-h-screen md:min-h-[92vh] max-h-screen md:max-h-[95vh] bg-transparent md:bg-[#FAF7F2] border-none md:border-[4px] md:border-black rounded-none md:rounded-[14px] shadow-none md:shadow-[10px_10px_0px_#000] flex flex-col justify-between overflow-hidden relative p-4 md:p-6 select-none">
        
        {/* Top Profile Header */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar — hard square-ish border */}
            <div className="w-12 h-12 rounded-[8px] border-[3px] border-black overflow-hidden bg-white shrink-0 shadow-[3px_3px_0px_#000]">
              <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover scale-105" />
            </div>
            
            {/* User Details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display font-black text-md leading-tight text-[#0A0A0A]">* {fullName}</span>
                <span className="bg-[#FFD600] text-[#0A0A0A] border-[2px] border-black px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider leading-none shadow-[2px_2px_0px_#000]">
                  @{username}
                </span>
              </div>
              <span className="text-[10px] font-label font-black text-black/60 leading-none mt-1 tracking-wide uppercase">
                Let's grow together!
              </span>
            </div>
          </div>

          {/* Edit button — sharper, more brutalist */}
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-[8px] bg-[#4CD9E3] border-[2.5px] border-black flex items-center justify-center shadow-[3px_3px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            title="Edit Profile Settings"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Main Content Frame */}
        <div className={`flex-1 overflow-y-auto pr-1 scrollbar-thin ${floatingButton ? 'pb-44' : 'pb-24'}`}>
          {children}
        </div>

        {/* Floating action button slot */}
        {floatingButton && (
          <div className="absolute bottom-[96px] left-6 right-6 z-30 flex justify-end">
            {floatingButton}
          </div>
        )}

        {/* Bottom Navigation — solid block buttons */}
        <div className="absolute bottom-4 left-4 right-4 bg-white border-[3px] border-black rounded-[10px] shadow-[5px_5px_0px_#000] flex justify-around items-center py-2 px-1 z-20">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center transition-all cursor-pointer group"
              >
                {/* Active = raised black block with yellow text */}
                {active ? (
                  <div className="flex flex-col items-center bg-[#0A0A0A] border-[2px] border-black rounded-[8px] px-2.5 py-1.5 shadow-[3px_3px_0px_#FFD600] gap-0.5">
                    <Icon className="w-4 h-4 text-[#FFD600]" />
                    <span className="text-[8px] font-label font-black tracking-wider uppercase text-[#FFD600] leading-none">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-2.5 py-1.5 gap-0.5 hover:opacity-70 transition-opacity">
                    <Icon className="w-4 h-4 text-black/40 group-hover:text-black transition-colors" />
                    <span className="text-[8px] font-label font-black tracking-wider uppercase text-black/40 group-hover:text-black transition-colors leading-none">
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
