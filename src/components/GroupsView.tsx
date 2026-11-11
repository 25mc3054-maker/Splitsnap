import React, { useState } from 'react';
import {
  Bell,
  Scan,
  Users,
  ChevronRight,
  Plus,
  Home,
  Pizza,
  Layers,
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { Group } from '../domain/types';
import { createGroup } from '../utils/api';
import { paiseToRupees } from '../domain/splitEngine';
import { useNotifications } from '../context/NotificationContext';

interface GroupsViewProps {
  groups: any[];
  onSelectGroup: (groupId: string) => void;
  onRefresh: () => void;
  onScanReceipt?: () => void;
  onSettleUp?: () => void;
  onAddExpense?: () => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  onSelectGroup,
  onRefresh,
  onScanReceipt,
  onSettleUp,
  onAddExpense,
}) => {
  const { unreadCount, setIsDrawerOpen } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Trip');
  const [membersInput, setMembersInput] = useState([
    { name: 'Aryan Gupta', upiId: 'aryangupta@okaxis' },
    { name: 'Aditya Sharma', upiId: 'aditya@oksbi' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultShowcaseGroups = [
    {
      id: 'grp_manali_2026',
      name: 'Manali Trip',
      category: 'Adventure & Travel',
      spendText: '₹2,430 · 6 members',
      rawSpend: '₹12,000.00',
      avatarType: 'mountain',
      avatarUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop',
      dateRange: 'Nov 11 – Nov 15, 2026',
      yourBalance: '-₹800.00',
      status: 'You owe ₹800.00',
      statusType: 'owe',
      settleTo: 'Aryan Gupta',
      settlementPercent: 68,
      memberAvatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      ],
      extraMemberCount: 3,
    },
    {
      id: 'grp_flat_utilities',
      name: 'Flat & Utilities',
      category: 'Household Shared',
      spendText: '₹1,200 · 3 members',
      rawSpend: '₹1,200.00',
      avatarType: 'home',
      avatarUrl: '',
      dateRange: 'Monthly Ongoing',
      yourBalance: '₹0.00',
      status: 'Fully Settled',
      statusType: 'settled',
      settleTo: null,
      settlementPercent: 100,
      memberAvatars: [
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      ],
      extraMemberCount: 1,
    },
    {
      id: 'grp_college_food',
      name: 'College Food',
      category: 'Dining & Outings',
      spendText: '₹850 · 4 members',
      rawSpend: '₹850.00',
      avatarType: 'pizza',
      avatarUrl: '',
      dateRange: 'Nov 2026',
      yourBalance: '+₹425.00',
      status: 'You are owed ₹425.00',
      statusType: 'owed',
      settleTo: null,
      settlementPercent: 45,
      memberAvatars: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      ],
      extraMemberCount: 2,
    },
  ];

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createGroup({
        name: name.trim(),
        type: type as any,
        members: membersInput.filter(m => m.name.trim()),
      });
      setIsModalOpen(false);
      setName('');
      onRefresh();
      onSelectGroup(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSpendPaise = groups.length > 0
    ? groups.reduce((acc, g) => acc + (g.totalExpensesPaise || 0), 0)
    : 1405000;
  const totalUserNetPaise = groups.length > 0
    ? groups.reduce((acc, g) => acc + (g.userNetPaise || 0), 0)
    : -37500;
  let totalYouAreOwedPaise = 0;
  let totalYouOwePaise = 0;
  let pendingDebtsCount = 0;

  groups.forEach(g => {
    const net = g.userNetPaise || 0;
    if (net > 0) totalYouAreOwedPaise += net;
    if (net < 0) {
      totalYouOwePaise += Math.abs(net);
      pendingDebtsCount++;
    }
  });

  const displayGroups = groups.length > 0
    ? groups.map(g => {
        const memberCount = g.members?.length || 4;
        const totalPaise = g.totalExpensesPaise !== undefined ? g.totalExpensesPaise : 0;
        let spend = `${paiseToRupees(totalPaise)} · ${memberCount} members`;
        let rawSpend = paiseToRupees(totalPaise);
        let status = 'Fully Settled';
        let statusType: 'owe' | 'owed' | 'settled' = 'settled';
        let yourBalance = '₹0.00';
        let category = g.type === 'Trip' ? 'Adventure & Travel' : g.type === 'Home' ? 'Household Shared' : 'General Expense';
        let settlementPercent = 100;
        let settleTo: string | null = null;

        const netPaise = g.userNetPaise !== undefined ? g.userNetPaise : 0;
        if (netPaise < 0) {
          const absNet = Math.abs(netPaise);
          yourBalance = `-${paiseToRupees(absNet)}`;
          status = `You owe ${paiseToRupees(absNet)}`;
          statusType = 'owe';
          settlementPercent = 65;

          const myMember = (g.members || []).find((m: any) => m.isCurrentUser);
          if (myMember && g.simplifiedDebts) {
            const myDebt = g.simplifiedDebts.find((d: any) => d.fromMemberId === myMember.id);
            if (myDebt) {
              const toMem = (g.members || []).find((m: any) => m.id === myDebt.toMemberId);
              if (toMem) settleTo = toMem.name;
            }
          }
          if (!settleTo && (g.name.includes('Manali') || g.id.includes('manali'))) {
            settleTo = 'Aryan Gupta';
          }
        } else if (netPaise > 0) {
          yourBalance = `+${paiseToRupees(netPaise)}`;
          status = `You are owed ${paiseToRupees(netPaise)}`;
          statusType = 'owed';
          settlementPercent = 75;
        } else {
          yourBalance = '₹0.00';
          status = 'Fully Settled';
          statusType = 'settled';
          settlementPercent = 100;
        }

        let avatarType = 'other';
        let avatarUrl = '';
        if (g.name.toLowerCase().includes('manali') || g.name.toLowerCase().includes('trip') || g.name.toLowerCase().includes('goa')) {
          avatarType = 'mountain';
          avatarUrl = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop';
        } else if (g.name.toLowerCase().includes('flat') || g.name.toLowerCase().includes('home') || g.name.toLowerCase().includes('utilities')) {
          avatarType = 'home';
        } else if (g.name.toLowerCase().includes('food') || g.name.toLowerCase().includes('college')) {
          avatarType = 'pizza';
        }

        return {
          id: g.id,
          name: g.name,
          category,
          spendText: spend,
          rawSpend,
          avatarType,
          avatarUrl,
          status,
          statusType,
          settleTo,
          settlementPercent,
          yourBalance,
          memberAvatars: (g.members || []).slice(0, 2).map((m: any) => m.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'),
          extraMemberCount: Math.max(0, memberCount - 2),
        };
      })
    : defaultShowcaseGroups;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7 select-none animate-in fade-in duration-300">
      {/* Top Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-base shadow-[0_0_20px_rgba(0,229,153,0.15)]">
              KR
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#06090d]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Hi Kushagra
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-medium">
                Active Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Hamilton-Hare Zero-Drift Engine</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-slate-400">PayPal Sandbox Ready</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00e599]" />
            <span className="font-mono text-slate-300 font-medium">kushagrarana2006@gmail.com</span>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer"
            title="View Group Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-[#06090d] shadow-[0_0_10px_#00e599]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Financial Ledger Position Card */}
      <div className="relative rounded-3xl glass-card-hero p-6 sm:p-7 border border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Subtle decorative mesh orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Net Position */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Net Position Across Groups
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                totalUserNetPaise < 0
                  ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400'
                  : totalUserNetPaise > 0
                  ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400'
                  : 'bg-slate-400/10 border border-slate-400/20 text-slate-300'
              }`}>
                {totalUserNetPaise < 0
                  ? `${pendingDebtsCount} Pending Debt${pendingDebtsCount > 1 ? 's' : ''}`
                  : totalUserNetPaise > 0
                  ? 'Net Positive'
                  : 'All Settled'}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight ${
                totalUserNetPaise < 0 ? 'text-amber-400' : totalUserNetPaise > 0 ? 'text-emerald-400' : 'text-white'
              }`}>
                {totalUserNetPaise < 0
                  ? `-${paiseToRupees(Math.abs(totalUserNetPaise))}`
                  : totalUserNetPaise > 0
                  ? `+${paiseToRupees(totalUserNetPaise)}`
                  : '₹0.00'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (≈ {totalUserNetPaise < 0 ? '-' : ''}${(Math.abs(totalUserNetPaise) / 100 / 85).toFixed(2)} USD)
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {totalUserNetPaise < 0
                ? `You owe ${paiseToRupees(totalYouOwePaise)} total across groups and are owed ${paiseToRupees(totalYouAreOwedPaise)}.`
                : totalUserNetPaise > 0
                ? `You are owed a net of ${paiseToRupees(totalUserNetPaise)} across all your active groups.`
                : 'All your expenses and settlements are completely reconciled with zero drift.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={onSettleUp}
                className="py-2.5 px-5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-[#06090d] font-extrabold text-xs tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,153,0.35)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Settle via PayPal Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onAddExpense}
                className="py-2.5 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              >
                + Add Expense
              </button>
            </div>
          </div>

          {/* Quick Metrics Breakdown Pillars */}
          <div className="lg:col-span-6 grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.07] backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-medium">Total Spend</span>
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-white tracking-tight">
                {paiseToRupees(totalSpendPaise)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Across {groups.length || 3} groups
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-[11px] font-medium">You Are Owed</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-emerald-400 tracking-tight">
                +{paiseToRupees(totalYouAreOwedPaise)}
              </div>
              <span className="text-[10px] text-emerald-500/80 font-medium mt-1 block">
                Receivables
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-[11px] font-medium">You Owe</span>
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-amber-400 tracking-tight">
                -{paiseToRupees(totalYouOwePaise)}
              </div>
              <span className="text-[10px] text-amber-500/80 font-medium mt-1 block">
                Pending Debts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Quick-Action Interactive Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Scan Receipt (Gemini AI) */}
        <button
          onClick={onScanReceipt}
          className="group relative p-5 rounded-3xl glass-panel glass-panel-hover border border-emerald-500/30 flex flex-col justify-between active:scale-[0.99] transition-all cursor-pointer text-left overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(0,229,153,0.15)] group-hover:scale-105 transition-transform">
              <Scan className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
              <Sparkles className="w-2.5 h-2.5" />
              Gemini AI
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                Scan Receipt (AI)
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Extract itemized bills, tax lines & tips with zero manual calculations.
            </p>
          </div>
        </button>

        {/* Card 2: New Group */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative p-5 rounded-3xl glass-panel glass-panel-hover border border-white/[0.08] flex flex-col justify-between active:scale-[0.99] transition-all cursor-pointer text-left overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-white/20 transition-all shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-medium text-slate-400">
              Trip / Flat
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors tracking-tight">
                New Group
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Create an expense group for vacations, housemates, or weekend dinners.
            </p>
          </div>
        </button>

        {/* Card 3: Settle Up (PayPal Sandbox) */}
        <button
          onClick={onSettleUp}
          className="group relative p-5 rounded-3xl glass-panel glass-panel-hover border border-cyan-500/30 flex flex-col justify-between active:scale-[0.99] transition-all cursor-pointer text-left overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.15)] group-hover:scale-105 transition-transform">
              <CreditCard className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
              PAYPAL SANDBOX
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                Settle Up (PayPal)
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pay via PayPal Developer Sandbox (USD) and verify automated debt reconciliation.
            </p>
          </div>
        </button>
      </div>

      {/* Your Groups Section Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Active Expense Groups</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 font-semibold">
              {displayGroups.length}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer group"
          >
            <span>+ Create Group</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Groups Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayGroups.map(grp => (
            <div
              key={grp.id}
              onClick={() => onSelectGroup(grp.id)}
              className="p-5 rounded-3xl glass-panel glass-panel-hover border border-white/[0.08] flex flex-col justify-between transition-all cursor-pointer shadow-lg group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  {grp.avatarType === 'mountain' ? (
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-md">
                      <img
                        src={grp.avatarUrl}
                        alt={grp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : grp.avatarType === 'home' ? (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-800/10 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md">
                      <Home className="w-6 h-6" />
                    </div>
                  ) : grp.avatarType === 'pizza' ? (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-800/10 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-md">
                      <Pizza className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 shadow-md">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                      {grp.category}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white/[0.03] group-hover:bg-emerald-500/10 border border-white/[0.06] group-hover:border-emerald-500/30 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                  {grp.name}
                </h3>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-1">
                  <span>{grp.spendText}</span>
                  <span className="text-slate-300 font-semibold">{grp.rawSpend}</span>
                </div>

                {/* Member Avatars preview */}
                <div className="flex items-center -space-x-2 mt-4">
                  {grp.memberAvatars?.map((av: string, idx: number) => (
                    <img
                      key={idx}
                      src={av}
                      alt="member"
                      className="w-6 h-6 rounded-full object-cover ring-2 ring-[#0e1714]"
                    />
                  ))}
                  {grp.extraMemberCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-white/[0.08] text-slate-300 ring-2 ring-[#0e1714] flex items-center justify-center text-[10px] font-bold">
                      +{grp.extraMemberCount}
                    </div>
                  )}
                  <span className="text-[11px] text-slate-500 ml-3">reconciled</span>
                </div>
              </div>

              {/* Status footer with distinct color-coded pill */}
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {grp.status}
                </span>

                <span className="font-mono font-bold">
                  {grp.statusType === 'owe' ? (
                    <span className="text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      {grp.yourBalance}
                    </span>
                  ) : grp.statusType === 'owed' ? (
                    <span className="text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                      {grp.yourBalance}
                    </span>
                  ) : (
                    <span className="text-slate-400 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      Settled
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Center Action Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onAddExpense}
          className="py-3 px-8 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm tracking-wide flex items-center gap-2 shadow-[0_0_25px_rgba(0,229,153,0.35)] hover:bg-emerald-300 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Expense</span>
        </button>
      </div>

      {/* New Group Modal with Frosted Glass Aesthetics */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl glass-panel p-6 sm:p-7 border border-white/[0.12] shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Create New Group</h3>
                <p className="text-xs text-slate-400 mt-0.5">Start tracking shared expenses with zero drift</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Kasol Trip, Flat 301, Dinner Outing"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Group Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#0e1714] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all cursor-pointer font-sans"
                >
                  <option value="Trip">Trip / Vacation</option>
                  <option value="Home">Home / Flatmates</option>
                  <option value="Couple">Couple</option>
                  <option value="Other">Other Outing</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-emerald-400 text-[#06090d] font-bold text-sm hover:bg-emerald-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,229,153,0.3)] active:scale-[0.99]"
                >
                  {isSubmitting ? 'Creating Group...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
