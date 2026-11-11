import React, { useState } from 'react';
import { Users, Plus, ArrowRight, UserPlus, X, CheckCircle2, CreditCard } from 'lucide-react';
import { paiseToRupees } from '../domain/splitEngine';

interface FriendsViewProps {
  groups: any[];
  onOpenSettleModal: (dummySettlement: any, friendMember: any, hostMember: any) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ groups, onOpenSettleModal }) => {
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendUpi, setFriendUpi] = useState('');
  const [customFriends, setCustomFriends] = useState<{ id: string; name: string; upiId: string }[]>([]);

  const friendsMap: Record<string, { id: string; name: string; upiId?: string; avatar: string; netPaise: number; groupNames: string[] }> = {};

  if (groups.length === 0) {
    // Add default showcase friends if empty
    friendsMap['Aryan Gupta'] = {
      id: 'mem_aryan',
      name: 'Aryan Gupta',
      upiId: 'aryan-buyer@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      netPaise: -80000, // You owe ₹800.00
      groupNames: ['Manali Trip', 'College Food'],
    };

    friendsMap['Aditya Sharma'] = {
      id: 'mem_aditya',
      name: 'Aditya Sharma',
      upiId: 'aditya-sandbox@example.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      netPaise: 40000, // They owe you ₹400.00
      groupNames: ['Manali Trip', 'College Food'],
    };

    friendsMap['Rohan Verma'] = {
      id: 'mem_rohan',
      name: 'Rohan Verma',
      upiId: 'rohan-sandbox@example.com',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
      netPaise: 25000, // They owe you ₹250.00
      groupNames: ['Flat & Utilities', 'College Food'],
    };

    friendsMap['Sameer Joshi'] = {
      id: 'mem_sameer',
      name: 'Sameer Joshi',
      upiId: 'sameer-sandbox@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      netPaise: 0,
      groupNames: ['Flat & Utilities'],
    };
  } else {
    groups.forEach(g => {
      const currentMember = (g.members || []).find((m: any) => m.isCurrentUser);
      const debts = g.simplifiedDebts || [];

      (g.members || []).forEach((m: any) => {
        if (m.isCurrentUser) return;

        if (!friendsMap[m.name]) {
          friendsMap[m.name] = {
            id: m.id,
            name: m.name,
            upiId: m.upiId || 'sandbox-buyer@paypal.com',
            avatar: m.avatar || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop`,
            netPaise: 0,
            groupNames: [g.name],
          };
        } else {
          if (!friendsMap[m.name].groupNames.includes(g.name)) {
            friendsMap[m.name].groupNames.push(g.name);
          }
        }

        if (currentMember) {
          const debtToFriend = debts.find((d: any) => d.fromMemberId === currentMember.id && d.toMemberId === m.id);
          if (debtToFriend) {
            friendsMap[m.name].netPaise -= debtToFriend.amountPaise;
          }
          const debtFromFriend = debts.find((d: any) => d.fromMemberId === m.id && d.toMemberId === currentMember.id);
          if (debtFromFriend) {
            friendsMap[m.name].netPaise += debtFromFriend.amountPaise;
          }
        }
      });
    });
  }

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) return;
    setCustomFriends(prev => [
      ...prev,
      {
        id: `cust_${Date.now()}`,
        name: friendName.trim(),
        upiId: friendUpi.trim(),
      },
    ]);
    setFriendName('');
    setFriendUpi('');
    setIsAddFriendOpen(false);
  };

  const friendList = Object.values(friendsMap);

  return (
    <div className="space-y-6 pb-20 text-white select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Friends & Direct Balances</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated receivables and payables across trips and household cohorts with PayPal Sandbox sync.
          </p>
        </div>

        <button
          onClick={() => setIsAddFriendOpen(true)}
          className="flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-xs font-bold text-[#06090d] hover:bg-emerald-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)] active:scale-[0.98]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Friend</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {friendList.map(friend => (
          <div
            key={friend.id}
            className="p-5 rounded-3xl glass-panel glass-panel-hover border border-white/[0.08] flex items-center justify-between transition-all shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/[0.1] group-hover:ring-emerald-400/50 transition-all"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#06090d]" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                  {friend.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {friend.upiId || 'No PayPal Sandbox Linked'}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {friend.groupNames.slice(0, 2).map((gn, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] text-slate-400 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full"
                    >
                      {gn}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right space-y-1.5">
              <div className="font-mono text-sm font-bold">
                {friend.netPaise < 0 ? (
                  <span className="text-amber-400 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs">
                    You owe {paiseToRupees(Math.abs(friend.netPaise))}
                  </span>
                ) : friend.netPaise > 0 ? (
                  <span className="text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-xs">
                    Owes you {paiseToRupees(friend.netPaise)}
                  </span>
                ) : (
                  <span className="text-slate-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
                    Settled up
                  </span>
                )}
              </div>

              {friend.netPaise < 0 && (
                <div>
                  <button
                    onClick={() =>
                      onOpenSettleModal(
                        {
                          id: `set_${friend.id}`,
                          amountPaise: Math.abs(friend.netPaise),
                          status: 'pending',
                          method: 'paypal_sandbox',
                        },
                        { id: 'user_kushagra', name: 'Kushagra' },
                        friend
                      )
                    }
                    className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer shadow-sm"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Settle via PayPal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAddFriendOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl glass-panel p-6 border border-white/[0.12] shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white">Add Friend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Link a friend's PayPal Sandbox account</p>
              </div>
              <button
                onClick={() => setIsAddFriendOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Friend Name</label>
                <input
                  type="text"
                  required
                  value={friendName}
                  onChange={e => setFriendName(e.target.value)}
                  placeholder="e.g. Priyanshu Sharma"
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">PayPal Sandbox Email</label>
                <input
                  type="email"
                  value={friendUpi}
                  onChange={e => setFriendUpi(e.target.value)}
                  placeholder="e.g. buyer@personal.example.com"
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-emerald-400 text-[#06090d] font-bold text-sm hover:bg-emerald-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)] active:scale-[0.99]"
              >
                Save Friend
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
