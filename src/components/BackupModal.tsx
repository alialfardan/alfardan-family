import React, { useState, useEffect } from 'react';
import { X, Download, Upload, RotateCcw, ShieldCheck, Github, Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FamilyState } from '../types/family';
import { apiFetch } from '../utils/apiClient';

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
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [unpushedCount, setUnpushedCount] = useState(0);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/github-sync-status')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setHasToken(!!data.hasToken);
          setUnpushedCount(data.unpushedCount || 0);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSaveTokenAndPublish = async () => {
    if (!tokenInput.trim() && !hasToken) {
      setStatusMessage({ text: 'يرجى إدخال رمز الوصول الشخصي (GitHub Token)', type: 'error' });
      return;
    }
    setIsSavingToken(true);
    setStatusMessage({ text: 'جارِ الاتصال بـ GitHub ودفع التعديلات...', type: 'info' });

    try {
      const res = await apiFetch('/api/publish-to-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() || undefined })
      });
      const data = await res.json();
      if (data.isPushed) {
        setHasToken(true);
        setUnpushedCount(0);
        setTokenInput('');
        setStatusMessage({ text: 'تم النشر بنجاح إلى GitHub! الموقع الرسمي alfardanfamily.com يتحدث الآن تلقائياً 🚀', type: 'success' });
      } else {
        setStatusMessage({ text: data.message || 'تعذر النشر إلى GitHub، يرجى التأكد من صلاحيات الرمز (repo scope)', type: 'error' });
      }
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'حدث خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handlePublishDirect = async () => {
    setIsPublishing(true);
    setStatusMessage({ text: 'جارِ دفع كافة التحديثات إلى GitHub...', type: 'info' });
    try {
      const res = await apiFetch('/api/publish-to-github', { method: 'POST' });
      const data = await res.json();
      if (data.isPushed) {
        setUnpushedCount(0);
        setStatusMessage({ text: 'تم النشر وتحديث الموقع الرسمي alfardanfamily.com بنجاح! 🚀', type: 'success' });
      } else {
        setStatusMessage({ text: data.message || 'تعذر النشر، تأكد من صلاحية رمز GitHub', type: 'error' });
      }
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'حدث خطأ في الاتصال', type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

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
              {unpushedCount > 0 ? (
                <span className="block mt-1 text-amber-300 font-bold">
                  ⚠️ يوجد تعديلات معتمدة محلياً (1273 اسماً والصور الحديثة) بانتظار الرفع إلى الموقع الرسمي.
                </span>
              ) : (
                <span className="block mt-1 text-emerald-300 font-bold">
                  ✓ البيانات جاهزة ومتزامنة في النظام.
                </span>
              )}
            </p>

            {/* Token input or Push Action */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">رمز GitHub Personal Access Token:</span>
                {hasToken ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    الرمز محفوظ ومفعل
                  </span>
                ) : (
                  <span className="text-amber-400">مطلوب للرفع الآلي</span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={hasToken ? "تم حفظ الرمز (أدخل رمزاً جديداً للتحديث)..." : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 bg-black/40 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 font-mono outline-none"
                />
                <button
                  onClick={handleSaveTokenAndPublish}
                  disabled={isSavingToken || (!tokenInput.trim() && !hasToken)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md"
                >
                  {isSavingToken ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جارِ النشر...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-3.5 h-3.5" />
                      <span>{hasToken ? "نشر وتحديث 🚀" : "حفظ ونشر 🚀"}</span>
                    </>
                  )}
                </button>
              </div>

              {hasToken && !tokenInput.trim() && (
                <button
                  onClick={handlePublishDirect}
                  disabled={isPublishing}
                  className="w-full py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جارِ دفع التحديثات إلى GitHub Pages...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-200" />
                      <span>تحديث الموقع الرسمي alfardanfamily.com الآن 🚀</span>
                    </>
                  )}
                </button>
              )}

              {statusMessage && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : statusMessage.type === 'error'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}
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
                  <span className="text-[11px] font-normal text-emerald-700">حفظ ملف كامل يحتوي كافة البيانات (1273 اسماً) والصور</span>
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
