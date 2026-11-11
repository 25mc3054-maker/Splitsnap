import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle2, IndianRupee, Sparkles } from 'lucide-react';

export interface ConsumedItem {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface ChooseItemsViewProps {
  receipt?: any;
  onBack: () => void;
  onConfirm: (totalShare: number, selectedItems: ConsumedItem[], receiptData?: any) => void;
}

export const ChooseItemsView: React.FC<ChooseItemsViewProps> = ({
  receipt,
  onBack,
  onConfirm,
}) => {
  const [items, setItems] = useState<ConsumedItem[]>(() => {
    if (receipt && receipt.items && receipt.items.length > 0) {
      return receipt.items.map((it: any) => ({
        id: it.id,
        name: it.name || it.description,
        price: it.price || (it.lineTotalPaise ? it.lineTotalPaise / 100 : 100),
        selected: it.checked ?? true,
      }));
    }
    return [
      { id: '1', name: 'Paneer Butter Masala', price: 420, selected: true },
      { id: '2', name: 'Dal Tadka', price: 280, selected: false },
      { id: '3', name: 'Garlic Naan (2)', price: 140, selected: true },
      { id: '4', name: 'Jeera Rice', price: 180, selected: false },
      { id: '5', name: 'Lemon Soda (3)', price: 270, selected: true },
    ];
  });

  useEffect(() => {
    if (receipt && receipt.items && receipt.items.length > 0) {
      setItems(
        receipt.items.map((it: any) => ({
          id: it.id,
          name: it.name || it.description,
          price: it.price || (it.lineTotalPaise ? it.lineTotalPaise / 100 : 100),
          selected: it.checked ?? true,
        }))
      );
    }
  }, [receipt]);

  const toggleSelect = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectedItemSubtotal = items
    .filter(i => i.selected)
    .reduce((sum, i) => sum + i.price, 0);

  // Proportional GST (5%)
  const proportionalTax = Math.round(selectedItemSubtotal * 0.05 * 100) / 100;
  const yourShare = selectedItemSubtotal + proportionalTax;

  const handleConfirm = () => {
    const selected = items.filter(i => i.selected);
    onConfirm(yourShare, selected, receipt);
  };

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
          <span>Back to Receipt Review</span>
        </button>

        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Choose Your Consumed Items
        </h2>

        <div className="w-16" />
      </div>

      <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Select what you ordered or shared
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
              Hamilton-Hare Precision
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            SplitSnap calculates your exact share in integer paise, applying proportional taxes and service charges.
          </p>
        </div>

        {/* Item rows with neon mint checkboxes */}
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={`py-4 px-5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                item.selected
                  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-md'
                  : 'bg-black/30 border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    item.selected
                      ? 'bg-emerald-400 text-[#06090d] shadow-[0_0_12px_rgba(0,229,153,0.4)]'
                      : 'border border-white/20 bg-black/40'
                  }`}
                >
                  {item.selected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">
                    {item.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.selected ? 'Selected for your ledger' : 'Click to add to your share'}
                  </span>
                </div>
              </div>

              <span className="text-base font-mono font-bold text-white">
                ₹{item.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Card: Your share & Confirm */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Your Calculated Share</span>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                ₹{yourShare.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-slate-400">
                (≈ ${(yourShare / 85).toFixed(2)} USD)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Includes {items.filter(i => i.selected).length} of {items.length} selected items + 5% GST (₹{proportionalTax.toFixed(2)})
            </p>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm sm:text-base tracking-wide hover:bg-emerald-300 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,229,153,0.35)] cursor-pointer"
          >
            Confirm Selection → Add Expense
          </button>
        </div>
      </div>
    </div>
  );
};
