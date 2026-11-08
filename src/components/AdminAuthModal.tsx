import React, { useState } from 'react';
import { X, Lock, Unlock, Shield, ShieldCheck, KeyRound, AlertCircle, LogOut } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthorized: boolean;
  onAuthorize: () => void;
  onDeauthorize: () => void;
  onShowToast?: (message: string) => void;
}

// Official Admin Credentials - Strictly Only These Are Permitted
const REQUIRED_USERNAME = 'alfardan2026';
const REQUIRED_PASSWORD = 'ali34112119ali';

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  isAuthorized,
  onAuthorize,
  onDeauthorize,
  onShowToast,
}) => {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const sanitizeCredential = (val: string) =>
    val
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
      .trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputUser = sanitizeCredential(username).toLowerCase();
    const inputPass = sanitizeCredential(passcode);

    if (!inputUser || !inputPass) {
      setError('يرجى إدخال اسم المستخدم وكلمة السر.');
      return;
    }

    if (inputUser === REQUIRED_USERNAME && inputPass === REQUIRED_PASSWORD) {
      onAuthorize();
      setError(null);
      setPasscode('');
      setUsername('');
      if (onShowToast) {
        onShowToast('مرحباً بك! تم تسجيل الدخول بصلاحية المشرف وتفعيل المزامنة اللحظية.');
      }
      onClose();
    } else {
      setError('اسم المستخدم أو كلمة السر غير صحيحة.');
    }
  };

  const handleLogout = () => {
    onDeauthorize();
    if (onShowToast) {
      onShowToast('تم تسجيل الخروج والعودة إلى وضع الزائر (للمشاهدة فقط).');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isAuthorized ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isAuthorized ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold font-['Alexandria'] text-slate-900">
                {isAuthorized ? 'وضع المشرف المصرح له' : 'بوابة المشرفين والمصرح لهم'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAuthorized ? 'صلاحيات كاملة للتحكم والتعديل' : 'حماية بيانات الشجرة من تعديل الزوار'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isAuthorized ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold font-['Alexandria'] text-slate-900">
                  أنت مسجل حالياً بصلاحية المشرف
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  جميع أدوات التحكم ظاهرة لديك الآن: إضافة الأفراد، الصور، الملاحظات، التعديل والحذف، وإدارة النسخ الاحتياطي.
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 text-right">
                <p className="font-semibold mb-1">تذكير:</p>
                <p className="text-[11px] leading-relaxed">
                  الزوار العاديون يرون الموقع في وضع المشاهدة فقط دون أي أزرار أو أدوات للتحكم أو التعديل.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all"
                >
                  متابعة الإدارة
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>قفل / خروج لوضع الزائر</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-700" />
                  <span>الموقع في وضع المشاهدة للزوار</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  تم حجب كافة أدوات التحكم (الإضافة، التعديل، الحذف، والصور والملاحظات) عن الزوار لضمان عدم العبث ببيانات الشجرة المعتمدة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="أدخل اسم المستخدم المصرح به"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all mb-3 font-mono text-left"
                  autoFocus
                />

                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور / الرقم السري:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="current-password"
                    value={passcode}
                    onChange={e => {
                      setPasscode(e.target.value);
                      setError(null);
                    }}
                    placeholder="أدخل الرقم السري للمشرف"
                    className="w-full pr-10 pl-16 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-mono text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-2 text-[10px] text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-200/60 rounded-md"
                  >
                    {showPassword ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <Unlock className="w-4 h-4 text-emerald-300" />
                  <span>دخول وتفعيل التحكم</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
