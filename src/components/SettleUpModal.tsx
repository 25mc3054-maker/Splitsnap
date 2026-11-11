import React, { useState } from 'react';
import { X, CheckCircle2, Clock, DollarSign, CreditCard } from 'lucide-react';
import { Settlement, GroupMember } from '../domain/types';
import { PayPalSandboxCheckout } from './PayPalSandboxCheckout';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  fromMember?: GroupMember;
  toMember?: GroupMember;
  isCurrentUserRecipient?: boolean;
  onSettlementUpdated: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  settlement,
  fromMember,
  toMember,
  onSettlementUpdated,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !settlement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/[0.12] p-6 sm:p-7 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Settle Up Expense</h2>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                PAYPAL SANDBOX
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {fromMember?.name || 'Payer'} → <strong className="text-white">{toMember?.name || 'Recipient'}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settlement Status Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-black/40 border border-white/[0.08] p-3.5 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Ledger Status:</span>
            <span className="font-semibold text-white capitalize">{settlement.status}</span>
          </div>

          <div>
            {settlement.status === 'confirmed' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled & Paid
              </span>
            ) : settlement.status === 'reported' ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" /> Captured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <CreditCard className="h-3.5 w-3.5" /> PayPal Sandbox Ready
              </span>
            )}
          </div>
        </div>

        {/* PayPal Developer Platform (Sandbox) Flow */}
        <PayPalSandboxCheckout
          settlement={settlement}
          recipientName={toMember?.name || 'Recipient'}
          onSuccess={() => {
            setSuccessMessage('Settlement processed via PayPal Sandbox and ledger reconciled!');
            onSettlementUpdated();
          }}
        />

        {successMessage && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
