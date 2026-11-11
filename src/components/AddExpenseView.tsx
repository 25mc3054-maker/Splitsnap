import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  FileText,
  Users,
  ListFilter,
  Sliders,
  ChevronRight,
  Plus,
  Receipt as ReceiptIcon,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Group, GroupMember } from '../domain/types';
import { saveExpense } from '../utils/api';
import { rupeesToPaise, paiseToRupees } from '../domain/splitEngine';

interface AddExpenseViewProps {
  group?: Group;
  onBack: () => void;
  onSaved: () => void;
  onEditReceipt?: () => void;
  onOpenSplitStudio?: () => void;
  initialAmount?: string;
  initialDescription?: string;
}

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  group,
  onBack,
  onSaved,
  onEditReceipt,
  onOpenSplitStudio,
  initialAmount = '2,340.00',
  initialDescription = 'Dinner at Cafe',
}) => {
  const { notify } = useNotifications();

  // Active group fallback if needed
  const activeGroup: Group = group || {
    id: 'grp_manali_2026',
    name: 'Manali Trip',
    type: 'Trip' as any,
    currency: 'INR',
    ownerUserId: 'user_kushagra',
    members: [
      {
        id: 'mem_kushagra',
        groupId: 'grp_manali_2026',
        name: 'Kushagra',
        upiId: 'kushagra@okhdfcbank',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        role: 'owner' as any,
        isCurrentUser: true,
      },
      {
        id: 'mem_aryan',
        groupId: 'grp_manali_2026',
        name: 'Aryan Gupta',
        upiId: 'aryangupta@okaxis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        role: 'member' as any,
      },
      {
        id: 'mem_aditya',
        groupId: 'grp_manali_2026',
        name: 'Aditya Sharma',
        upiId: 'aditya@oksbi',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        role: 'member' as any,
      },
      {
        id: 'mem_rohan',
        groupId: 'grp_manali_2026',
        name: 'Rohan Verma',
        upiId: 'rohan@oksbi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        role: 'guest' as any,
      },
    ],
    expenses: [],
    settlements: [],
    invites: [],
    activity: [],
    createdAt: new Date().toISOString(),
  };

  const [description, setDescription] = useState(initialDescription);
  const [amount, setAmount] = useState(initialAmount);
  const [splitType, setSplitType] = useState<'equally' | 'by_items' | 'custom'>('equally');

  const defaultPayer = activeGroup.members.find(m => m.isCurrentUser) || activeGroup.members[0];
  const [payerMemberId, setPayerMemberId] = useState<string>(defaultPayer?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    activeGroup.members.map(m => m.id)
  );
  const [isPayerDropdownOpen, setIsPayerDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPayer = activeGroup.members.find(m => m.id === payerMemberId) || defaultPayer;

  const toggleMemberParticipation = (mId: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(mId)) {
        if (prev.length <= 1) return prev; // Keep at least one participant
        return prev.filter(id => id !== mId);
      } else {
        return [...prev, mId];
      }
    });
  };

  const handleSave = async () => {
    if (!description.trim()) {
      alert('Please enter an expense description.');
      return;
    }
    const paise = rupeesToPaise(amount);
    if (paise <= 0) {
      alert('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      alert('Please select at least one member to split this expense with.');
      return;
    }

    setIsSaving(true);
    try {
      // Direct equal split across selected members
      const assignments = selectedMemberIds.map(mId => ({
        lineItemId: 'direct',
        memberId: mId,
        weight: 1,
      }));

      await saveExpense(activeGroup.id, {
        title: description.trim(),
        merchantName: description.trim(),
        payerMemberId: selectedPayer.id,
        totalPaise: paise,
        items: [],
        adjustments: [],
        assignments,
        publishImmediately: true,
      });

      notify({
        type: 'expense_added',
        title: 'New Expense Added',
        message: `"${description}" (${paiseToRupees(paise)}) added to ${activeGroup.name} and reconciled across ${selectedMemberIds.length} members with zero paise drift.`,
        amountText: paiseToRupees(paise),
        groupName: activeGroup.name,
        actorName: `${selectedPayer.name}${selectedPayer.isCurrentUser ? ' (You)' : ''}`,
        actorAvatar: selectedPayer.avatar,
        groupId: activeGroup.id,
        actionType: 'expense',
      });

      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const perPersonShareRupees = selectedMemberIds.length > 0
    ? (rupeesToPaise(amount) / selectedMemberIds.length / 100).toFixed(2)
    : '0.00';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
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

        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Add Expense to {activeGroup.name}
        </h2>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-xs hover:bg-emerald-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)] active:scale-[0.98]"
        >
          {isSaving ? (
            <Clock className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>

      <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Receipt / Split Studio Quick Entry Banner */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-12 bg-white/95 rounded-lg p-1.5 flex flex-col justify-between shadow-md shrink-0">
              <div className="space-y-1">
                <div className="w-5 h-0.5 bg-black/70 rounded" />
                <div className="w-7 h-0.5 bg-black/50 rounded" />
                <div className="w-6 h-0.5 bg-black/50 rounded" />
              </div>
              <div className="w-5 h-0.5 bg-black/70 rounded" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white leading-tight">
                  Receipt Splitting Studio
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 font-mono">
                  Gemini Vision OCR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Have a paper bill? Split by individual consumed items.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenSplitStudio) onOpenSplitStudio();
              else if (onEditReceipt) onEditReceipt();
            }}
            className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Open Split Studio
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Description input */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5 px-1">
              Expense Description
            </label>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.1] flex items-center gap-3 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/40 transition-all">
              <ReceiptIcon className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Dinner at The Mountain Cafe, Cab Ride, Groceries"
                className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5 px-1">
              Total Amount (INR)
            </label>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.1] flex items-center gap-3 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/40 transition-all">
              <span className="text-slate-400 font-bold text-lg shrink-0">₹</span>
              <input
                type="text"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-xl font-mono font-bold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Paid by selector */}
          <div className="relative">
            <label className="text-xs text-slate-300 font-medium block mb-1.5 px-1">
              Paid By
            </label>
            <div
              onClick={() => setIsPayerDropdownOpen(!isPayerDropdownOpen)}
              className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.1] flex items-center justify-between cursor-pointer hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <img
                  src={selectedPayer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                  alt={selectedPayer.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(0,229,153,0.3)]"
                />
                <div>
                  <span className="text-sm font-bold text-white block">
                    {selectedPayer.name} {selectedPayer.isCurrentUser ? '(You)' : ''}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedPayer.upiId || 'No UPI ID'}</span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isPayerDropdownOpen ? 'rotate-90' : ''}`} />
            </div>

            {/* Payer Dropdown List */}
            {isPayerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 p-2 rounded-2xl bg-[#090e14] border border-white/[0.15] shadow-2xl space-y-1">
                {activeGroup.members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setPayerMemberId(member.id);
                      setIsPayerDropdownOpen(false);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      member.id === selectedPayer.id
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'hover:bg-white/[0.05] text-slate-200'
                    }`}
                  >
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'}
                      alt={member.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div className="text-xs font-semibold">
                      <span>{member.name} {member.isCurrentUser ? '(You)' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Split Type Selector */}
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2 px-1">
              Split Protocol
            </span>
            <div className="grid grid-cols-3 gap-3">
              {/* Equally */}
              <button
                type="button"
                onClick={() => setSplitType('equally')}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  splitType === 'equally'
                    ? 'bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(0,229,153,0.2)]'
                    : 'bg-black/30 border border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-bold">Equally</span>
              </button>

              {/* By Items */}
              <button
                type="button"
                onClick={() => {
                  setSplitType('by_items');
                  if (onOpenSplitStudio) onOpenSplitStudio();
                  else if (onEditReceipt) onEditReceipt();
                }}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  splitType === 'by_items'
                    ? 'bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(0,229,153,0.2)]'
                    : 'bg-black/30 border border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-5 h-5" />
                <span className="text-xs font-bold">By Items</span>
              </button>

              {/* Custom */}
              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  splitType === 'custom'
                    ? 'bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(0,229,153,0.2)]'
                    : 'bg-black/30 border border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-5 h-5" />
                <span className="text-xs font-bold">Custom</span>
              </button>
            </div>
          </div>

          {/* Split with members selection */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-slate-300">
                Split with ({selectedMemberIds.length} of {activeGroup.members.length} members)
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ≈ ₹{perPersonShareRupees} / person
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.08]">
              {activeGroup.members.map(member => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMemberParticipation(member.id)}
                    className={`flex items-center gap-2 py-1.5 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_10px_rgba(0,229,153,0.2)]'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'}
                      alt={member.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{member.name} {member.isCurrentUser ? '(You)' : ''}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="pt-4 border-t border-white/[0.08]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 px-8 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm sm:text-base tracking-wide hover:bg-emerald-300 disabled:opacity-50 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,229,153,0.35)] cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Reconciling Ledger & Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Expense & Reconcile Ledger</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
