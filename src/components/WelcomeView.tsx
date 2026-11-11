import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SplitSnapLogo } from './SplitSnapLogo';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onLoginGoogle?: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onGetStarted,
  onLoginGoogle = onGetStarted,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-6 bg-[#060b09] text-white select-none">
      {/* Brand Header */}
      <div className="pt-6 flex flex-col items-center text-center">
        <SplitSnapLogo size="lg" showText={false} className="mb-4" />
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          SplitSnap
        </h1>
        <p className="text-slate-400 text-sm max-w-[260px] leading-relaxed">
          Split expenses with friends, from a single receipt.
        </p>
      </div>

      {/* Hero Scanner Illustration */}
      <div className="relative my-auto flex items-center justify-center py-6">
        {/* Subtle radial glow background */}
        <div className="absolute w-56 h-56 rounded-full bg-[#00e599]/10 blur-2xl pointer-events-none" />

        {/* Scanner Corner Brackets & Floating Receipt */}
        <div className="relative w-48 h-56 rounded-2xl border border-[#182822] bg-[#0c1612]/80 backdrop-blur-sm p-4 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,229,153,0.12)]">
          {/* Top-Left Bracket */}
          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-[3px] border-l-[3px] border-[#00e599] rounded-tl-lg" />
          {/* Top-Right Bracket */}
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-[3px] border-r-[3px] border-[#00e599] rounded-tr-lg" />
          {/* Bottom-Left Bracket */}
          <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-[3px] border-l-[3px] border-[#00e599] rounded-bl-lg" />
          {/* Bottom-Right Bracket */}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-[3px] border-r-[3px] border-[#00e599] rounded-br-lg" />

          {/* Receipt icon card with jagged bottom */}
          <div className="w-32 h-40 bg-gradient-to-b from-[#14231d] to-[#0d1713] border border-[#1c3228] rounded-xl p-3 flex flex-col justify-between shadow-md">
            <div>
              {/* Receipt Header Jagged bar */}
              <div className="flex items-center justify-between border-b border-[#223d32] pb-2 mb-2">
                <span className="text-[10px] font-mono tracking-widest text-slate-400">CH..........</span>
                <span className="w-2 h-2 rounded-full bg-[#00e599]" />
              </div>
              {/* Item mock lines */}
              <div className="space-y-2 mt-2">
                <div className="w-16 h-1.5 bg-slate-500/50 rounded-full" />
                <div className="w-24 h-1.5 bg-slate-400/70 rounded-full" />
                <div className="w-14 h-1.5 bg-slate-500/50 rounded-full" />
                <div className="w-20 h-1.5 bg-slate-400/70 rounded-full" />
              </div>
            </div>

            {/* Total Line */}
            <div className="border-t border-[#223d32] pt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">₹</span>
              <div className="w-10 h-2 bg-[#00e599]/80 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3 pb-2">
        <button
          onClick={onGetStarted}
          className="w-full py-3.5 px-6 rounded-full bg-[#00e599] text-[#060b09] font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[#00ffaa] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,229,153,0.35)] cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={onLoginGoogle}
          className="w-full py-3 px-6 rounded-full bg-[#0e1714] border border-[#182822] text-slate-200 text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-[#13221d] hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          {/* Multi-color Google G */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.24 0 10.06 0 12s.45 3.76 1.25 5.39l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-[11px] text-center text-slate-500 pt-1">
          By continuing, you agree to our{' '}
          <a href="#" className="underline text-slate-400 hover:text-slate-300">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="underline text-slate-400 hover:text-slate-300">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};
