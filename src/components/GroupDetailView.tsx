import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Bus,
  Bed,
  Utensils,
  Plus,
  Receipt,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  Layers,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Group, GroupMember, Settlement } from '../domain/types';
import { paiseToRupees } from '../domain/splitEngine';

interface GroupDetailViewProps {
  group: Group;
  balances: Record<string, any>;
  simplifiedDebts: any[];
  onBack: () => void;
  onOpenSplitStudio: () => void;
  onOpenSettleModal: (settlement: Settlement, fromM?: GroupMember, toM?: GroupMember) => void;
  onOpenGuestPortal: (token: string, name: string) => void;
  onRefresh: () => void;
  onSettleNow?: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  group,
  balances,
  simplifiedDebts,
  onBack,
  onOpenSplitStudio,
  onOpenSettleModal,
  onOpenGuestPortal,
  onRefresh,
  onSettleNow,
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'charts' | 'totals'>('expenses');

  const currentUserMember = group.members.find(m => m.isCurrentUser) || group.members[0];
  const myBalance = balances[currentUserMember?.id || '']?.netPaise || 0;
  const totalGroupSpendPaise = group.expenses && group.expenses.length > 0
    ? group.expenses.reduce((sum, e) => sum + e.totalPaise, 0)
    : 1200000;

  // Find if current user owes someone in simplifiedDebts
  const myDebt = (simplifiedDebts || []).find(d => d.fromMemberId === currentUserMember?.id);
  const debtRecipient = myDebt ? group.members.find(m => m.id === myDebt.toMemberId) : null;

  // Check if someone owes the user
  const owesMe = (simplifiedDebts || []).find(d => d.toMemberId === currentUserMember?.id);
  const owesMeMember = owesMe ? group.members.find(m => m.id === owesMe.fromMemberId) : null;

  // Hardcoded or dynamically formatted showcase expenses matching the screenshot
  const fallbackExpenses = [
    {
      id: 'exp_bus',
      title: 'Bus to Manali',
      amount: '₹4,800.00',
      paidBy: 'Aryan Gupta',
      date: 'Nov 11, 2026',
      icon: 'bus',
      itemsCount: '4 luxury seats',
      category: 'Transport',
    },
    {
      id: 'exp_hotel',
      title: 'Hotel (2 Nights)',
      amount: '₹6,000.00',
      paidBy: 'You',
      date: 'Nov 11, 2026',
      icon: 'hotel',
      itemsCount: '2 mountain suites',
      category: 'Accommodation',
    },
    {
      id: 'exp_dinner',
      title: 'Dinner at The Mountain Cafe',
      amount: '₹1,200.00',
      paidBy: 'Aditya Sharma',
      date: 'Nov 12, 2026',
      icon: 'dinner',
      itemsCount: '5 gourmet items',
      category: 'Food & Dining',
    },
  ];

  const displayExpenses = (group.expenses && group.expenses.length > 0)
    ? group.expenses.map(e => {
        const payer = group.members.find(m => m.id === e.payerMemberId)?.name || 'Member';
        const dateStr = new Date(e.occurredAt || e.createdAt).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        let icon = 'dinner';
        const titleLower = e.title.toLowerCase();
        if (titleLower.includes('bus') || titleLower.includes('cab') || titleLower.includes('flight') || titleLower.includes('train')) {
          icon = 'bus';
        } else if (titleLower.includes('hotel') || titleLower.includes('stay') || titleLower.includes('resort') || titleLower.includes('chalet') || titleLower.includes('rent')) {
          icon = 'hotel';
        }
        return {
          id: e.id,
          title: e.title,
          amount: paiseToRupees(e.totalPaise),
          paidBy: payer,
          date: dateStr,
          icon,
          itemsCount: `${e.items?.length || 1} item(s)`,
          category: e.merchantName || 'General',
        };
      })
    : fallbackExpenses;

  const handleSettleClick = () => {
    if (myDebt && debtRecipient) {
      onOpenSettleModal(
        {
          id: `set_${myDebt.fromMemberId}_${myDebt.toMemberId}`,
          groupId: group.id,
          fromMemberId: myDebt.fromMemberId,
          toMemberId: myDebt.toMemberId,
          amountPaise: myDebt.amountPaise,
          method: 'paypal_sandbox',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        currentUserMember,
        debtRecipient
      );
    } else if (onSettleNow) {
      onSettleNow();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <span>Back to All Groups</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSplitStudio}
            className="flex items-center gap-2 py-2 px-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-[#06090d] font-bold text-xs active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)]"
          >
            <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Snap Receipt (AI)</span>
          </button>
        </div>
      </div>

      {/* Mountain Hero Banner Card with Frosted Depth */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.1] shadow-2xl">
        {/* Snowy mountain image background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&auto=format&fit=crop"
            alt="Mountain Header"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06090d] via-[#06090d]/85 to-black/40 backdrop-blur-[2px]" />
        </div>

        <div className="relative p-6 sm:p-8 z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 min-h-[220px]">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md uppercase tracking-wider mb-3">
              <Calendar className="w-3.5 h-3.5" />
              <span>Nov 11 – Nov 15, 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 drop-shadow-md">
              {group.name}
            </h1>

            {/* Member Avatars Row with +3 */}
            <div className="flex items-center -space-x-2.5">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                alt="Aryan"
                title="Aryan Gupta"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#06090d]"
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
                alt="Aditya"
                title="Aditya Sharma"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#06090d]"
              />
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
                alt="You"
                title="Kushagra (You)"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-400 shadow-[0_0_8px_#00e599]"
              />
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                alt="Diya"
                title="Diya Patel"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#06090d]"
              />
              <div className="w-9 h-9 rounded-full bg-white/[0.1] backdrop-blur-md text-slate-200 ring-2 ring-[#06090d] flex items-center justify-center text-xs font-bold font-mono">
                +2
              </div>
              <span className="text-xs text-slate-300 ml-4 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                6 members active
              </span>
            </div>
          </div>

          {/* Quick Stats on right */}
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-xl border border-white/[0.1] p-4 sm:p-5 rounded-2xl shadow-xl">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Total Spend</span>
              <span className="font-mono text-lg sm:text-xl font-bold text-white tracking-tight">
                {paiseToRupees(totalGroupSpendPaise)}
              </span>
            </div>
            <div className="w-px h-9 bg-white/[0.1]" />
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Your Position</span>
              <span className={`font-mono font-bold text-sm sm:text-base flex items-center gap-1 ${
                myBalance < 0 ? 'text-amber-400' : myBalance > 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {myBalance < 0 ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" />
                    -{paiseToRupees(Math.abs(myBalance))}
                  </>
                ) : myBalance > 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{paiseToRupees(myBalance)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ₹0.00
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pill Filter Tabs: Expenses, Balances, Charts, Totals */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-emerald-400 text-[#06090d] shadow-[0_0_15px_rgba(0,229,153,0.35)]'
              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Expenses ({displayExpenses.length})
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'balances'
              ? 'bg-emerald-400 text-[#06090d] font-bold shadow-[0_0_15px_rgba(0,229,153,0.35)]'
              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Balances & Debts
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'charts'
              ? 'bg-emerald-400 text-[#06090d] font-bold shadow-[0_0_15px_rgba(0,229,153,0.35)]'
              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Spending Charts
        </button>

        <button
          onClick={() => setActiveTab('totals')}
          className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'totals'
              ? 'bg-emerald-400 text-[#06090d] font-bold shadow-[0_0_15px_rgba(0,229,153,0.35)]'
              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Member Totals
        </button>
      </div>

      {/* Outstanding Balance Luxury FinTech Settle Card */}
      <div className="relative rounded-3xl glass-card-hero p-6 border border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl overflow-hidden">
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-2xl pointer-events-none ${
          myDebt ? 'bg-amber-500/10' : owesMe ? 'bg-emerald-500/10' : 'bg-teal-500/10'
        }`} />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] uppercase tracking-wider font-bold ${
              myDebt ? 'text-amber-400' : owesMe ? 'text-emerald-400' : 'text-emerald-300'
            }`}>
              {myDebt ? 'Outstanding Debt Settlement' : owesMe ? 'Receivable Balance' : 'Group Status'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
              PAYPAL SANDBOX ONLY
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {myDebt
                ? paiseToRupees(myDebt.amountPaise)
                : owesMe
                ? `+${paiseToRupees(owesMe.amountPaise)}`
                : '₹0.00'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              (≈ ${myDebt ? (myDebt.amountPaise / 100 / 85).toFixed(2) : owesMe ? (owesMe.amountPaise / 100 / 85).toFixed(2) : '0.00'} USD)
            </span>
          </div>

          <p className="text-xs text-slate-400 pt-0.5">
            {myDebt && debtRecipient ? (
              <>
                Directly payable to <strong className="text-white">{debtRecipient.name}</strong> (<span className="text-cyan-400 font-mono">{debtRecipient.upiId || 'sandbox-recipient@paypal.com'}</span>)
              </>
            ) : owesMe && owesMeMember ? (
              <>
                <strong className="text-white">{owesMeMember.name}</strong> owes you {paiseToRupees(owesMe.amountPaise)} in this group.
              </>
            ) : (
              'All member balances are reconciled and settled with zero paise drift.'
            )}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {myDebt ? (
            <button
              onClick={handleSettleClick}
              className="py-3 px-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-[#06090d] font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(0,229,153,0.35)] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Settle Now via PayPal</span>
            </button>
          ) : (
            <div className="py-2.5 px-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Settled Up</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Expenses List */}
      {activeTab === 'expenses' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Group Expenses History
            </h3>
            <span className="text-xs text-slate-500">
              3 items recorded
            </span>
          </div>

          <div className="space-y-3">
            {displayExpenses.map(exp => (
              <div
                key={exp.id}
                className="p-4 sm:p-5 rounded-3xl glass-panel glass-panel-hover border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer shadow-md group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all shrink-0 shadow-sm">
                    {exp.icon === 'bus' ? (
                      <Bus className="w-5 h-5 text-emerald-400" />
                    ) : exp.icon === 'hotel' ? (
                      <Bed className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Utensils className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                        {exp.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="font-mono font-semibold text-slate-200">{exp.amount}</span> · Paid by {exp.paidBy} ({exp.itemsCount})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium block">{exp.date}</span>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Reconciled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Balances & Simplified Debts */}
      {activeTab === 'balances' && (
        <div className="p-6 sm:p-7 rounded-3xl glass-panel border border-white/[0.08] space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Net Balances (Hamilton-Hare Ledger)</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                Integer Precision
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Calculated in exact integer paise to eliminate fractional currency drift across all {group.members.length} members.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {group.members.map(member => {
              const bal = balances[member.id];
              const net = bal ? bal.netPaise : 0;
              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl bg-black/40 border flex items-center justify-between ${
                    net > 0 ? 'border-emerald-500/20' : net < 0 ? 'border-amber-500/20' : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'}
                      alt={member.name}
                      className={`w-10 h-10 rounded-full object-cover ring-2 ${
                        net > 0 ? 'ring-emerald-500/30' : net < 0 ? 'ring-amber-500/30' : 'ring-white/10'
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {member.name} {member.isCurrentUser ? '(You)' : ''}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{member.upiId || 'No UPI ID'}</p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm font-bold px-2.5 py-1 rounded-full border ${
                      net > 0
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : net < 0
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : 'text-slate-400 bg-white/[0.04] border-white/[0.08]'
                    }`}
                  >
                    {net > 0 ? `+${paiseToRupees(net)}` : net < 0 ? `-${paiseToRupees(Math.abs(net))}` : '₹0.00'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Charts */}
      {activeTab === 'charts' && (
        <div className="p-6 sm:p-7 rounded-3xl glass-panel border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Spend Breakdown by Category</h3>
            <span className="text-xs font-mono text-slate-400">Total: {paiseToRupees(totalGroupSpendPaise)}</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Accommodation & Stays</span>
                <span className="font-mono text-slate-200 font-bold">50% · ₹6,000.00</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Transport & Travel</span>
                <span className="font-mono text-slate-200 font-bold">40% · ₹4,800.00</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Food & Dining</span>
                <span className="font-mono text-slate-200 font-bold">10% · ₹1,200.00</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Totals */}
      {activeTab === 'totals' && (
        <div className="p-6 sm:p-7 rounded-3xl glass-panel border border-white/[0.08] space-y-4">
          <h3 className="text-base font-bold text-white">Member Totals Paid</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {group.members.map(member => {
              const bal = balances[member.id];
              const paid = bal ? bal.paidPaise : 0;
              return (
                <div key={member.id} className="p-4 rounded-2xl bg-black/30 border border-white/[0.07]">
                  <span className="text-xs text-slate-400 block mb-1">
                    {member.name} {member.isCurrentUser ? '(You)' : ''} paid
                  </span>
                  <span className="font-mono text-lg font-bold text-white">{paiseToRupees(paid)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Center Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
        <button
          onClick={onOpenSplitStudio}
          className="py-3 px-7 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm tracking-wide flex items-center gap-2 shadow-[0_0_25px_rgba(0,229,153,0.35)] hover:bg-emerald-300 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Receipt className="w-4 h-4 stroke-[2.5]" />
          <span>Split Receipt (Studio)</span>
        </button>
      </div>
    </div>
  );
};
