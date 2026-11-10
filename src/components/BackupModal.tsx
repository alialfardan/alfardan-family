import React, { useState, useEffect } from 'react';
import { X, Download, Upload, RotateCcw, ShieldCheck, Github, Globe, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { FamilyState } from '../types/family';
import { apiFetch } from '../utils/apiClient';
import { RAW_TREE, deduplicateMembers } from '../data/treeManager';

export const GITHUB_PAT_STORAGE_KEY = 'fardan_github_pat';

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
  state,
  onExport,
  onImport,
  onResetToDefaults,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(GITHUB_PAT_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [unpushedCount, setUnpushedCount] = useState(0);
  const [unpushedFiles, setUnpushedFiles] = useState<string[]>([]);
  const [latestCommitSha, setLatestCommitSha] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [pushedFilesList, setPushedFilesList] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let storedToken = '';
    try {
      storedToken = localStorage.getItem(GITHUB_PAT_STORAGE_KEY) || '';
    } catch {}

    apiFetch('/api/github-sync-status', {
      headers: storedToken ? { 'X-GitHub-Token': storedToken } : undefined
    })
      .then(r => r.json())
      .then(data => {
        if (data) {
          const tokenConfigured = Boolean(data.hasToken || storedToken);
          setHasToken(tokenConfigured);
          setShowTokenInput(!tokenConfigured);
          setUnpushedCount(data.unpushedCount || 0);
          setUnpushedFiles(Array.isArray(data.unpushedFiles) ? data.unpushedFiles : []);
          if (data.latestCommitSha) {
            setLatestCommitSha(data.latestCommitSha);
          }
          if (data.tokenError) {
            setStatusMessage({
              text: `تنبيه من GitHub: ${data.tokenError}`,
              type: 'error'
            });
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const executeGitHubPublish = async (explicitToken?: string) => {
    let activeToken = explicitToken?.trim() || '';
    if (!activeToken) {
      try {
        activeToken = localStorage.getItem(GITHUB_PAT_STORAGE_KEY) || '';
      } catch {}
    }

    if (!activeToken && !hasToken) {
      setStatusMessage({ text: 'يرجى إدخال رمز الوصول الشخصي (GitHub Token بصلاحية repo)', type: 'error' });
      setShowTokenInput(true);
      return;
    }

    setIsPublishing(true);
    setPushedFilesList([]);
    setStatusMessage({ text: '⏳ جاري تحويل الصور ورفع الملفات فعلياً إلى GitHub...', type: 'info' });

    try {
      const cleanPhotos = { ...(state.photos || {}) };
      for (const [k, v] of Object.entries(cleanPhotos)) {
        if (!v || !v.trim()) {
          delete cleanPhotos[k];
        }
      }

      const res = await apiFetch('/api/publish-to-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { 'X-GitHub-Token': activeToken } : {})
        },
        body: JSON.stringify({
          token: activeToken || undefined,
          treeData: RAW_TREE,
          replacePhotos: true,
          isPublishAction: true,
          familyData: {
            ...state,
            members: deduplicateMembers(state.members || []),
            photos: cleanPhotos
          }
        })
      });

      const data = await res.json();
      if (data.isPushed) {
        if (activeToken) {
          try {
            localStorage.setItem(GITHUB_PAT_STORAGE_KEY, activeToken);
          } catch {}
        }
        setHasToken(true);
        setShowTokenInput(false);
        setTokenInput('');
        setUnpushedCount(0);
        setUnpushedFiles([]);
        if (data.commitSha) {
          setLatestCommitSha(data.commitSha);
        }
        const pushed: string[] = Array.isArray(data.filesPushed) ? data.filesPushed : [];
        setPushedFilesList(pushed);
        const shortSha = data.commitSha ? data.commitSha.slice(0, 7) : '';
        if (pushed.length > 0) {
          setStatusMessage({
            text: `✓ تم رفع ${pushed.length} ملف فعلياً إلى GitHub بنجاح ${shortSha ? `(Commit: ${shortSha})` : ''}! يتحدث الموقع الرسمي alfardanfamily.com الآن تلقائياً 🚀`,
            type: 'success'
          });
        } else {
          setStatusMessage({
            text: `✓ جميع الملفات والصور على GitHub مطابقة لأحدث نسخة بالفعل ${shortSha ? `(Commit: ${shortSha})` : ''}`,
            type: 'success'
          });
        }
      } else {
        if (!data.hasToken) {
          setHasToken(false);
          setShowTokenInput(true);
        }
        setStatusMessage({
          text: data.message || data.error || 'تعذر الرفع إلى GitHub، يرجى التأكد من صلاحيات الرمز (repo scope)',
          type: 'error'
        });
      }
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'حدث خطأ في الاتصال بالخادم أثناء الرفع إلى GitHub', type: 'error' });
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
                <span>الرفع المباشر إلى GitHub والموقع الرسمي</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] rounded-full font-bold">
                alfardanfamily.com
              </span>
            </div>

            <div className="text-[11px] text-slate-300 leading-normal space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  المستودع: <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono">alialfardan/alfardan-family</code>
                </span>
                {latestCommitSha && (
                  <span className="text-[10px] font-mono text-slate-400">
                    آخر Commit: {latestCommitSha.slice(0, 7)}
                  </span>
                )}
              </div>

              {unpushedCount > 0 ? (
                <div className="mt-1.5 p-2 bg-amber-500/15 border border-amber-400/30 rounded-xl text-amber-200">
                  <span className="font-bold block">
                    ⚠️ يوجد {unpushedCount} ملف معدل بانتظار الرفع إلى GitHub:
                  </span>
                  <div className="mt-1 max-h-20 overflow-y-auto font-mono text-[10px] text-amber-100 space-y-0.5">
                    {unpushedFiles.map((f, i) => (
                      <div key={i}>• {f}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="block mt-1 text-emerald-300 font-bold">
                  ✓ الملفات متزامنة وجاهزة للنشر المباشر.
                </span>
              )}
            </div>

            {/* Token Status & Input / Direct Push Button */}
            <div className="pt-1 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رمز GitHub Personal Access Token:</span>
                </span>
                {hasToken ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      محفوظ ومفعل
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTokenInput(!showTokenInput)}
                      className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      {showTokenInput ? 'إخفاء' : 'تغيير الرمز'}
                    </button>
                  </div>
                ) : (
                  <span className="text-amber-400 font-bold">مطلوب للرفع المباشر</span>
                )}
              </div>

              {(!hasToken || showTokenInput) && (
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={hasToken ? 'أدخل رمزاً جديداً (ghp_...) لتحديثه' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 font-mono outline-none"
                  />
                  <button
                    onClick={() => executeGitHubPublish(tokenInput)}
                    disabled={isPublishing || (!tokenInput.trim() && !hasToken)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Github className="w-3.5 h-3.5" />
                        <span>حفظ ورفع لـ GitHub 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {hasToken && !showTokenInput && (
                <button
                  onClick={() => executeGitHubPublish()}
                  disabled={isPublishing}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تحويل الصور ورفع الملفات إلى GitHub...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4 text-white" />
                      <span>رفع التعديلات والصور مباشرة إلى GitHub الآن 🚀</span>
                    </>
                  )}
                </button>
              )}

              {statusMessage && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-bold space-y-1.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : statusMessage.type === 'error'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {statusMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : statusMessage.type === 'info' ? (
                      <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{statusMessage.text}</span>
                  </div>

                  {pushedFilesList.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-emerald-500/30 font-mono text-[10px] text-emerald-200 max-h-28 overflow-y-auto space-y-0.5">
                      <div className="font-sans font-bold text-emerald-300 mb-0.5">الملفات التي تم رفعها إلى GitHub:</div>
                      {pushedFilesList.map((f, idx) => (
                        <div key={idx}>✓ {f}</div>
                      ))}
                    </div>
                  )}
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
