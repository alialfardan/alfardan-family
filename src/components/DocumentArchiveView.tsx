import React, { useState, useMemo } from 'react';
import { ArchivalPhoto } from '../types/family';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ShieldCheck,
  Sparkles,
  BookOpen,
  MapPin,
  Calendar,
  Award,
  Maximize2,
  FileText,
  Upload,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { downloadImageSmoothly, getFallbackImageUrl } from '../utils/imageDownload';

interface DocumentArchiveViewProps {
  photos?: ArchivalPhoto[];
  isAuthorized?: boolean;
  onOpenAddDocumentModal?: () => void;
  onOpenEditDocumentModal?: (photo: ArchivalPhoto) => void;
  onDeleteDocument?: (photoId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

export const DocumentArchiveView: React.FC<DocumentArchiveViewProps> = ({
  photos = [],
  isAuthorized = false,
  onOpenAddDocumentModal,
  onOpenEditDocumentModal,
  onDeleteDocument,
  onShowToast
}) => {
  const [activeDocTab, setActiveDocTab] = useState<'document' | 'emblem'>('document');
  const [docZoom, setDocZoom] = useState(1);
  const [emblemZoom, setEmblemZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<ArchivalPhoto | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Filter documents & historical manuscripts from archivalPhotos
  const documentItems = useMemo(() => {
    return photos.filter(p => p && (p.category === 'documents' || p.category === 'historical' || p.id === 'photo_doc_original'));
  }, [photos]);

  // Allow custom updated URL for the main document or emblem if edited in archivalPhotos
  const mainDocPhoto = useMemo(() => {
    return photos.find(p => p.id === 'photo_doc_original');
  }, [photos]);

  const emblemPhoto = useMemo(() => {
    return photos.find(p => p.id === 'photo_emblem');
  }, [photos]);

  const primaryDocUrl = mainDocPhoto?.url && mainDocPhoto.url !== '/assets/aistudio/original_252a7942.jpg'
    ? mainDocPhoto.url
    : '/original-document.jpg';

  const primaryEmblemUrl = emblemPhoto?.url || '/fardan-logo.jpg';

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl: string) => {
    const imgEl = e.currentTarget;
    if (imgEl.dataset.fallbackApplied === 'true') {
      if (originalUrl === '/original-document.jpg') {
        imgEl.src = '/assets/aistudio/original_252a7942.jpg';
      }
      return;
    }
    const fallback = getFallbackImageUrl(originalUrl);
    if (fallback) {
      imgEl.dataset.fallbackApplied = 'true';
      imgEl.src = fallback;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-['Readex_Pro',sans-serif]">
      {/* Top Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>الأرشيف التاريخي والوثائق المعتمدة</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-slate-900">
          وثيقة شجرة عائلة الفردان والشعار المعتمد
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          استعراض وتحميل النسخة الأصلية المعتمدة المحققة عن خط المرحوم الحاج كاظم بن إبراهيم الفردان، والشعار الرقمي الحديث، مع إمكانية رفع وتحميل الوثائق والمخطوطات مباشرة على جميع المواقع.
        </p>

        {/* View Switcher & Direct Upload Button */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80">
            <button
              onClick={() => setActiveDocTab('document')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDocTab === 'document'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>صورة الوثيقة التاريخية الأصلية</span>
            </button>

            <button
              onClick={() => setActiveDocTab('emblem')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDocTab === 'emblem'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>الشعار الرقمي لعائلة الفردان</span>
            </button>
          </div>

          {onOpenAddDocumentModal && (
            <button
              onClick={onOpenAddDocumentModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>رفع وثيقة أو مخطوطة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Authentic Historical Document Viewer */}
      {activeDocTab === 'document' && (
        <div className="space-y-6">
          {/* Document Canvas Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold font-['Alexandria'] text-slate-900 flex items-center gap-2">
                  <span>الوثيقة الأصلية: شجرة عائلة الفردان (النسخة المعتمدة – الإصدار الأول)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  حررت في يوم السبت 26 ديسمبر 2020م (12 جمادى الأولى 1442هـ) — أعدّها عبدالله عبدالكريم حسين الفردان
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadImageSmoothly(primaryDocUrl, 'Wathikat-Al-Fardan-Original.jpg', onShowToast)
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  title="تحميل صورة الوثيقة بالحجم الكامل"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>تحميل الوثيقة الأصلية</span>
                </button>

                {isAuthorized && mainDocPhoto && onOpenEditDocumentModal && (
                  <button
                    type="button"
                    onClick={() => onOpenEditDocumentModal(mainDocPhoto)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="تحديث صورة الوثيقة أو بياناتها"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>تحديث صورة الوثيقة</span>
                  </button>
                )}

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Zoomable Document Area */}
            <div
              className={`relative overflow-auto rounded-2xl bg-[#e5e7eb] border border-slate-300 p-2 sm:p-4 flex items-center justify-center transition-all ${
                isFullscreen ? 'fixed inset-4 z-50 bg-slate-900/95 p-6' : 'min-h-[480px] max-h-[720px]'
              }`}
            >
              <div
                style={{
                  transform: `scale(${docZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-w-full inline-block"
              >
                <img
                  src={primaryDocUrl}
                  alt="الوثيقة الأصلية لشجرة عائلة الفردان"
                  onError={e => handleImageError(e, primaryDocUrl)}
                  className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white select-none pointer-events-auto"
                />
              </div>

              {/* Floating Zoom Bar */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-slate-300 text-slate-800">
                <button
                  onClick={() => setDocZoom(prev => Math.min(prev + 0.25, 2.8))}
                  className="p-1.5 hover:bg-slate-100 rounded-xl"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold px-1 tabular-nums">{Math.round(docZoom * 100)}%</span>
                <button
                  onClick={() => setDocZoom(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 hover:bg-slate-100 rounded-xl"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <button
                  onClick={() => setDocZoom(1)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl"
                  title="إعادة ضبط الحجم"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-4 left-4 z-20 px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg"
                >
                  إغلاق ملء الشاشة
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              يمكنك استخدام زري التكبير والتصغير أو الضغط على «تحميل الوثيقة الأصلية» لحفظها على جهازك بجودتها الكاملة.
            </p>
          </div>

          {/* Historical Transcribed Chronicle */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Alexandria'] text-slate-900">
                  النص التاريخي المثبت على الوثيقة الأصلية
                </h3>
                <p className="text-xs text-slate-500">نص الإقرار والتحقيق الصادر مع الشجرة</p>
              </div>
            </div>

            <div className="bg-amber-50/70 border-r-4 border-amber-600 p-5 rounded-2xl text-sm leading-loose text-slate-900 font-medium space-y-2">
              <p className="text-center font-bold text-amber-950 text-base">
                بسم الله الرحمن الرحيم
              </p>
              <p>
                «بعد الاطلاع على الوثيقة التي كتبت بخط المرحوم <strong>الحاج كاظم بن إبراهيم بن علي بن محمد بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي</strong> المتضمنة أبناء الفردان وأيوب ابني عبد الحسين الكرزكاني، وجمع معلومات من قبل والدي وبعض المهتمين بمعرفة أحوال الأنساب من العائلة، قمت بمراجعتها وإضافة الأسماء المنتمية لكل فرد من أفراد العائلة.»
              </p>
              <div className="pt-2 text-left text-xs font-bold text-amber-900">
                — عبدالله عبدالكريم حسين الفردان (26/12/2020م - 12 جمادى الأولى 1442هـ)
              </div>
            </div>

            {/* Geographical and Historical Facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <MapPin className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="block font-bold text-slate-900">الموطن التأسيسي</span>
                <span className="text-slate-600">قرية كرزكان – مملكة البحرين</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <MapPin className="w-5 h-5 text-blue-600 mb-1" />
                <span className="block font-bold text-slate-900">فروع الامتداد</span>
                <span className="text-slate-600">المنامة، القصبة في البصرة، والمناطق المجاورة</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <Award className="w-5 h-5 text-purple-600 mb-1" />
                <span className="block font-bold text-slate-900">المخطوطات المرفقة</span>
                <span className="text-slate-600">وثائق خطية قديمة مدونة بأقلام الأجداد</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <Calendar className="w-5 h-5 text-amber-600 mb-1" />
                <span className="block font-bold text-slate-900">التوثيق والتحديث</span>
                <span className="text-slate-600">إصدار رقمي تفاعلي مستمر مع تعاقب الأجيال</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Official Digital Emblem */}
      {activeDocTab === 'emblem' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in">
          {/* Left: Emblem Showcase */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold font-['Alexandria'] text-slate-900">
                  شعار عائلة الفردان المعتمد
                </h3>
                <p className="text-xs text-slate-500">رمز الشجرة التقنية وجذور الأصالة</p>
              </div>
              <div className="flex items-center gap-1.5">
                {isAuthorized && emblemPhoto && onOpenEditDocumentModal && (
                  <button
                    type="button"
                    onClick={() => onOpenEditDocumentModal(emblemPhoto)}
                    className="p-2 text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200 cursor-pointer"
                    title="تحديث صورة الشعار"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadImageSmoothly(primaryEmblemUrl, 'Al-Fardan-Emblem.jpg', onShowToast)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تحميل الشعار عالي الدقة"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>تحميل الشعار</span>
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-emerald-50/20 to-amber-50/30 border border-slate-100 p-8 flex items-center justify-center min-h-[340px]">
              <img
                src={primaryEmblemUrl}
                alt="شعار عائلة الفردان"
                onError={e => handleImageError(e, primaryEmblemUrl)}
                style={{ transform: `scale(${emblemZoom})` }}
                className="max-h-72 w-auto object-contain transition-transform duration-300 drop-shadow-xl"
              />

              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-md border border-slate-200">
                <button
                  onClick={() => setEmblemZoom(prev => Math.min(prev + 0.25, 2))}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-700"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEmblemZoom(prev => Math.max(prev - 0.25, 0.75))}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-700"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEmblemZoom(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-700"
                  title="إعادة ضبط"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>دلالات الشعار المعتمد:</span>
              </h4>
              <p>
                • <strong>الجذور الذهبية والمسارات التقنية:</strong> تعبير عن الترابط العائلي المتوارث والمستمر في النمو مع العصر الحديث وتطلعات المستقبل.
              </p>
              <p>
                • <strong>الأوراق الخضراء:</strong> رمز للحياة والنماء المبارك لذرية عائلة الفردان الكرزكاني ابتداءً من الجد الأكبر الشيخ علي في شتى الميادين.
              </p>
              <p>
                • <strong>الإطار الدائري الذهبي:</strong> يرمز إلى وحدة العائلة واعتزازها بأصلها وتاريخها العريق في كرزكان.
              </p>
            </div>
          </div>

          {/* Right: Modern Identity & Values */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
            <h3 className="text-xl font-bold font-['Alexandria'] text-slate-900">
              الهوية الرقمية لشجرة عائلة الفردان
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              يمثل هذا الموقع منصة رقمية موحدة تجمع أفراد عائلة الفردان داخل البحرين وخارجها، لتبقى صلة الرحم حية وحاضرة في قلوب الأبناء والأحفاد، وتوثيقاً أميناً لكل ولادة ومولود جديد في العائلة.
            </p>

            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-1">
                <h4 className="font-bold text-emerald-900 text-xs">صلة الرحم والتواصل</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  التعرف على الأقارب والأنساب وأبناء العمومة عبر الأجيال المختلفة وتيسير التواصل العائلي.
                </p>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl space-y-1">
                <h4 className="font-bold text-amber-900 text-xs">حفظ الأنساب للأجيال الصاعدة</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  توفير وثائق نسب إلكترونية معتمدة قابلة للطباعة والحفظ والمشاركة الفورية.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">التحديث والمشاركة</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  إمكانية إضافة الأبناء والبنات وصورهم والوثائق التاريخية مباشرة مع المزامنة اللحظية على كافة المواقع.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Historical Documents & Manuscripts Library */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-bold font-['Alexandria'] text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>مكتبة الوثائق والمخطوطات التاريخية ({documentItems.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              جميع الوثائق والمخطوطات المرفوعة متاحة للاستعراض والتحميل المباشر، وتُزامن تلقائياً على كافة المواقع.
            </p>
          </div>

          {onOpenAddDocumentModal && (
            <button
              type="button"
              onClick={onOpenAddDocumentModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>رفع وثيقة أو صورة تاريخية</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documentItems.map(docItem => (
            <div
              key={docItem.id}
              className="bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200/90 hover:border-emerald-600/60 shadow-2xs hover:shadow-md transition-all flex flex-col group"
            >
              <div
                onClick={() => {
                  setSelectedDocPreview(docItem);
                  setPreviewZoom(1);
                }}
                className="relative aspect-[4/3] bg-slate-200 overflow-hidden cursor-pointer"
              >
                <img
                  src={docItem.url}
                  alt={docItem.title}
                  onError={e => handleImageError(e, docItem.url)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    downloadImageSmoothly(docItem.url, `${docItem.title || docItem.id}.jpg`, onShowToast);
                  }}
                  className="absolute top-3 left-3 p-2 bg-white/95 hover:bg-white text-slate-800 hover:text-emerald-800 rounded-xl shadow-md border border-slate-200 transition-all cursor-pointer z-10"
                  title="تحميل الوثيقة مباشرة"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h4
                    onClick={() => {
                      setSelectedDocPreview(docItem);
                      setPreviewZoom(1);
                    }}
                    className="font-bold font-['Alexandria'] text-sm text-slate-900 group-hover:text-emerald-800 cursor-pointer"
                  >
                    {docItem.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {docItem.notes}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadImageSmoothly(docItem.url, `${docItem.title || docItem.id}.jpg`, onShowToast)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>تحميل الوثيقة</span>
                  </button>

                  {isAuthorized && (
                    <div className="flex items-center gap-1">
                      {onOpenEditDocumentModal && (
                        <button
                          type="button"
                          onClick={() => onOpenEditDocumentModal(docItem)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل الوثيقة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteDocument && !docItem.id.startsWith('photo_') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف وثيقة «${docItem.title}»؟`)) {
                              onDeleteDocument(docItem.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الوثيقة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Fullscreen Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold font-['Alexandria'] text-slate-900 truncate">
                {selectedDocPreview.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadImageSmoothly(
                      selectedDocPreview.url,
                      `${selectedDocPreview.title || selectedDocPreview.id}.jpg`,
                      onShowToast
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>تحميل الوثيقة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-auto min-h-[340px] p-4">
              <img
                src={selectedDocPreview.url}
                alt={selectedDocPreview.title}
                onError={e => handleImageError(e, selectedDocPreview.url)}
                style={{ transform: `scale(${previewZoom})` }}
                className="max-h-[70vh] w-auto object-contain transition-transform duration-200"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/75 text-white px-2.5 py-1.5 rounded-xl border border-white/20">
                <button
                  onClick={() => setPreviewZoom(z => Math.min(z + 0.25, 3))}
                  className="p-1 hover:bg-white/20 rounded-lg"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewZoom(z => Math.max(z - 0.25, 0.5))}
                  className="p-1 hover:bg-white/20 rounded-lg"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewZoom(1)}
                  className="p-1 hover:bg-white/20 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {selectedDocPreview.notes && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 leading-relaxed">
                {selectedDocPreview.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
