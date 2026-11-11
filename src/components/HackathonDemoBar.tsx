import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck, UserCheck, Sparkles, Bell, Cpu, Database } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { fetchDatabaseStatus } from '../utils/api';

interface HackathonDemoBarProps {
  onResetDemo: () => void;
  isResetting: boolean;
  activeScreen: string;
  onSelectScreen: (screen: string) => void;
  onOpenGuestPortal?: (token: string, name: string) => void;
  onOpenChat?: () => void;
}

export const HackathonDemoBar: React.FC<HackathonDemoBarProps> = ({
  onResetDemo,
  isResetting,
  activeScreen,
  onSelectScreen,
  onOpenGuestPortal,
  onOpenChat,
}) => {
  const { simulateIncomingActivity } = useNotifications();
  const [dbActionCount, setDbActionCount] = useState<number | null>(null);

  useEffect(() => {
    fetchDatabaseStatus()
      .then(st => setDbActionCount(st.totalActionsRecorded))
      .catch(() => {});
  }, [activeScreen]);

  const screens = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'group_detail', label: 'Manali Trip' },
    { id: 'split_studio', label: 'Split Studio' },
    { id: 'scan_receipt', label: 'Scan Camera' },
    { id: 'review_ai', label: 'Review AI' },
    { id: 'choose_items', label: 'Choose Items' },
    { id: 'add_expense', label: 'Add Expense' },
    { id: 'settle_up', label: 'Settle Up' },
  ];

  return (
    <div className="border-b border-white/[0.06] bg-[#070a0e]/95 backdrop-blur-xl px-4 py-2 text-xs select-none sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        {/* Left: Engine Status Capsule & Database Memory Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599] shadow-[0_0_8px_#00e599]"></span>
            </span>
            <span className="font-bold text-white text-[11px] tracking-tight">SplitSnap Engine</span>
            <span className="text-white/20">|</span>
            <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">
              Hamilton-Hare · Zero-Paise
            </span>
          </div>

          <div
            onClick={() => onSelectScreen('dashboard')}
            className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-mono text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-colors"
            title="Durable database storage is active at data/splitsnap.db.json with an append-only action journal."
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>DB Memory: {dbActionCount !== null ? `${dbActionCount} Logged` : 'Active'}</span>
          </div>
        </div>

        {/* Center: Sleek Flow Jumpers */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {screens.map(s => {
            const isActive = activeScreen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectScreen(s.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#00e599] text-[#06090d] font-bold shadow-[0_0_16px_rgba(0,229,153,0.35)] scale-[1.02]'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Right: Guest Portal, Alert Simulator & Reset Data */}
        <div className="flex items-center gap-2">
          {onOpenGuestPortal && (
            <button
              onClick={() => onOpenGuestPortal('tok_rohan_goa_9a8b7c', 'Rohan Verma')}
              className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20 px-3 py-1 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px] font-medium"
              title="Test guest link as Rohan without sign-in"
            >
              <UserCheck className="h-3 w-3 text-[#00e599]" />
              <span>Rohan Portal</span>
            </button>
          )}

          {/* Simulate Live Alert */}
          <button
            onClick={simulateIncomingActivity}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-[#00e599]/40 hover:bg-emerald-950/20 px-3 py-1 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px]"
            title="Simulate incoming group alert"
          >
            <Bell className="h-3 w-3 text-[#00e599]" />
            <span className="hidden sm:inline">Simulate Alert</span>
          </button>

          {/* AI Copilot Quick Trigger */}
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-[#00e599]/40 px-3 py-1 text-[#00e599] hover:brightness-125 transition-all cursor-pointer text-[11px] font-bold shadow-[0_0_12px_rgba(0,229,153,0.2)]"
              title="Open Gemini AI Assistant"
            >
              <Sparkles className="h-3 w-3 text-[#00e599]" />
              <span>AI Copilot</span>
            </button>
          )}

          {/* Reset Demo State */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-rose-500/40 hover:bg-rose-950/20 px-2.5 py-1 text-slate-400 hover:text-rose-300 transition-all cursor-pointer text-[11px] disabled:opacity-40"
            title="Reset sandbox state to pristine demonstration data"
          >
            <RefreshCw className={`h-3 w-3 ${isResetting ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden xl:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
