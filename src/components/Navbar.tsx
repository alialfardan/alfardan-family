import React from 'react';
import { ActiveTab, FamilyTreeProcessed } from '../types/family';
import {
  Plus,
  GitBranch,
  BookOpen,
  BarChart3,
  Users,
  Download,
  FileText,
  Lock,
  ShieldCheck,
  Award,
  UploadCloud,
  Phone,
  Bell
} from 'lucide-react';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onOpenAddModal: () => void;
  onOpenBackupModal: () => void;
  hasUnsavedChanges?: boolean;
  onShowToast?: (message: string) => void;
  isAuthorized?: boolean;
  onOpenAuthModal?: () => void;
  onOpenSearchResults?: (query: string) => void;
  onSaveForPublish?: () => void;
  isSavingForPublish?: boolean;
  isNotificationsGranted?: boolean;
  onEnableNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  registry,
  onSelectPerson,
  onOpenAddModal,
  onOpenBackupModal,
  hasUnsavedChanges = false,
  onShowToast,
  isAuthorized = false,
  onOpenAuthModal,
  onOpenSearchResults,
  onSaveForPublish,
  isSavingForPublish = false,
  isNotificationsGranted = false,
  onEnableNotifications,
}) => {
  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs font-['Readex_Pro',sans-serif]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
            {/* Logo & Family Brand */}
            <div
              className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0 cursor-pointer"
              onClick={() => onTabChange('home')}
            >
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden ring-2 ring-amber-500/30 shadow-md flex-shrink-0">
                <img
                  src="/fardan-logo.jpg"
                  alt="شعار عائلة الفردان"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-lg font-bold font-['Alexandria'] text-slate-900 tracking-tight leading-tight">
                    شجرة عائلة الفردان
                  </h1>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    النسخة المعتمدة
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="متصل بقاعدة البيانات السحابية الحية (Firestore)">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    مزامنة لحظية
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    ذرية الفردان الكرزكاني · {registry.stats.totalCount} اسماً
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Notification Toggle, Admin Controls & Visitor Login */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 justify-end flex-wrap sm:flex-nowrap">
              {/* Notification Enable Button for Visitors (Auto-hides once granted) */}
              {!isNotificationsGranted && onEnableNotifications && (
                <button
                  onClick={onEnableNotifications}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="تفعيل إشعارات شجرة العائلة الفورية على هاتفك"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
                  <span className="hidden xs:inline">🔔 تفعيل إشعارات الشجرة</span>
                  <span className="xs:hidden">🔔 إشعارات</span>
                </button>
              )}
              {/* Authorized Admin Controls vs Visitor Status */}
              {isAuthorized ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Publish & Sync Button (Authorized Admin Only) */}
                  {onSaveForPublish && (
                    <button
                      onClick={onSaveForPublish}
                      disabled={isSavingForPublish}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex-shrink-0 cursor-pointer disabled:opacity-50 border border-emerald-500/50"
                      title="اعتماد وحفظ كافة التعديلات ومزامنتها سحابياً لجميع أفراد العائلة فوراً"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-200" />
                      <span className="inline font-bold">{isSavingForPublish ? 'جارِ النشر...' : 'نشر التعديلات 🚀'}</span>
                    </button>
                  )}

                  {/* Add Member Button - Authorized Only */}
                  <button
                    onClick={onOpenAddModal}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex-shrink-0"
                    title="إضافة فرد جديد"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden xs:inline sm:inline">إضافة فرد</span>
                  </button>

                  {/* Backup Button - Authorized Only */}
                  <button
                    onClick={onOpenBackupModal}
                    className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                    title="النسخ الاحتياطي وإدارة البيانات"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Admin Badge / Logout Trigger */}
                  <button
                    onClick={onOpenAuthModal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                    title="وضع المشرف مفعّل - اضغط للإعدادات أو تسجيل الخروج"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="inline">المشرف</span>
                  </button>
                </div>
              ) : (
                /* Visitor Admin Access Lock Button - Always Clearly Visible & Clickable */
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all text-xs sm:text-sm font-bold flex-shrink-0 shadow-2xs active:scale-95 cursor-pointer"
                  title="بوابة المشرفين والمصرح لهم فقط"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-700" />
                  <span className="inline">دخول المشرف</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fixed Right-Side Navigation Rail - Exactly on the Right Side of Screen for all devices */}
      <aside
        aria-label="التنقل الرئيسي"
        className="fixed right-0 top-16 bottom-0 z-40 w-16 sm:w-20 lg:w-22 bg-white/95 backdrop-blur-md border-l border-slate-200/90 shadow-[-4px_0_20px_rgba(0,0,0,0.06)] flex flex-col justify-around items-center py-2 px-1 select-none"
      >
        {/* 1. الرئيسية وتصفح الذرية */}
        <button
          onClick={() => onTabChange('home')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all ${
            currentTab === 'home'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="الرئيسية وتصفح الذرية"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'home'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            الرئيسية
          </span>
        </button>

        {/* 2. الشجرة التفاعلية */}
        <button
          onClick={() => onTabChange('tree')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all ${
            currentTab === 'tree'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="الشجرة التفاعلية"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'tree'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <GitBranch className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            الشجرة
          </span>
        </button>

        {/* 3. دليل الأسماء */}
        <button
          onClick={() => onTabChange('directory')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all ${
            currentTab === 'directory'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="دليل الأسماء"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'directory'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            الدليل
          </span>
        </button>

        {/* 4. أعلام العائلة */}
        <button
          onClick={() => onTabChange('notables')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'notables'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="أعلام ورجالات عائلة الفردان"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'notables'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            أعلام العائلة
          </span>
        </button>

        {/* 5. الوثائق (الوثيقة الأصلية والصور التاريخية الموحدة) */}
        <button
          onClick={() => onTabChange('doc')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'doc' || currentTab === 'photos'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="الوثائق والمخطوطات والصور التاريخية"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'doc' || currentTab === 'photos'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            الوثائق
          </span>
        </button>

        {/* 6. الإحصاءات */}
        <button
          onClick={() => onTabChange('about')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all ${
            currentTab === 'about'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="الإحصاءات وتاريخ العائلة"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'about'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            الإحصاءات
          </span>
        </button>

        {/* 7. التواصل وفريق العمل */}
        <button
          onClick={() => onTabChange('contact')}
          className={`w-full flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-2xl transition-all ${
            currentTab === 'contact'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
          title="صفحة التواصل وفريق العمل والتحقيق"
        >
          <div
            className={`p-1.5 rounded-2xl transition-all ${
              currentTab === 'contact'
                ? 'bg-emerald-800 text-white shadow-md scale-105'
                : 'text-slate-600'
            }`}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-center leading-tight mt-0.5 truncate max-w-full">
            التواصل
          </span>
        </button>


        {/* زر نشر واعتماد التعديلات في الهاتف للمشرف فقط */}
        {isAuthorized && onSaveForPublish && (
          <button
            onClick={onSaveForPublish}
            disabled={isSavingForPublish}
            className="w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl bg-gradient-to-b from-emerald-700 to-emerald-800 text-white shadow-sm active:scale-95 transition-all my-1 cursor-pointer disabled:opacity-50"
            title="نشر واعتماد كافة التعديلات سحابياً فوراً"
          >
            <div className="p-1 rounded-xl bg-white/20 text-white">
              <UploadCloud className="w-3.5 h-3.5 text-emerald-100" />
            </div>
            <span className="text-[8px] font-bold tracking-tight text-center leading-tight mt-1 truncate max-w-full">
              {isSavingForPublish ? 'نشر...' : 'نشر 🚀'}
            </span>
          </button>
        )}

        {/* زر دخول / حالة المشرف في الهاتف */}
        <button
          onClick={onOpenAuthModal}
          className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all active:scale-95 ${
            isAuthorized ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={isAuthorized ? 'وضع المشرف المصرح له' : 'دخول المشرف'}
        >
          <div className={`p-1.5 rounded-xl ${isAuthorized ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}>
            {isAuthorized ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-[8px] font-bold tracking-tight text-center leading-tight truncate max-w-full">
            {isAuthorized ? 'مشرف' : 'دخول'}
          </span>
        </button>
      </aside>
    </>
  );
};
