import React from 'react';
import { Users, User, TrendingUp, Smile, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'groups' | 'friends' | 'activity' | 'account';
  onSelectTab: (tab: 'groups' | 'friends' | 'activity' | 'account') => void;
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  className = '',
}) => {
  const tabs = [
    { key: 'groups' as const, label: 'Groups', icon: Users },
    { key: 'friends' as const, label: 'Friends', icon: User },
    { key: 'activity' as const, label: 'Activity', icon: TrendingUp },
    { key: 'account' as const, label: 'Account', icon: Smile },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex h-16 shrink-0 items-center justify-around border-t border-white/[0.08] bg-[#06090d]/90 px-3 backdrop-blur-xl select-none shadow-[0_-8px_30px_rgba(0,0,0,0.5)] ${className}`}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`relative flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#00e599]" />
            )}
            <Icon className={`h-4 w-4 ${isActive ? 'scale-110 text-emerald-400' : ''} transition-transform`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
