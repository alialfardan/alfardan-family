import React from 'react';
import { X, Share2, PlusSquare, Smartphone, Check, Laptop, Sparkles } from 'lucide-react';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 font-['Readex_Pro',sans-serif]">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                  <Smartphone className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold font-['Alexandria'] text-white">
                  تثبيت التطبيق على آيفون وآيباد
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  متصفح Safari (سفاري)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body with Steps */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <img
              src="/logo.png"
              alt="شعار شجرة الفردان"
              className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-emerald-300 shadow-2xs"
            />
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                شجرة عائلة الفردان التفاعلية
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                تطبيق مباشر وسريع بدون الحاجة لمتجر App Store
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                1️⃣
              </div>
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>اضغط على زر المشاركة</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-mono font-bold">
                    <Share2 className="w-3 h-3 text-blue-600" /> Share
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ستجد زر المشاركة في الشريط السفلي لمتصفح سفاري (أو العلوي في الآيباد).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                2️⃣
              </div>
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>اختر «إضافة إلى الشاشة الرئيسية»</span>
                  <PlusSquare className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  مرر القائمة لأسفل ثم اضغط <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Add to Home Screen)، ثم اضغط <strong>«إضافة»</strong> (Add) في الزاوية العلوية.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>سيظهر التطبيق فوراً كأيقونة مستقلة على شاشة هاتفك مع إمكانية التصفح السريع.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer text-center"
          >
            فهمت، حسناً
          </button>
        </div>
      </div>
    </div>
  );
};

interface ManualInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualInstallModal: React.FC<ManualInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 font-['Readex_Pro',sans-serif]">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                  <Laptop className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold font-['Alexandria'] text-white">
                  تثبيت التطبيق على جهازك
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  كروم / إيدج / سامسونج إنترنت
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <img
              src="/logo.png"
              alt="شعار شجرة الفردان"
              className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-emerald-300 shadow-2xs"
            />
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                شجرة عائلة الفردان التفاعلية
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                تطبيق الويب التقدمي المعتمد (PWA)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>على هواتف أندرويد (Google Chrome / Samsung):</span>
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                اضغط على قائمة الثلاث نقاط <strong>(⋮)</strong> في أعلى أو أسفل المتصفح، ثم اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-emerald-700" />
                <span>على أجهزة الكمبيوتر (Chrome / Edge):</span>
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                اضغط على أيقونة التثبيت <strong>(⊕ أو الحاسوب)</strong> في شريط عنوان المتصفح بالأعلى بجانب الرابط، ثم اضغط <strong>«تثبيت»</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer text-center"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
