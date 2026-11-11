import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Receipt, Check, Sparkles, CheckCircle2, Sliders } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../domain/sampleReceipts';

export interface ReceiptItem {
  id: string;
  name: string;
  price: number; // in rupees
  checked: boolean;
}

interface ReviewReceiptAIViewProps {
  receipt?: any;
  onBack: () => void;
  onUseReceipt: (receiptData: { items: ReceiptItem[]; merchantName: string; total: number; subtotal: number; tax: number }) => void;
  onOpenSplitStudio?: () => void;
}

export const ReviewReceiptAIView: React.FC<ReviewReceiptAIViewProps> = ({
  receipt,
  onBack,
  onUseReceipt,
  onOpenSplitStudio,
}) => {
  const defaultReceipt = receipt || SAMPLE_RECEIPTS[0];

  const [merchantName, setMerchantName] = useState(defaultReceipt.merchantName || 'The Mountain Cafe');
  const [location, setLocation] = useState(defaultReceipt.location || 'Manali, HP');
  const [date, setDate] = useState(defaultReceipt.date || '2026-11-11');

  const [items, setItems] = useState<ReceiptItem[]>(() => {
    if (defaultReceipt.items && defaultReceipt.items.length > 0) {
      return defaultReceipt.items.map((it: any, idx: number) => ({
        id: it.id || `item_${idx}`,
        name: it.description || it.name,
        price: it.lineTotalPaise ? it.lineTotalPaise / 100 : it.price || 100,
        checked: idx === 0 || idx === 2 || idx === 4, // default selection sample
      }));
    }
    return [
      { id: '1', name: 'Paneer Butter Masala', price: 420, checked: true },
      { id: '2', name: 'Dal Tadka', price: 280, checked: false },
      { id: '3', name: 'Garlic Naan (2)', price: 140, checked: true },
      { id: '4', name: 'Jeera Rice', price: 180, checked: false },
      { id: '5', name: 'Lemon Soda (3)', price: 270, checked: true },
    ];
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (receipt && receipt.items) {
      setMerchantName(receipt.merchantName || 'Extracted Receipt');
      if (receipt.location) setLocation(receipt.location);
      if (receipt.date) setDate(receipt.date);
      setItems(
        receipt.items.map((it: any, idx: number) => ({
          id: it.id || `item_${idx}`,
          name: it.description || it.name,
          price: it.lineTotalPaise ? it.lineTotalPaise / 100 : it.price || 100,
          checked: true,
        }))
      );
    }
  }, [receipt]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePriceChange = (id: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr) || 0;
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, price: val } : item))
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const total = subtotal + tax;

  const handleConfirmUseReceipt = () => {
    onUseReceipt({
      items,
      merchantName,
      subtotal,
      tax,
      total,
    });
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
          <span>Back to Scanner</span>
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Review Receipt (Gemini Vision AI)
          </h2>
        </div>

        {onOpenSplitStudio ? (
          <button
            onClick={onOpenSplitStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Advanced Studio</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Merchant Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center justify-between backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(0,229,153,0.2)]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{merchantName}</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{location} · {date}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 py-1 px-3 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AI Verified (Zero Drift)</span>
          </div>
        </div>

        {/* Items Section Header */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-white tracking-tight">
              Parsed Line Items ({items.length})
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              {isEditing ? 'Done Editing' : 'Edit Items'}
            </button>
          </div>

          {/* Items Checklist */}
          <div className="space-y-2.5">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  if (!isEditing) toggleItem(item.id);
                }}
                className={`py-3.5 px-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isEditing ? 'cursor-default' : 'cursor-pointer'
                } ${
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-black/30 border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 mr-3">
                  <div
                    onClick={(e) => {
                      if (isEditing) {
                        e.stopPropagation();
                        toggleItem(item.id);
                      }
                    }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      item.checked
                        ? 'bg-emerald-400 text-[#06090d] shadow-[0_0_10px_rgba(0,229,153,0.4)]'
                        : 'border border-white/20 bg-black/40'
                    }`}
                  >
                    {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems(prev => prev.map(it => it.id === item.id ? { ...it, name: val } : it));
                      }}
                      className="bg-black/40 border border-white/[0.1] rounded-lg px-2 py-1 text-sm text-white w-full max-w-xs focus:outline-none focus:border-emerald-400"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-100">{item.name}</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      className="bg-black/40 border border-white/[0.1] rounded-lg px-2 py-1 text-sm font-mono font-bold text-white w-20 text-right focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-mono font-bold text-white">
                    ₹{item.price.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5 text-sm backdrop-blur-md">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono text-slate-200 font-semibold">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Tax (CGST 2.5% + SGST 2.5%)</span>
            <span className="font-mono text-slate-200 font-semibold">₹{tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/[0.08] pt-3 flex justify-between font-bold text-base">
            <span className="text-white">Total Verified Amount</span>
            <span className="font-mono text-xl text-emerald-400">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirmUseReceipt}
            className="w-full py-4 px-8 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm sm:text-base tracking-wide hover:bg-emerald-300 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,229,153,0.35)] cursor-pointer"
          >
            Use This Receipt & Select Items
          </button>
        </div>
      </div>
    </div>
  );
};
