import React from 'react';
import { Layers, Users, Clock, User, Plus, Scan, Bell, Sparkles } from 'lucide-react';
import { SplitSnapLogo } from './SplitSnapLogo';
import { useNotifications } from '../context/NotificationContext';

interface NavbarProps {
  currentTab: 'groups' | 'friends' | 'activity' | 'account';
  onSelectTab: (tab: 'groups' | 'friends' | 'activity' | 'account') => void;
  onNewExpense: () => void;
  onScanReceipt?: () => void;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewExpense,
  onScanReceipt,
  onOpenChat,
}) => {
  const { unreadCount, setIsDrawerOpen } = useNotifications();

  const navItems = [
    { id: 'groups' as const, label: 'Groups', icon: Layers },
    { id: 'friends' as const, label: 'Friends', icon: Users },
    { id: 'activity' as const, label: 'Activity', icon: Clock },
    { id: 'account' as const, label: 'Account', icon: User },
  ];

  return (
    <header className="sticky top-[41px] z-40 w-full border-b border-white/[0.07] bg-[#070a0e]/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand Wordmark & Logo */}
        <button
          onClick={() => onSelectTab('groups')}
          className="flex items-center gap-3 text-left transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
        >
          <SplitSnapLogo size="sm" showText={true} showSubtitle={false} />
        </button>

        {/* 4 Premium Navigation Links with Underline Highlights */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-full shadow-inner">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#00e599]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#00e599] rounded-full shadow-[0_0_6px_#00e599]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions: Notification Bell, Scan Receipt & Add Expense */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell with Badge */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all cursor-pointer shadow-sm"
            title="Notifications & Alerts"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#00e599] text-[10px] font-black text-[#06090d] shadow-[0_0_10px_#00e599]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Scan Receipt Button */}
          {onScanReceipt && (
            <button
              onClick={onScanReceipt}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.1] bg-white/[0.04] text-xs font-bold text-slate-200 hover:text-white hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <Scan className="h-3.5 w-3.5 text-[#00e599]" />
              <span>Scan Receipt</span>
            </button>
          )}

          {/* Primary Action: Add Expense */}
          <button
            onClick={onNewExpense}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-[#00e599] to-[#00ffaa] hover:from-[#10fbb0] hover:to-[#26ffb8] text-[#06090d] text-xs font-black tracking-tight shadow-[0_0_20px_rgba(0,229,153,0.35)] active:scale-[0.97] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>
    </header>
  );
};
