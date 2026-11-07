import React from 'react';
import { X, HeartHandshake, ShieldAlert } from 'lucide-react';

interface WelcomeDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeDisclaimerModal: React.FC<WelcomeDisclaimerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white/95 rounded-3xl border border-emerald-100/80 shadow-2xl p-6 sm:p-8 space-y-6 text-center font-['Readex_Pro',sans-serif] overflow-hidden transform transition-all duration-300 scale-100">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-700 via-amber-500 to-emerald-800" />

        {/* Close Button ('X') in Top Corner */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="إغلاق التنويه"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon / Emblem Header */}
        <div className="flex flex-col items-center pt-2 space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-100 to-amber-100 flex items-center justify-center border border-emerald-200/60 shadow-inner">
              <img
                src="/logo.png"
                alt="شعار عائلة الفردان"
                className="w-10 h-10 object-contain drop-shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <HeartHandshake className="w-8 h-8 text-emerald-800 hidden only:block" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              شجرة عائلة الفردان الكرزكاني
            </span>
            <h2
              id="disclaimer-title"
              className="text-xl sm:text-2xl font-extrabold font-['Alexandria'] text-slate-900 pt-1"
            >
              تنويه وتوضيح لأفراد عائلة الفردان الكرام
            </h2>
          </div>
        </div>

        {/* Disclaimer Text Body */}
        <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60 text-slate-700 text-xs sm:text-sm leading-relaxed text-justify space-y-3">
          <p>
            إن الجهود المبذولة في إعداد هذا الموقع وربط الأنساب ببعضها البعض من ذرية إلى ذرية هي ثمرة عمل واجتهاد مستمر؛ لذا فمن الوارد وجود بعض الأخطاء أو النواقص غير المقصودة.
          </p>
          <p>
            نود إحاطتكم علماً بأن البيانات ما زالت قيد المراجعة والتدقيق المستمر، وهذا الموقع قابل للتحديث والإضافة في أي وقت. نرجو منكم المعذرة عن أي سهو، ونسعد دائماً بملاحظاتكم وتصحيحاتكم عبر قسم التواصل.
          </p>
        </div>

        {/* Bottom Prominent Button */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>فهمت ذلك</span>
          </button>
        </div>
      </div>
    </div>
  );
};
