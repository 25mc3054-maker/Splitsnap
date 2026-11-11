import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, DollarSign, CheckCircle2, Lock, ArrowRight, User } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { PayPalSandboxCheckout } from './PayPalSandboxCheckout';
import { Group, GroupMember, Settlement } from '../domain/types';
import { paiseToRupees } from '../domain/splitEngine';

interface SettleUpDirectViewProps {
  group?: Group;
  simplifiedDebts?: any[];
  onBack: () => void;
  onPaymentConfirmed?: () => void;
  recipientName?: string;
  recipientAvatar?: string;
  upiId?: string;
  amount?: string;
  groupId?: string;
  groupName?: string;
}

export const SettleUpDirectView: React.FC<SettleUpDirectViewProps> = ({
  group,
  simplifiedDebts,
  onBack,
  onPaymentConfirmed,
  recipientName: propRecipientName,
  recipientAvatar: propRecipientAvatar,
  amount: propAmount,
  groupId: propGroupId,
  groupName: propGroupName,
}) => {
  const { notify } = useNotifications();

  // Find user member
  const currentUserMember = (group?.members || []).find(m => m.isCurrentUser) || group?.members?.[0];

  // Find debts where current user owes money
  const myDebts = (simplifiedDebts || []).filter(
    d => !currentUserMember || d.fromMemberId === currentUserMember.id
  );

  const [selectedDebtIdx, setSelectedDebtIdx] = useState(0);

  const activeDebt = myDebts.length > 0 ? myDebts[selectedDebtIdx] : null;
  const debtRecipient = activeDebt && group
    ? group.members.find(m => m.id === activeDebt.toMemberId)
    : null;

  const recipientName = debtRecipient?.name || propRecipientName || 'Aryan Gupta';
  const recipientAvatar = debtRecipient?.avatar || propRecipientAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop';
  const groupId = group?.id || propGroupId || 'grp_manali_2026';
  const groupName = group?.name || propGroupName || 'Manali Trip';

  const amountPaise = activeDebt
    ? activeDebt.amountPaise
    : propAmount
    ? Math.round(parseFloat(propAmount) * 100)
    : 80000;

  const syntheticSettlement: Settlement = {
    id: activeDebt ? `set_${activeDebt.fromMemberId}_${activeDebt.toMemberId}` : `set_quick_${Date.now()}`,
    groupId,
    fromMemberId: currentUserMember?.id || 'mem_kushagra',
    toMemberId: debtRecipient?.id || 'mem_aryan',
    amountPaise,
    method: 'paypal_sandbox',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <span>Back to Group</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            PayPal Sandbox Settlement
          </h2>
        </div>

        <div className="w-16" />
      </div>

      {/* If multiple debts, allow debt selector */}
      {myDebts.length > 1 && (
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
          <span className="text-xs text-slate-400 font-medium">Select Debt to Settle:</span>
          <div className="flex gap-2 overflow-x-auto">
            {myDebts.map((d, idx) => {
              const rec = group?.members.find(m => m.id === d.toMemberId);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDebtIdx(idx)}
                  className={`py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                    idx === selectedDebtIdx
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                      : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  Pay {rec?.name || 'Friend'} ({paiseToRupees(d.amountPaise)})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipient Profile & Status Capsule */}
      <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-72 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider mb-3">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Developer Sandbox Environment</span>
          </div>

          <div className="flex items-center gap-3 mb-2 p-2 px-5 rounded-full bg-black/40 border border-white/[0.1] backdrop-blur-md shadow-lg">
            <img
              src={recipientAvatar}
              alt={recipientName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
            />
            <div className="text-left">
              <span className="text-xs text-slate-400 block -mb-0.5">Settling with</span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                {recipientName}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm">
            Payment handled directly via PayPal Developer Platform with real-time order capture & ledger synchronization.
          </p>
        </div>

        <PayPalSandboxCheckout
          settlement={syntheticSettlement}
          recipientName={recipientName}
          groupName={groupName}
          onSuccess={() => {
            notify({
              type: 'settlement_confirmed',
              title: 'PayPal Sandbox Payment Confirmed',
              message: `Captured PayPal Developer Sandbox payment for ${recipientName} (${paiseToRupees(amountPaise)}). Group balance reconciled.`,
              amountText: paiseToRupees(amountPaise),
              groupName,
              actorName: `${currentUserMember?.name || 'Kushagra'} (You)`,
              groupId,
              actionType: 'settle',
            });
            if (onPaymentConfirmed) onPaymentConfirmed();
          }}
        />
      </div>
    </div>
  );
};
