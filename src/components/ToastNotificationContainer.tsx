import React from 'react';
import {
  CheckCircle2,
  Receipt,
  Sparkles,
  X,
  CreditCard,
  IndianRupee,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { useNotifications, ActiveToast } from '../context/NotificationContext';

export const ToastNotificationContainer: React.FC = () => {
  const { toasts, dismissToast, setIsDrawerOpen } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-none flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md w-full"
    >
      {toasts.map(toast => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ActiveToast;
  onDismiss: () => void;
  onOpenDrawer: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, onOpenDrawer }) => {
  const isSettlement = toast.type === 'settlement_confirmed';
  const isExpense = toast.type === 'expense_added';

  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-[#09120e]/95 border border-[#00e599]/30 backdrop-blur-xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(0,229,153,0.15)] transition-all animate-in fade-in slide-in-from-top-4 duration-300 select-none"
      role="alert"
    >
      {/* Left accent strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isSettlement
            ? 'bg-[#00e599] shadow-[0_0_10px_#00e599]'
            : isExpense
            ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
            : 'bg-teal-400'
        }`}
      />

      <div className="flex items-start gap-3.5 pl-1.5">
        {/* Type Icon Badge */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            isSettlement
              ? 'bg-[#00e599]/15 border-[#00e599]/30 text-[#00e599]'
              : isExpense
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-teal-500/15 border-teal-500/30 text-teal-300'
          }`}
        >
          {isSettlement ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : isExpense ? (
            <Receipt className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-tight">
                {toast.title}
              </span>
              {toast.groupName && (
                <span className="rounded-full bg-[#182822] border border-[#22392f] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {toast.groupName}
                </span>
              )}
            </div>

            {toast.amountText && (
              <span className="shrink-0 font-mono text-xs font-bold text-[#00e599]">
                {toast.amountText}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-2">
            {toast.message}
          </p>

          <button
            onClick={onOpenDrawer}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00e599] hover:text-[#00ffaa] transition-colors cursor-pointer"
          >
            <span>View Notification Center</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-[#182822] hover:text-white transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Countdown progress line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#182822]">
        <div
          className="h-full bg-[#00e599]/60 transition-all ease-linear"
          style={{
            animation: `shrinkWidth ${toast.durationMs}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
