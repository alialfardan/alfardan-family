import React from 'react';
import { X, Download, Upload, RotateCcw, ShieldCheck, Github, Globe } from 'lucide-react';
import { FamilyState } from '../types/family';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToDefaults: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  state: _state,
  onExport,
  onImport,
  onResetToDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold font-['Alexandria'] text-slate-900">
              النسخ الاحتياطي والنشر للموقع الرسمي
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-600 leading-relaxed overflow-y-auto">
          {/* GitHub & Official Domain Sync Card */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl border border-emerald-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold font-['Alexandria'] text-sm text-emerald-300">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>النشر المباشر للموقع الرسمي</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] rounded-full font-bold">
                alfardanfamily.com
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-normal">
              المستودع: <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono">alialfardan/alfardan-family</code>
            </p>

            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-emerald-200 font-bold text-xs">
              <Github className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>اضغط أداة GitHub أعلى AI Studio ثم Commit &amp; Push</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <h4 className="font-bold text-slate-800 text-xs">خيارات حفظ البيانات المحلية:</h4>

            {/* Export */}
            <button
              onClick={onExport}
              className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-2xl font-bold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-emerald-700" />
                <div className="text-right">
                  <span className="block text-sm">تنزيل نسخة احتياطية (JSON)</span>
                  <span className="text-[11px] font-normal text-emerald-700">حفظ ملف كامل يحتوي كافة البيانات والصور</span>
                </div>
              </div>
            </button>

            {/* Import */}
            <label className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-2xl font-bold cursor-pointer transition-all">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-blue-700" />
                <div className="text-right">
                  <span className="block text-sm">استيراد ملف نسخة احتياطية</span>
                  <span className="text-[11px] font-normal text-blue-700">تحميل ملف سابق واستعادة كافة البيانات</span>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={onImport}
                className="hidden"
              />
            </label>

            {/* Reset Defaults */}
            <button
              onClick={() => {
                if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين الشجرة إلى بيانات الوثيقة الأصلية؟')) {
                  onResetToDefaults();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-2xl font-bold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5" />
                <div className="text-right">
                  <span className="block text-sm">استعادة بيانات الوثيقة الأصلية</span>
                  <span className="text-[11px] font-normal text-slate-500">الرجوع للشجرة التأسيسية وإلغاء التعديلات</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
