import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  MessageCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Save,
  Lock,
  Sparkles,
  ExternalLink,
  Info,
  UserPlus,
  GitBranch,
  Image,
  UserCheck,
  Smartphone,
  Download,
  Bell,
  Send,
  Megaphone
} from 'lucide-react';
import { ContactInfo } from '../types/family';
import { DEFAULT_CONTACT_INFO, resolveContactInfo } from '../data/treeManager';

interface ContactCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactInfo?: ContactInfo;
  onSaveContactInfo?: (info: ContactInfo) => void;
  isAuthorized: boolean;
  onOpenAuthModal?: () => void;
  onInstallPWA?: () => void;
  isPWAInstalled?: boolean;
  isNotificationsGranted?: boolean;
  onEnableNotifications?: () => void;
  onSendNotification?: (title: string, body: string) => Promise<{ success: boolean; error?: string }>;
  onShowToast?: (msg: string) => void;
}

export const ContactCreditsModal: React.FC<ContactCreditsModalProps> = ({
  isOpen,
  onClose,
  contactInfo,
  onSaveContactInfo,
  isAuthorized,
  onOpenAuthModal,
  onInstallPWA,
  isPWAInstalled,
  isNotificationsGranted = false,
  onEnableNotifications,
  onSendNotification,
  onShowToast
}) => {
  // Resolve values with rock-solid fallbacks
  const safeInfo = resolveContactInfo(contactInfo);
  const currentEmail = safeInfo.email || DEFAULT_CONTACT_INFO.email!;
  const currentWhatsapp = safeInfo.whatsapp || DEFAULT_CONTACT_INFO.whatsapp!;
  const currentVerifiedBy = safeInfo.verifiedBy || DEFAULT_CONTACT_INFO.verifiedBy!;
  const lines = safeInfo.creditsLines || DEFAULT_CONTACT_INFO.creditsLines!;

  const [isEditing, setIsEditing] = useState(false);
  const [pendingEditAfterAuth, setPendingEditAfterAuth] = useState(false);
  const [email, setEmail] = useState(currentEmail);
  const [whatsapp, setWhatsapp] = useState(currentWhatsapp);
  const [verifiedBy, setVerifiedBy] = useState(currentVerifiedBy);
  const [line1, setLine1] = useState(lines[0] || '');
  const [line2, setLine2] = useState(lines[1] || '');
  const [line3, setLine3] = useState(lines[2] || '');

  // Push Notification Form State for Admin
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSentStatus, setNotifSentStatus] = useState<string | null>(null);

  // Sync local form state when contactInfo updates from Firebase
  useEffect(() => {
    if (!isEditing) {
      setEmail(currentEmail);
      setWhatsapp(currentWhatsapp);
      setVerifiedBy(currentVerifiedBy);
      setLine1(lines[0] || '');
      setLine2(lines[1] || '');
      setLine3(lines[2] || '');
    }
  }, [currentEmail, currentWhatsapp, currentVerifiedBy, lines, isEditing]);

  // Automatically open edit mode if admin clicked "تعديل" and just finished logging in
  useEffect(() => {
    if (isAuthorized && pendingEditAfterAuth) {
      setEmail(currentEmail);
      setWhatsapp(currentWhatsapp);
      setVerifiedBy(currentVerifiedBy);
      setLine1(lines[0] || '');
      setLine2(lines[1] || '');
      setLine3(lines[2] || '');
      setIsEditing(true);
      setPendingEditAfterAuth(false);
    }
  }, [isAuthorized, pendingEditAfterAuth, currentEmail, currentWhatsapp, currentVerifiedBy, lines]);

  if (!isOpen) return null;

  const handleSendNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim() || !onSendNotification) return;

    setIsSendingNotif(true);
    setNotifSentStatus(null);
    try {
      const res = await onSendNotification(notifTitle.trim(), notifBody.trim());
      if (res.success) {
        setNotifSentStatus('تم إرسال الإشعار بنجاح لجميع أجهزة العائلة!');
        setNotifTitle('');
        setNotifBody('');
        if (onShowToast) onShowToast('تم إرسال الإشعار التنبيهي لجميع الأجهزة!');
        setTimeout(() => setNotifSentStatus(null), 5000);
      } else {
        setNotifSentStatus(res.error || 'فشل إرسال الإشعار');
      }
    } catch {
      setNotifSentStatus('حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleStartEdit = () => {
    if (!isAuthorized) {
      setPendingEditAfterAuth(true);
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    setEmail(currentEmail);
    setWhatsapp(currentWhatsapp);
    setVerifiedBy(currentVerifiedBy);
    setLine1(lines[0] || '');
    setLine2(lines[1] || '');
    setLine3(lines[2] || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !onSaveContactInfo) return;

    onSaveContactInfo({
      email: email.trim() || DEFAULT_CONTACT_INFO.email,
      whatsapp: (whatsapp.trim() || DEFAULT_CONTACT_INFO.whatsapp!).replace(/\D/g, ''),
      verifiedBy: verifiedBy.trim() || DEFAULT_CONTACT_INFO.verifiedBy,
      creditsLines: [
        line1.trim() || DEFAULT_CONTACT_INFO.creditsLines![0],
        line2.trim() || DEFAULT_CONTACT_INFO.creditsLines![1],
        line3.trim() || DEFAULT_CONTACT_INFO.creditsLines![2]
      ]
    });
    setIsEditing(false);
    if (onShowToast) {
      onShowToast('تم حفظ وتحديث بيانات صفحة التواصل وفريق العمل في Firebase بنجاح!');
    }
  };

  // Format clean whatsapp number and display string
  const cleanPhone = (currentWhatsapp || '97333118588').replace(/\D/g, '') || '97333118588';

  const formatDisplayPhone = (num: string): string => {
    const raw = num.replace(/\D/g, '') || '97333118588';
    if (raw === '97333118588') return '+973 33118588';
    if (raw.startsWith('973') && raw.length === 11) {
      return `+973 ${raw.slice(3, 7)} ${raw.slice(7)}`;
    }
    if (raw.length === 8) {
      return `+973 ${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    return `+${raw}`;
  };

  const displayPhoneString = formatDisplayPhone(currentWhatsapp);

  // Helper for generating custom encoded WhatsApp URLs
  const getWaLink = (messageText?: string) => {
    if (!messageText) return `https://wa.me/${cleanPhone}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
  };

  // Interactive Button Message Templates
  const templateAddMember = `السلام عليكم، أود *إضافة اسم جديد أو مولود* في شجرة عائلة الفردان:
- الاسم رباعياً:
- اسم الوالد والجد:
- الفرع:
- ملاحظات:`;

  const templateEditLineage = `السلام عليكم، أود طلب *تعديل اسم أو تصحيح نسب* في شجرة عائلة الفردان:
- الاسم الحالي في الشجرة:
- التعديل الصحيح المطلوب:
- التوضيح أو المستند:`;

  const templateAddPhoto = `السلام عليكم، أود *إضافة صورة* في شجرة عائلة الفردان:
- اسم صاحب الصورة رباعياً:
- القسم (شخصية / أرشيف العائلة):
(سأقوم بإرفاق الصورة في الرسالة التالية)`;

  const templateUpdateStatus = `السلام عليكم، أود *تحديث بيانات أو حالة* في شجرة عائلة الفردان:
- الاسم الرباعي للفرد:
- التحديث المطلوب (حالة وفاة وتاريخها / تعديل عام):
- ملاحظات إضافية:`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto overflow-x-hidden animate-in fade-in duration-200 font-['Readex_Pro',sans-serif]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100%',
        zIndex: 60,
        margin: 0,
        boxSizing: 'border-box'
      }}
    >
      <div
        className="relative w-full max-w-[600px] mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col box-border"
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-base sm:text-lg font-bold font-['Alexandria'] text-white truncate">
                    صفحة التواصل وفريق العمل
                  </h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                    معتمد
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-200/90 mt-0.5 truncate">
                  شجرة عائلة الفردان · كرزكان، مملكة البحرين
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-xs font-bold border border-white/25 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="تعديل بيانات التواصل وفريق العمل (للمشرف)"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>تعديل</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body with Smooth Scrolling */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-4 sm:p-6 space-y-6">
          {/* Admin Edit Form */}
          {isEditing && isAuthorized ? (
            <form onSubmit={handleSave} className="space-y-5 bg-slate-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>تعديل بيانات التواصل وفريق العمل (خاص بالمشرف)</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  مشرف معتمد
                </span>
              </div>

              {/* Contact Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>رقم الواتساب للتواصل:</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="97333118588"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono placeholder:text-slate-400 placeholder:font-sans"
                  />
                  <p className="text-[10px] text-slate-500">
                    الافتراضي: 97333118588 (يُعرض: +973 33118588)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>البريد الإلكتروني:</span>
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alfardan.family.bh@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono placeholder:text-slate-400 placeholder:font-sans"
                  />
                  <p className="text-[10px] text-slate-500">
                    الافتراضي: alfardan.family.bh@gmail.com
                  </p>
                </div>
              </div>

              {/* Verification & Accreditation Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>اسم المحقق والمدقق المعتمد:</span>
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="الأستاذ / عبدالله عبدالكريم حسين الفردان"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Working Team Lines Inputs */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>القائمون على العمل وإعداد وتوثيق الشجرة (3 أسطر مخصصة):</span>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs font-semibold text-slate-500 flex-shrink-0">السطر 1:</span>
                    <input
                      type="text"
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="أستاذ / محمد عبدالله عبدالكريم الفردان"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs font-semibold text-slate-500 flex-shrink-0">السطر 2:</span>
                    <input
                      type="text"
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      placeholder="حسن جعفر عبدالرؤوف الفردان"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs font-semibold text-slate-500 flex-shrink-0">السطر 3:</span>
                    <input
                      type="text"
                      value={line3}
                      onChange={(e) => setLine3(e.target.value)}
                      placeholder="أعداد وتصميم :  علي ملاحسين حسين الفردان"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات في السحابة والموقع</span>
                </button>
              </div>
            </form>
          ) : (
            /* Visitor & Admin Display View */
            <>
              {/* 1. Original Section: القائمون على العمل وإعداد وتوثيق الشجرة */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-700" />
                    <span>القائمون على العمل وإعداد وتوثيق الشجرة</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    فريق الإعداد والمتابعة الميدانية
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  {/* Line 1 */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      ١
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {lines[0] || DEFAULT_CONTACT_INFO.creditsLines![0]}
                      </div>
                    </div>
                  </div>

                  {/* Line 2 */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      ٢
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {lines[1] || DEFAULT_CONTACT_INFO.creditsLines![1]}
                      </div>
                    </div>
                  </div>

                  {/* Line 3 */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      ٣
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {lines[2] || DEFAULT_CONTACT_INFO.creditsLines![2]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Original Section: خاتم التحقيق والاعتماد التاريخي */}
              <div className="relative bg-gradient-to-br from-amber-50 via-emerald-50/70 to-amber-50 border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-md text-center space-y-3 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center space-y-2.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-emerald-700 text-white flex items-center justify-center shadow-lg ring-4 ring-amber-200/60">
                    <ShieldCheck className="w-7 h-7" />
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>خاتم التحقيق والاعتماد التاريخي</span>
                  </div>

                  {/* Exact user-mandated statement */}
                  <div
                    className="text-base sm:text-lg font-black font-['Alexandria'] text-[#eb0e0e] leading-snug px-2 max-w-lg text-center"
                    style={{ color: '#eb0e0e' }}
                  >
                    <div>«تم بعون الله وفضله التحقيق بدقة المعلومات بواسطة</div>
                    <div className="mt-1 text-lg sm:text-xl font-black">
                      {currentVerifiedBy}»
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium max-w-md leading-relaxed">
                    مراجعة وتدقيق أنساب وفروع شجرة عائلة الفردان الكرزكاني المعتمدة ابتداءً من الجد الأكبر الشيخ علي، وتفرع ذرية عبد الحسين بن يوسف بن الشيخ علي إلى الفردان (والد الجدين محمد وحسين وذريتهما) وأيوب (والد فردان الذي يتفرع منه عبدالله وذريته)، بالاستناد إلى الوثائق التاريخية وسجلات العائلة المحفوظة.
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الوثيقة الرسمية المعتمدة لآل فردان</span>
                  </div>
                </div>
              </div>

              {/* 3. Original Section: بيانات التواصل الرسمية وأزرار خدمات الزوار عبر الواتساب */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>بيانات التواصل الرسمية وخدمات الزوار</span>
                  </h3>
                  {!isAuthorized ? (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>تعديل البيانات (للمشرفين)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل البيانات</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* WhatsApp Card with Interactive Visitor Services */}
                  <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 border-2 border-emerald-300/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 font-['Alexandria']">
                              رقم الهاتف / الواتساب الرسمي
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              الرقم المعتمد للمراسلات وخدمات الشجرة
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          نشط ومعتمد
                        </span>
                      </div>

                      {/* Phone Display Box */}
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-sm font-mono font-bold text-emerald-950 text-center dir-ltr shadow-2xs">
                        {displayPhoneString}
                      </div>

                      {/* Interactive WhatsApp Visitor Service Buttons */}
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                          خدمات الزوار المربوطة مباشرة بالواتساب على رقم المشرف:
                        </span>

                        {/* Button 1: Add New Name or Newborn */}
                        <a
                          href={getWaLink(templateAddMember)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between py-2 px-3 bg-emerald-700/10 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-all active:scale-98 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white" />
                            <span>إضافة اسم جديد أو مولود</span>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* Button 2: Edit Name or Lineage Correction */}
                        <a
                          href={getWaLink(templateEditLineage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between py-2 px-3 bg-emerald-700/10 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-all active:scale-98 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white" />
                            <span>تعديل اسم أو تصحيح نسب</span>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* Button 3: Add Photo */}
                        <a
                          href={getWaLink(templateAddPhoto)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between py-2 px-3 bg-emerald-700/10 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-all active:scale-98 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Image className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white" />
                            <span>إضافة صورة شخصية أو أرشيفية</span>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>

                        {/* Button 4: Update Status / Death */}
                        <a
                          href={getWaLink(templateUpdateStatus)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between py-2 px-3 bg-emerald-700/10 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-all active:scale-98 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white" />
                            <span>تحديث حالة (وفاة / بيانات)</span>
                          </div>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>
                      </div>
                    </div>

                    {/* Primary Button: Direct WhatsApp Chat */}
                    <a
                      href={getWaLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer mt-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>التواصل المباشر عبر الواتساب</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </a>
                  </div>

                  {/* Email Card */}
                  <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 border-2 border-blue-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 font-['Alexandria']">
                              البريد الإلكتروني الرسمي
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              للمخاطبات الرسمية وأرشيف الشجرة
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          البريد الرسمي
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-blue-200 text-xs font-mono font-bold text-blue-900 text-center dir-ltr truncate shadow-2xs">
                        {currentEmail}
                      </div>

                      <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                        يمكنكم مراسلتنا وإرفاق الوثائق والمخطوطات القديمة أو الصور التاريخية عبر البريد الإلكتروني المعتمد الخاص بالعائلة.
                      </div>
                    </div>

                    <a
                      href={`mailto:${currentEmail}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>إرسال بريد إلكتروني رسمي</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 4. Bottom Section: PWA App Install Card & Push Notifications Card */}
              <div className="space-y-4 pt-3 border-t border-slate-200">
                {/* PWA App Install Card */}
                <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-amber-400/40 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex-shrink-0">
                      <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                        <Smartphone className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold font-['Alexandria'] text-white">
                          📲 تثبيت تطبيق الشجرة على الجوال (PWA)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          PWA
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100/90 leading-relaxed">
                        ثبّت المنصة كتطبيق مباشر على شاشة هاتفك لسهولة التصفح والوصول السريع
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex-shrink-0">
                    {isPWAInstalled ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-800/80 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>التطبيق مثبت على جهازك</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onInstallPWA}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-900/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        <span>📲 تثبيت التطبيق الآن</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Visitor Notification Activation Card */}
                <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-amber-400/40 shadow-md space-y-3.5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex-shrink-0">
                        <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-amber-300">
                          <Bell className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold font-['Alexandria'] text-white">
                            🔔 إشعارات الشجرة التنبيهية الفورية
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            iOS / Android
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/90 leading-relaxed">
                          احصل على تنبيهات فورية على هاتفك فور إضافة أفراد جدد أو إعلانات وتهاني عائلية
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex-shrink-0">
                      {isNotificationsGranted ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-800/80 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>✓ الإشعارات مفعلة على جهازك</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={onEnableNotifications}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-900/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Bell className="w-4 h-4 text-slate-950" />
                          <span>🔔 تفعيل الإشعارات الآن</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prominent Guidance Text */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>تنبيه هام لوصول الإشعارات:</strong> يرجى تنزيل وتثبيت تطبيق شجرة العائلة على شاشتك الرئيسية أولاً، ثم افتح البرنامج من شاشتك الرئيسية وفعل خدمة الإشعارات من داخله لضمان وصول التنبيهات إلى هاتفك.
                    </span>
                  </div>
                </div>

                {/* Admin Push Notification Panel (Authorized Admin Only) */}
                {isAuthorized && onSendNotification && (
                  <form
                    onSubmit={handleSendNotifSubmit}
                    className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/50 shadow-lg space-y-3.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-amber-400" />
                        <h4 className="text-xs sm:text-sm font-bold font-['Alexandria'] text-white">
                          📢 إرسال إشعار تنبيهي فوري لأجهزة العائلة (آيفون وأندرويد)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        خاص بالمشرف
                      </span>
                    </div>

                    <p className="text-xs text-emerald-200/90 leading-relaxed">
                      عند الضغط على إرسال، سيتم حفظ الإشعار في Firebase ليصل فوراً لجميع هواتف العائلة المفعلة للإشعارات.
                    </p>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-emerald-200 mb-1">
                          عنوان الإشعار (مثلاً: تهنئة بمولود، مناسبة عائلية، تحديث في الشجرة):
                        </label>
                        <input
                          type="text"
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          placeholder="اكتب عنوان الإشعار هنا..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-white placeholder:text-slate-400 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-200 mb-1">
                          نص الرسالة أو التنبيه:
                        </label>
                        <textarea
                          rows={2}
                          value={notifBody}
                          onChange={(e) => setNotifBody(e.target.value)}
                          placeholder="اكتب نص الإشعار والتفاصيل هنا..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-white placeholder:text-slate-400 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 focus:outline-hidden resize-none"
                          required
                        />
                      </div>
                    </div>

                    {notifSentStatus && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{notifSentStatus}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSendingNotif || !notifTitle.trim() || !notifBody.trim()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSendingNotif ? 'جارِ الإرسال...' : '🚀 إرسال الإشعار الآن لجميع الأجهزة'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between text-xs text-slate-500 flex-shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">متاحة للزوار · التعديلات للمشرفين فقط</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex-shrink-0 mr-2"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
