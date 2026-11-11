import React, { useState } from 'react';
import { Clock, Filter, Receipt, CheckCircle2, UserCheck, IndianRupee, DollarSign, CreditCard } from 'lucide-react';
import { ActivityEvent } from '../domain/types';

interface ActivityViewProps {
  groups: any[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ groups }) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'settlement'>('all');

  // Hardcoded showcase activities if no group activity loaded yet
  const defaultActivities = [
    {
      id: 'act_1',
      groupName: 'Manali Trip',
      actorName: 'Aditya',
      eventType: 'expense_published',
      description: 'Added Dinner at Cafe (₹1,200.00)',
      createdAt: '2026-11-12T20:30:00Z',
    },
    {
      id: 'act_2',
      groupName: 'Manali Trip',
      actorName: 'Kushagra',
      eventType: 'expense_published',
      description: 'Added Hotel (2 Nights) (₹6,000.00)',
      createdAt: '2026-11-11T14:00:00Z',
    },
    {
      id: 'act_3',
      groupName: 'Manali Trip',
      actorName: 'Aryan',
      eventType: 'expense_published',
      description: 'Added Bus to Manali (₹4,800.00)',
      createdAt: '2026-11-11T08:00:00Z',
    },
    {
      id: 'act_4',
      groupName: 'Flat & Utilities',
      actorName: 'Kushagra',
      eventType: 'expense_published',
      description: 'Added Electricity & Wifi (₹1,200.00)',
      createdAt: '2026-11-05T09:30:00Z',
    },
    {
      id: 'act_5',
      groupName: 'College Food',
      actorName: 'Kushagra',
      eventType: 'expense_published',
      description: 'Added Campus Snacks & Shakes (₹850.00)',
      createdAt: '2026-11-08T13:00:00Z',
    },
  ];

  const allEvents: any[] = [];
  groups.forEach(g => {
    (g.activity || []).forEach((act: ActivityEvent) => {
      allEvents.push({
        ...act,
        groupName: g.name,
      });
    });
  });

  allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const displayList = allEvents.length > 0 ? allEvents : defaultActivities;

  const filteredList = displayList.filter(ev => {
    if (filterType === 'all') return true;
    if (filterType === 'expense') return ev.eventType?.startsWith('expense_');
    if (filterType === 'settlement') {
      return (
        ev.eventType?.startsWith('payment_') ||
        ev.eventType === 'paypal_sandbox_captured'
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20 text-white select-none animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Activity & Ledger Stream</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chronological log of expense additions, receipt versions, and PayPal Sandbox settlements.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/40 p-1 text-xs backdrop-blur-md">
          {(['all', 'expense', 'settlement'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`rounded-full px-3.5 py-1 font-medium capitalize transition-all cursor-pointer ${
                filterType === tab
                  ? 'bg-emerald-400 text-[#06090d] font-bold shadow-[0_0_12px_rgba(0,229,153,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredList.map(ev => {
          const isPayPal = ev.eventType === 'paypal_sandbox_captured';
          const isPayment = ev.eventType?.startsWith('payment_') || isPayPal;

          return (
            <div
              key={ev.id}
              className={`p-4 sm:p-5 rounded-3xl glass-panel glass-panel-hover border flex items-start gap-4 transition-all shadow-md group ${
                isPayPal
                  ? 'border-cyan-500/30'
                  : 'border-white/[0.08]'
              }`}
            >
              <div
                className={`p-3 rounded-2xl border shrink-0 transition-transform group-hover:scale-105 ${
                  isPayPal
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : isPayment
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                }`}
              >
                {isPayPal ? (
                  <CreditCard className="w-4 h-4" />
                ) : isPayment ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Receipt className="w-4 h-4 text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {ev.description}
                    </span>
                    {isPayPal && (
                      <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
                        PAYPAL
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {new Date(ev.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <span className="text-emerald-400 font-medium">{ev.groupName}</span>
                  <span>·</span>
                  <span>{ev.actorName || 'Participant'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
