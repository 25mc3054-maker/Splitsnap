import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Receipt,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
} from 'lucide-react';
import QRCode from 'qrcode';
import { claimInvite, updateAssignments, reportPaid } from '../utils/api';
import { paiseToRupees } from '../domain/splitEngine';
import { Expense, Settlement } from '../domain/types';
import { PayPalSandboxCheckout } from './PayPalSandboxCheckout';

interface GuestPortalProps {
  token: string;
  guestNameOverride?: string;
  onExit: () => void;
}

export const GuestPortal: React.FC<GuestPortalProps> = ({
  token,
  guestNameOverride,
  onExit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestSession, setGuestSession] = useState<any>(null);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [reportedMessage, setReportedMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const data = await claimInvite(token);
        setGuestSession(data);
        if (data.expenses && data.expenses.length > 0) {
          const exp = data.expenses[0];
          setActiveExpense(exp);

          // Find items currently assigned to this guest
          const guestAssigned = (exp.assignments || [])
            .filter((a: any) => a.memberId === data.memberId)
            .map((a: any) => a.lineItemId);
          setSelectedItemIds(guestAssigned);
        }
      } catch (err: any) {
        setError(err.message || 'Invalid or expired guest link');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [token]);

  // Calculate guest's share
  const memberId = guestSession?.memberId;
  const myAllocation = activeExpense?.allocations?.[memberId];
  const sharePaise = myAllocation?.totalPaise || 0;
  const shareRupees = (sharePaise / 100).toFixed(2);

  // Toggle item selection
  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Submit my selection to the server
  const handleSaveSelection = async () => {
    if (!activeExpense || !guestSession) return;
    setIsSaving(true);
    try {
      const myAssignments = selectedItemIds.map(id => ({
        lineItemId: id,
        memberId: guestSession.memberId,
        weight: 1,
      }));

      const res = await updateAssignments(activeExpense.id, myAssignments, guestSession.memberId);
      setActiveExpense(res.expense);
      alert('Your item selection was submitted successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit selection');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-slate-400">
        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="font-medium">Verifying cryptographic guest session...</span>
        </div>
      </div>
    );
  }

  if (error || !guestSession) {
    return (
      <div className="mx-auto max-w-md rounded-3xl glass-panel border border-rose-500/30 p-8 text-center mt-12 shadow-2xl">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white">Guest Invite Unavailable</h2>
        <p className="mt-2 text-xs text-slate-400">{error || 'This link has expired or has been revoked.'}</p>
        <button
          onClick={onExit}
          className="mt-6 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] px-5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          Return to App
        </button>
      </div>
    );
  }

  const memberName = guestNameOverride || guestSession.memberName;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4 px-4 pb-20 select-none animate-in fade-in duration-300">
      {/* Top Banner: Guest identification */}
      <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
              <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Scoped Guest Portal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Hello, {memberName} 👋</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Invited to <strong className="text-slate-200">{guestSession.groupName}</strong> · No account required
            </p>
          </div>

          <button
            onClick={onExit}
            className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            Switch to Host View
          </button>
        </div>
      </div>

      {activeExpense ? (
        <div className="space-y-5">
          {/* Receipt Info Card */}
          <div className="rounded-3xl glass-panel border border-white/[0.08] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Bill from</span>
                <h2 className="text-base font-bold text-white tracking-tight">{activeExpense.merchantName}</h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Total Bill: <strong className="text-emerald-400 font-mono">{paiseToRupees(activeExpense.totalPaise)}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  {activeExpense.state === 'published' ? `Published (v${activeExpense.version})` : 'Draft Review'}
                </span>
              </div>
            </div>
          </div>

          {/* Item Consumption Picker */}
          <div className="rounded-3xl glass-panel border border-white/[0.08] p-5 space-y-4 shadow-lg">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Select What You Consumed</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Check all items you ordered or shared with the group.
              </p>
            </div>

            <div className="space-y-2">
              {activeExpense.items.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                        : 'bg-black/30 border-white/[0.05] hover:border-white/[0.1] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500 text-[#06090d]'
                            : 'border-white/20 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{item.description}</div>
                        <div className="text-[11px] text-slate-400">Qty: {item.quantity}</div>
                      </div>
                    </div>

                    <div className="font-mono text-xs font-bold text-cyan-300">
                      {paiseToRupees(item.lineTotalPaise)}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveSelection}
              disabled={isSaving}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 py-3 text-xs font-bold text-[#06090d] hover:bg-emerald-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)]"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>{isSaving ? 'Saving Selections...' : 'Confirm My Selections'}</span>
            </button>
          </div>

          {/* Guest Share Breakdown */}
          {myAllocation && (
            <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <span className="text-xs text-slate-400">Your Share Breakdown</span>
                  <h3 className="text-2xl font-bold text-white font-mono tracking-tight mt-0.5">
                    {paiseToRupees(myAllocation.totalPaise)}
                  </h3>
                </div>
                <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                  <div>Items: {paiseToRupees(myAllocation.itemsPaise)}</div>
                  <div>Taxes & Tip: {paiseToRupees(myAllocation.adjustmentsPaise)}</div>
                </div>
              </div>

              {/* Items Detail */}
              <div className="space-y-1.5 text-xs text-slate-300">
                {myAllocation.itemDetails.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.description} <span className="text-slate-500">({it.portionDescription})</span></span>
                    <span className="font-mono">{paiseToRupees(it.paise)}</span>
                  </div>
                ))}
                {myAllocation.adjustmentDetails.map((adj, idx) => (
                  <div key={idx} className="flex justify-between text-slate-400 text-[11px]">
                    <span>{adj.description} (proportional)</span>
                    <span className="font-mono">{paiseToRupees(adj.paise)}</span>
                  </div>
                ))}
              </div>

              {/* Payment Section */}
              <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Settle Your Share via PayPal Developer Sandbox
                    </h4>
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                      EXCLUSIVE
                    </span>
                  </div>
                </div>

                <PayPalSandboxCheckout
                  settlement={{
                    id: `set_guest_${token}_${Date.now()}`,
                    groupId: guestSession?.groupId || 'grp_manali_2026',
                    fromMemberId: memberId || 'guest',
                    toMemberId: 'mem_aarav',
                    amountPaise: sharePaise,
                    method: 'paypal_sandbox',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                  }}
                  recipientName="Aarav Sharma (Host)"
                  groupName="Group Expense"
                  onSuccess={() => {
                    setReportedMessage(
                      `Payment of $${(sharePaise / 100 / 85).toFixed(2)} USD captured via PayPal Sandbox! Host ledger reconciled.`
                    );
                  }}
                />

                {reportedMessage && (
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{reportedMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl glass-panel border border-white/[0.08] p-8 text-center text-xs text-slate-400">
          No expenses have been added to this group yet. Check back soon!
        </div>
      )}

      {/* Scoped Privacy Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[11px] text-slate-400">
        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
        <span>
          <strong className="text-white">Zero Friction Guest Link:</strong> Your token is scoped only to this group. You can only view and select your own items, and you never need to create an account or provide passwords.
        </span>
      </div>
    </div>
  );
};
