import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles } from 'lucide-react';

interface SmartInstallBannerProps {
  onInstall: () => void;
  isInstalled: boolean;
}

export const SmartInstallBanner: React.FC<SmartInstallBannerProps> = ({
  onInstall,
  isInstalled
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dismiss_fardan_pwa_banner') === 'true';
    } catch {
      return false;
    }
  });

  // If already running in standalone mode or already dismissed in this session, do not render
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('dismiss_fardan_pwa_banner', 'true');
    } catch {}
  };

  return (
    <aside
      aria-label="تثبيت تطبيق شجرة عائلة الفردان"
      className="relative z-30 w-full bg-gradient-to-r from-[#064e3b] via-[#043d2e] to-[#0f172a] text-white border-b border-amber-500/30 shadow-md py-2 px-3 sm:px-6 transition-all font-['Readex_Pro',sans-serif]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Side (RTL): Logo + Text */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src="/logo.png"
              alt="شعار شجرة الفردان"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white/10 backdrop-blur-xs p-1 border border-amber-400/40 shadow-xs"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-slate-900" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                ثبّت تطبيق شجرة عائلة الفردان على هاتفك للوصول السريع
              </p>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Smartphone className="w-3 h-3" />
                تطبيق خفيف
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80 hidden sm:block">
              تصفح سلس، تحميل فوري، ووصول مباشر لنسب وتاريخ العائلة بدون متجر
            </p>
          </div>
        </div>

        {/* Right Side (RTL): Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onInstall}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-xs shadow-md shadow-amber-900/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📲 تثبيت التطبيق</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إخفاء الشريط مؤقتاً"
            aria-label="إغلاق شريط التثبيت"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
