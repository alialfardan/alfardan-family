import React from 'react';
import { X, Bell, Download, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

interface NotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallApp: () => void;
}

export const NotificationGuideModal: React.FC<NotificationGuideModalProps> = ({
  isOpen,
  onClose,
  onInstallApp
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 font-['Readex_Pro',sans-serif]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100%',
        zIndex: 70
      }}
    >
      <div
        className="relative w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col box-border"
        dir="rtl"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white px-5 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                  <Bell className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold font-['Alexandria'] text-white">
                  تفعيل إشعارات شجرة العائلة
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  تنبيهات فورية للمناسبات وتحديثات النسب
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

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80">
            <Smartphone className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
              <strong>تنبيه هام لوصول الإشعارات:</strong> يرجى تنزيل وتثبيت تطبيق شجرة العائلة على شاشتك الرئيسية أولاً، ثم افتح البرنامج من شاشتك الرئيسية وفعل خدمة الإشعارات من داخله لضمان وصول التنبيهات إلى هاتفك.
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>الإشعارات الفورية على الآيفون تتطلب تثبيت التطبيق على الشاشة الرئيسية (وفق متطلبات نظام Apple iOS).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>بعد تثبيت التطبيق بضغطة زر، يمكنك تفعيل الإشعارات بلمسة واحدة.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onInstallApp();
              }}
              className="w-full sm:flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>📲 تثبيت التطبيق الآن</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
