import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Receipt,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useNotifications, SplitSnapNotification } from '../context/NotificationContext';

interface NotificationDrawerProps {
  onSelectGroup?: (groupId: string) => void;
  onNavigateToSettle?: () => void;
  onNavigateToExpense?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  onSelectGroup,
  onNavigateToSettle,
  onNavigateToExpense,
}) => {
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    setIsDrawerOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    simulateIncomingActivity,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'settlement'>('all');

  if (!isDrawerOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'expense') return n.type === 'expense_added' || n.type === 'receipt_scanned';
    if (activeFilter === 'settlement') return n.type === 'settlement_confirmed';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#060b09] border-l border-[#182822] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#182822] bg-[#09120e]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00e599]/15 border border-[#00e599]/30 text-[#00e599]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="flex h-5 items-center justify-center rounded-full bg-[#00e599] px-2 text-[10px] font-bold text-[#060b09] shadow-[0_0_8px_#00e599]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Live group expenses & settlement alerts</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#182822] transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-[#00e599]" />
                    <span className="hidden sm:inline text-[11px]">Read all</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#182822] transition-colors cursor-pointer"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-[#182822] transition-colors cursor-pointer ml-1"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#00e599] text-[#060b09]'
                    : 'bg-[#0e1714] border border-[#182822] text-slate-400 hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('expense')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === 'expense'
                    ? 'bg-[#00e599] text-[#060b09]'
                    : 'bg-[#0e1714] border border-[#182822] text-slate-400 hover:text-white'
                }`}
              >
                Expenses ({notifications.filter(n => n.type === 'expense_added' || n.type === 'receipt_scanned').length})
              </button>
              <button
                onClick={() => setActiveFilter('settlement')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === 'settlement'
                    ? 'bg-[#00e599] text-[#060b09]'
                    : 'bg-[#0e1714] border border-[#182822] text-slate-400 hover:text-white'
                }`}
              >
                Settlements ({notifications.filter(n => n.type === 'settlement_confirmed').length})
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0e1714] border border-[#182822] text-slate-500">
                  <Bell className="h-6 w-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">All caught up!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  You have no pending notifications. When a group member adds an expense or settles a debt, it will appear here.
                </p>
                <div className="pt-2">
                  <button
                    onClick={simulateIncomingActivity}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#00e599]/15 border border-[#00e599]/30 px-3.5 py-1.5 text-xs font-semibold text-[#00e599] hover:bg-[#00e599]/25 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Simulate Incoming Event</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const isSettlement = notif.type === 'settlement_confirmed';
                const isExpense = notif.type === 'expense_added';

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markAsRead(notif.id);
                    }}
                    className={`relative rounded-2xl p-3.5 transition-all cursor-pointer border ${
                      notif.isRead
                        ? 'bg-[#0c1411] border-[#182822] hover:border-slate-700'
                        : 'bg-[#0e1a15] border-[#00e599]/40 shadow-[0_0_15px_rgba(0,229,153,0.1)]'
                    }`}
                  >
                    {/* Unread indicator beacon */}
                    {!notif.isRead && (
                      <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]"></span>
                      </span>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Avatar or Icon */}
                      {notif.actorAvatar ? (
                        <img
                          src={notif.actorAvatar}
                          alt={notif.actorName}
                          className="h-9 w-9 rounded-full object-cover border border-[#182822] shrink-0 mt-0.5"
                        />
                      ) : (
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                            isSettlement
                              ? 'bg-[#00e599]/15 border-[#00e599]/30 text-[#00e599]'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {isSettlement ? <CheckCircle2 className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-bold text-white tracking-tight">
                            {notif.title}
                          </span>
                          <span className="rounded-full bg-[#182822] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {notif.groupName}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notif.timestamp}
                          </span>

                          {notif.amountText && (
                            <span className="font-mono font-bold text-[#00e599]">
                              {notif.amountText}
                            </span>
                          )}
                        </div>

                        {/* Interactive Context Shortcut */}
                        <div className="mt-2.5 pt-2 border-t border-[#182822]/60 flex items-center justify-between">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (notif.actionType === 'settle' && onNavigateToSettle) {
                                onNavigateToSettle();
                                setIsDrawerOpen(false);
                              } else if (onSelectGroup && notif.groupId) {
                                onSelectGroup(notif.groupId);
                                setIsDrawerOpen(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00e599] hover:underline cursor-pointer"
                          >
                            <span>
                              {notif.actionType === 'settle'
                                ? 'Verify Settlement'
                                : `Open ${notif.groupName}`}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              clearNotification(notif.id);
                            }}
                            className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove notification"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Test Simulator */}
          <div className="p-4 border-t border-[#182822] bg-[#09120e] flex items-center justify-between">
            <button
              onClick={simulateIncomingActivity}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1f18] border border-[#00e599]/40 py-2.5 px-4 text-xs font-semibold text-[#00e599] hover:bg-[#142820] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,229,153,0.15)]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Simulate Incoming Group Activity</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
