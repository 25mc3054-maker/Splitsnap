import React from 'react';

interface SplitSnapLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
}

export const SplitSnapLogo: React.FC<SplitSnapLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  showSubtitle = false,
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const strokeWidth = size === 'xl' || size === 'lg' ? 2.5 : 2;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Neon Mint Scanner Symbol */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconDimensions}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-[#00e599] drop-shadow-[0_0_12px_rgba(0,229,153,0.65)]"
        >
          {/* Top-left corner */}
          <path
            d="M8 17V12C8 9.79086 9.79086 8 12 8H17"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap="round"
          />
          {/* Top-right corner */}
          <path
            d="M31 8H36C38.2091 8 40 9.79086 40 12V17"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap="round"
          />
          {/* Bottom-right corner */}
          <path
            d="M40 31V36C40 38.2091 38.2091 40 36 40H31"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap="round"
          />
          {/* Bottom-left corner */}
          <path
            d="M17 40H12C9.79086 40 8 38.2091 8 36V31"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.5}
            strokeLinecap="round"
          />

          {/* Central receipt / scan sliders */}
          <line
            x1="16"
            y1="20"
            x2="32"
            y2="20"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.3}
            strokeLinecap="round"
          />
          <circle cx="21" cy="20" r="2.5" fill="currentColor" />

          <line
            x1="16"
            y1="28"
            x2="32"
            y2="28"
            stroke="currentColor"
            strokeWidth={strokeWidth * 1.3}
            strokeLinecap="round"
          />
          <circle cx="27" cy="28" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold tracking-tight text-white leading-tight ${
              size === 'xl'
                ? 'text-3xl'
                : size === 'lg'
                ? 'text-2xl'
                : size === 'md'
                ? 'text-xl'
                : 'text-base'
            }`}
          >
            SplitSnap
          </span>
          {showSubtitle && (
            <span className="text-xs sm:text-sm font-medium tracking-wide text-[#00e599]">
              Scan • Split • Settle
            </span>
          )}
        </div>
      )}
    </div>
  );
};
