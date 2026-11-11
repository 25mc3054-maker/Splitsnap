import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Zap, ZapOff, Sparkles, Check } from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../domain/sampleReceipts';

interface CameraScanViewProps {
  onBack: () => void;
  onCapture: (receiptData?: any) => void;
  onPickGallery?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CameraScanView: React.FC<CameraScanViewProps> = ({
  onBack,
  onCapture,
  onPickGallery,
}) => {
  const [flashOn, setFlashOn] = useState(false);
  const [isScanningAnim, setIsScanningAnim] = useState(false);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  const sample = SAMPLE_RECEIPTS[selectedSampleIndex] || SAMPLE_RECEIPTS[0];

  const handleCaptureClick = () => {
    setIsScanningAnim(true);
    setTimeout(() => {
      onCapture(sample);
    }, 600);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col bg-[#06090d] text-white select-none rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <span>Back</span>
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Scan Receipt (Gemini Vision AI)
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Position receipt inside active viewfinder brackets</p>
        </div>

        {/* Flash Toggle */}
        <button
          onClick={() => setFlashOn(!flashOn)}
          className={`p-2 rounded-full border transition-all cursor-pointer ${
            flashOn
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(0,229,153,0.3)]'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
          }`}
          title="Toggle camera flash"
        >
          {flashOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Camera Viewfinder Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-black/95 min-h-[460px]">
        {/* Subtle camera view noise / vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/95 pointer-events-none" />

        {/* Viewfinder Bounding Box with 4 Glowing Neon Brackets */}
        <div className="relative w-full max-w-[340px] flex items-center justify-center p-4">
          {/* 4 Glowing Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-emerald-400 rounded-tl-xl drop-shadow-[0_0_12px_rgba(0,229,153,0.8)]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-emerald-400 rounded-tr-xl drop-shadow-[0_0_12px_rgba(0,229,153,0.8)]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-emerald-400 rounded-bl-xl drop-shadow-[0_0_12px_rgba(0,229,153,0.8)]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-emerald-400 rounded-br-xl drop-shadow-[0_0_12px_rgba(0,229,153,0.8)]" />

          {/* Animated laser line during scan */}
          <div className="absolute inset-x-2 top-8 h-0.5 bg-emerald-400 shadow-[0_0_15px_#00e599,0_0_30px_#00e599] animate-[bounce_3s_infinite] pointer-events-none z-20 opacity-80" />

          {/* Realistic Paper Receipt in Viewfinder */}
          <div className="w-full bg-[#fbf9f5] text-[#1c1917] p-5 rounded-2xl shadow-2xl font-mono text-[11px] leading-tight border-t-2 border-b-2 border-dashed border-stone-300">
            {/* Header */}
            <div className="text-center pb-2 border-b border-stone-300">
              <h3 className="text-base font-extrabold tracking-tight text-stone-900 font-sans">
                {sample.merchantName}
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">{sample.location}</p>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-[10px] text-stone-500 py-1.5 border-b border-dashed border-stone-300">
              <span>Dine In</span>
              <span>Date: {sample.date}</span>
              <span>Time: 20:14</span>
            </div>

            {/* Line items */}
            <div className="py-2.5 space-y-1.5 text-[11px]">
              {sample.items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.description}</span>
                  <span className="font-semibold">₹{(item.lineTotalPaise / 100).toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-stone-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Sub Total</span>
                <span>₹{(sample.items.reduce((acc, it) => acc + it.lineTotalPaise, 0) / 100).toFixed(2)}</span>
              </div>
              {sample.adjustments.map(adj => (
                <div key={adj.id} className="flex justify-between text-stone-500 text-[10px]">
                  <span>{adj.description}</span>
                  <span>₹{(adj.amountPaise / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-stone-800 text-stone-900">
                <span>Total</span>
                <span className="font-sans">₹{(sample.totalPaise / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-5 bg-black/60 border-t border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Gallery / File Upload */}
        <label className="flex items-center gap-2 py-2.5 px-4 rounded-full bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all text-xs font-semibold">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          <span>Upload Receipt Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              if (onPickGallery) onPickGallery(e);
              else onCapture(sample);
            }}
          />
        </label>

        {/* Center Shutter Button */}
        <button
          onClick={handleCaptureClick}
          className={`flex items-center gap-3 py-3 px-8 rounded-full bg-emerald-400 text-[#06090d] font-extrabold text-sm tracking-wide shadow-[0_0_25px_rgba(0,229,153,0.4)] hover:bg-emerald-300 active:scale-95 transition-all cursor-pointer ${
            isScanningAnim ? 'ring-4 ring-emerald-400' : ''
          }`}
          title="Capture and parse receipt"
        >
          <div className="w-4 h-4 rounded-full border-2 border-black/40 bg-black/20" />
          <span>Capture & Extract Line Items</span>
        </button>

        {/* Sample selector pills */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1">
            {SAMPLE_RECEIPTS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSampleIndex(idx)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                  idx === selectedSampleIndex
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(0,229,153,0.3)]'
                    : 'text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.06]'
                }`}
                title={s.merchantName}
              >
                {s.merchantName.split(' ')[1] || s.merchantName.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
