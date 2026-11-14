import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArchivalPhoto, FamilyTreeProcessed } from '../types/family';
import {
  Images,
  Image as ImageIcon,
  Plus,
  Search,
  Calendar,
  MapPin,
  FileText,
  Users,
  Edit2,
  Trash2,
  Maximize2,
  Lock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload
} from 'lucide-react';
import { normalizeArabic } from '../data/treeManager';
import { getFallbackImageUrl } from '../utils/imageDownload';

interface ArchivalPhotosViewProps {
  photos: ArchivalPhoto[];
  registry: FamilyTreeProcessed;
  isAuthorized: boolean;
  onOpenAddModal: (defaultCategory?: ArchivalPhoto['category']) => void;
  onOpenEditModal: (photo: ArchivalPhoto) => void;
  onDeletePhoto: (photoId: string) => void;
  onOpenAuthModal: () => void;
  onSelectPerson?: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onSwitchToTree?: (key?: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  all: { label: 'جميع الصور', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  documents: { label: 'وثائق ومخطوطات تاريخية', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  portraits: { label: 'شخصيات وصور تذكارية', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  events: { label: 'مناسبات وتجمعات العائلة', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  heritage: { label: 'تراث ومعالم كرزكان', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
  historical: { label: 'أرشيف وتوثيق عام', bg: 'bg-stone-50', text: 'text-stone-900', border: 'border-stone-200' },
};

export const ArchivalPhotosView: React.FC<ArchivalPhotosViewProps> = ({
  photos,
  registry,
  isAuthorized,
  onOpenAddModal,
  onOpenEditModal,
  onDeletePhoto,
  onOpenAuthModal,
  onSelectPerson,
  onSwitchToTree,
  onShowToast
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLightboxDragging, setIsLightboxDragging] = useState(false);

  const lbTouchRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startDist: number;
    startZoom: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    lastTapTime: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    mode: 'none',
    startDist: 0,
    startZoom: 1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0
  });

  const resetLightboxTransform = () => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setIsLightboxDragging(false);
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const handleLbTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      lbTouchRef.current.mode = 'pinch';
      lbTouchRef.current.startDist = Math.max(dist, 10);
      lbTouchRef.current.startZoom = lightboxZoom;
      lbTouchRef.current.startX = midX;
      lbTouchRef.current.startY = midY;
      lbTouchRef.current.startPanX = lightboxPan.x;
      lbTouchRef.current.startPanY = lightboxPan.y;
      setIsLightboxDragging(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const dt = now - lbTouchRef.current.lastTapTime;
      const dx = Math.abs(touch.clientX - lbTouchRef.current.lastTapX);
      const dy = Math.abs(touch.clientY - lbTouchRef.current.lastTapY);

      if (dt > 0 && dt < 300 && dx < 30 && dy < 30) {
        e.preventDefault();
        if (lightboxZoom > 1.05) {
          resetLightboxTransform();
        } else {
          setLightboxZoom(2.5);
          setLightboxPan({ x: 0, y: 0 });
        }
        lbTouchRef.current.lastTapTime = 0;
        lbTouchRef.current.mode = 'none';
        return;
      }

      lbTouchRef.current.lastTapTime = now;
      lbTouchRef.current.lastTapX = touch.clientX;
      lbTouchRef.current.lastTapY = touch.clientY;

      if (lightboxZoom > 1) {
        lbTouchRef.current.mode = 'pan';
        lbTouchRef.current.startX = touch.clientX;
        lbTouchRef.current.startY = touch.clientY;
        lbTouchRef.current.startPanX = lightboxPan.x;
        lbTouchRef.current.startPanY = lightboxPan.y;
        setIsLightboxDragging(true);
      } else {
        lbTouchRef.current.mode = 'none';
      }
    }
  };

  const handleLbTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lbTouchRef.current.mode === 'pinch') {
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleRatio = dist / lbTouchRef.current.startDist;
      const nextZoom = Math.min(Math.max(lbTouchRef.current.startZoom * scaleRatio, 1), 5);
      setLightboxZoom(nextZoom);

      if (nextZoom <= 1.02) {
        setLightboxPan({ x: 0, y: 0 });
      } else {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setLightboxPan({
          x: lbTouchRef.current.startPanX + (midX - lbTouchRef.current.startX),
          y: lbTouchRef.current.startPanY + (midY - lbTouchRef.current.startY)
        });
      }
    } else if (e.touches.length === 1 && lbTouchRef.current.mode === 'pan' && lightboxZoom > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setLightboxPan({
        x: lbTouchRef.current.startPanX + (touch.clientX - lbTouchRef.current.startX),
        y: lbTouchRef.current.startPanY + (touch.clientY - lbTouchRef.current.startY)
      });
    }
  };

  const handleLbTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && lightboxZoom > 1) {
      const touch = e.touches[0];
      lbTouchRef.current.mode = 'pan';
      lbTouchRef.current.startX = touch.clientX;
      lbTouchRef.current.startY = touch.clientY;
      lbTouchRef.current.startPanX = lightboxPan.x;
      lbTouchRef.current.startPanY = lightboxPan.y;
    } else if (e.touches.length === 0) {
      lbTouchRef.current.mode = 'none';
      setIsLightboxDragging(false);
      if (lightboxZoom <= 1.02) {
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
      }
    }
  };

  const handleLbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (lightboxZoom <= 1) return;
    e.preventDefault();
    lbTouchRef.current.mode = 'pan';
    lbTouchRef.current.startX = e.clientX;
    lbTouchRef.current.startY = e.clientY;
    lbTouchRef.current.startPanX = lightboxPan.x;
    lbTouchRef.current.startPanY = lightboxPan.y;
    setIsLightboxDragging(true);
  };

  const handleLbMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLightboxDragging || lbTouchRef.current.mode !== 'pan' || lightboxZoom <= 1) return;
    e.preventDefault();
    setLightboxPan({
      x: lbTouchRef.current.startPanX + (e.clientX - lbTouchRef.current.startX),
      y: lbTouchRef.current.startPanY + (e.clientY - lbTouchRef.current.startY)
    });
  };

  const handleLbMouseUp = () => {
    if (isLightboxDragging) {
      lbTouchRef.current.mode = 'none';
      setIsLightboxDragging(false);
    }
  };

  const handleLbWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    setLightboxZoom(prev => {
      const next = Math.min(Math.max(+(prev + delta).toFixed(2), 1), 5);
      if (next <= 1) setLightboxPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleLbDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (lightboxZoom > 1.05) {
      resetLightboxTransform();
    } else {
      setLightboxZoom(2.5);
      setLightboxPan({ x: 0, y: 0 });
    }
  };

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      if (activeCategory !== 'all' && (photo.category || 'historical') !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const qNorm = normalizeArabic(searchQuery);
        const titleNorm = normalizeArabic(photo.title);
        const notesNorm = normalizeArabic(photo.notes);
        const eraNorm = normalizeArabic(photo.era || '');
        const locNorm = normalizeArabic(photo.location || '');

        const matchesTagged = (photo.taggedPersonKeys || []).some(key => {
          const person = registry.people.get(key);
          return person && normalizeArabic(person.name).includes(qNorm);
        });

        if (
          !titleNorm.includes(qNorm) &&
          !notesNorm.includes(qNorm) &&
          !eraNorm.includes(qNorm) &&
          !locNorm.includes(qNorm) &&
          !matchesTagged
        ) {
          return false;
        }
      }

      return true;
    });
  }, [photos, activeCategory, searchQuery, registry]);

  const currentPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex === null) return;
    resetLightboxTransform();
    setSelectedPhotoIndex(prev => (prev! > 0 ? prev! - 1 : filteredPhotos.length - 1));
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null) return;
    resetLightboxTransform();
    setSelectedPhotoIndex(prev => (prev! < filteredPhotos.length - 1 ? prev! + 1 : 0));
  };

  const handlePersonClick = (key: string) => {
    if (onSelectPerson) {
      onSelectPerson(key, { reveal: true, center: true });
    }
    if (onSwitchToTree) {
      onSwitchToTree(key);
    }
  };

  const handleUploadTrigger = () => {
    const defaultCat = activeCategory !== 'all' ? (activeCategory as ArchivalPhoto['category']) : 'portraits';
    onOpenAddModal(defaultCat);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl: string) => {
    const imgEl = e.currentTarget;
    if (imgEl.dataset.fallbackApplied === 'true') return;
    const fallback = getFallbackImageUrl(originalUrl);
    if (fallback) {
      imgEl.dataset.fallbackApplied = 'true';
      imgEl.src = fallback;
    }
  };

  // Categories count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    photos.forEach(p => {
      const cat = p.category || 'historical';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [photos]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Readex_Pro',sans-serif]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold">
              <Images className="w-4 h-4 text-amber-400" />
              <span>الأرشيف المصور لعائلة الفردان الكرزكاني</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Alexandria'] text-white tracking-tight">
              معرض الصور الأرشيفية والملاحظات التوثيقية
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              سجل بصري حي يضم المخطوطات والوثائق التاريخية، الصور التذكارية لأفراد العائلة، والمناسبات التي توثق مسيرة وتاريخ آل فردان في كرزكان، مع إمكانية استعراض وتكبير الصور بكل سلاسة ومزامنتها الفورية على جميع المواقع.
            </p>

            {/* Stats chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                إجمالي الصور والوثائق: <strong className="text-white">{photos.length}</strong>
              </span>
              <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                الأفراد الموثقون بالصور: <strong className="text-white">{registry.stats.photosCount}</strong>
              </span>
              <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                الأصل: <strong className="text-amber-300">كرزكان - مملكة البحرين</strong>
              </span>
            </div>
          </div>

          {/* Direct Upload & Admin Control */}
          <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-2.5">
            {isAuthorized ? (
              <div className="space-y-2 text-right">
                <button
                  onClick={handleUploadTrigger}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع صورة أو وثيقة جديدة للأرشيف</span>
                </button>
                <p className="text-[11px] text-emerald-300 flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>صلاحية المشرف مفعّلة: تُرفع الصور وتظهر فوراً على جميع المواقع</span>
                </p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 max-w-xs text-right space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Lock className="w-4 h-4" />
                  <span>رفع الصور وإدارة الأرشيف</span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  يمكن لجميع الزوار استعراض وتكبير كافة الصور بجودة عالية. لرفع صور أو وثائق جديدة، سجل دخول المشرف:
                </p>
                <button
                  onClick={onOpenAuthModal}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>دخول المشرف لرفع الصور والوثائق</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar: Category Filters, Quick Upload & Search */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {Object.entries(CATEGORY_MAP).map(([key, info]) => {
            const count = categoryCounts[key] || 0;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{info.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Quick Upload Button */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث في الصور، الملاحظات، أو الأفراد..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleUploadTrigger}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap cursor-pointer"
            title="رفع صورة أو وثيقة جديدة"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>رفع صورة</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold font-['Alexandria'] text-slate-800">
            لا توجد صور مطابقة لبحثك
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `لم نجد أي صورة أو ملاحظة تطابق كلمة "${searchQuery}". حاول البحث بكلمة أخرى.`
              : 'لم تتم إضافة صور في هذا التصنيف بعد.'}
          </p>
          <button
            onClick={handleUploadTrigger}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>رفع صورة أرشيفية الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo, index) => {
            const catInfo = CATEGORY_MAP[photo.category || 'historical'] || CATEGORY_MAP.historical;

            return (
              <div
                key={photo.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Photo Thumbnail Container */}
                <div
                  className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer select-none"
                  onContextMenu={e => e.preventDefault()}
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    resetLightboxTransform();
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    draggable={false}
                    onContextMenu={e => e.preventDefault()}
                    onError={e => handleImageError(e, photo.url)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                    loading="lazy"
                  />

                  {/* Category Pill */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}>
                      {catInfo.label}
                    </span>
                  </div>

                  {/* Hover Overlay with View Icon */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 text-slate-900 rounded-xl text-xs font-bold shadow-lg">
                      <Maximize2 className="w-4 h-4 text-emerald-700" />
                      <span>تكبير واستعراض</span>
                    </span>
                  </div>
                </div>

                {/* Card Content & Notes */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Metadata: Era & Location */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                      {photo.era && (
                        <span className="flex items-center gap-1 text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>{photo.era}</span>
                        </span>
                      )}
                      {photo.location && (
                        <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{photo.location}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => {
                        setSelectedPhotoIndex(index);
                        resetLightboxTransform();
                      }}
                      className="text-base font-bold font-['Alexandria'] text-slate-900 group-hover:text-emerald-800 transition-colors cursor-pointer leading-snug"
                    >
                      {photo.title}
                    </h3>

                    {/* Notes Box - Prominently Displayed */}
                    <div className="bg-slate-50 border-r-2 border-emerald-600 rounded-xl p-3 text-xs text-slate-700 leading-relaxed space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                        <FileText className="w-3.5 h-3.5" />
                        <span>ملاحظات توثيقية:</span>
                      </div>
                      <p className="line-clamp-3 text-slate-600 text-[11px] leading-relaxed">
                        {photo.notes}
                      </p>
                    </div>

                    {/* Tagged Family Members */}
                    {photo.taggedPersonKeys && photo.taggedPersonKeys.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>الأفراد المرتبطون بالصورة:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {photo.taggedPersonKeys.map(key => {
                            const person = registry.people.get(key);
                            if (!person) return null;
                            return (
                              <button
                                key={key}
                                onClick={() => handlePersonClick(key)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                                title="الانتقال إلى الشخص في الشجرة"
                              >
                                <span>{person.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions (View Only - No Download Button) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhotoIndex(index);
                          resetLightboxTransform();
                        }}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>استعراض</span>
                      </button>
                    </div>

                    {/* Admin Edit & Delete Actions */}
                    {isAuthorized && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenEditModal(photo)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل الصورة والملاحظات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف صورة «${photo.title}» من الأرشيف؟`)) {
                              onDeletePhoto(photo.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox & Notes Modal via React Portal (Covers Top Header & Right Sidebar 100% on all Mobile & PWA screens) */}
      {currentPhoto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            dir="rtl"
            className="doc-viewer-backdrop fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in font-['Readex_Pro',sans-serif]"
            onClick={() => {
              setSelectedPhotoIndex(null);
              resetLightboxTransform();
            }}
          >
            <div
              className="doc-viewer-modal bg-white rounded-3xl max-w-5xl w-full max-h-[94dvh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-['Readex_Pro',sans-serif]"
              onClick={e => e.stopPropagation()}
            >
              {/* Sticky Modal Header: Right = Counter, Center = Document Title, Left = Large Clear Close Button (✕) */}
              <div className="doc-viewer-header sticky top-0 z-50 bg-white border-b border-slate-200 px-4 sm:px-5 pb-3 pt-3 flex items-center justify-between gap-2 shrink-0 shadow-xs">
                {/* Right: Image Counter */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 font-mono tabular-nums">
                    {selectedPhotoIndex! + 1} / {filteredPhotos.length}
                  </span>
                </div>

                {/* Center: Document Title */}
                <h3 className="flex-1 text-center text-xs sm:text-sm font-bold font-['Alexandria'] text-slate-900 truncate px-2">
                  {currentPhoto.title}
                </h3>

                {/* Left: Admin Edit + Large Clear Close Button (✕) */}
                <div className="flex items-center gap-2 shrink-0">
                  {isAuthorized && (
                    <button
                      onClick={() => {
                        onOpenEditModal(currentPhoto);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تعديل</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPhotoIndex(null);
                      resetLightboxTransform();
                    }}
                    aria-label="إغلاق الوثيقة"
                    className="flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="text-base leading-none font-black">✕</span>
                    <span className="hidden sm:inline">إغلاق</span>
                  </button>
                </div>
              </div>

              {/* Modal Content: Photo + Details Split */}
              <div className="doc-viewer-body flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Interactive Photo View Container + Bottom Zoom Bar */}
                <div className="doc-viewer-stage flex-1 flex flex-col bg-slate-950 overflow-hidden min-h-[300px] sm:min-h-[380px] lg:min-h-[480px]">
                  <div
                    onTouchStart={handleLbTouchStart}
                    onTouchMove={handleLbTouchMove}
                    onTouchEnd={handleLbTouchEnd}
                    onTouchCancel={handleLbTouchEnd}
                    onMouseDown={handleLbMouseDown}
                    onMouseMove={handleLbMouseMove}
                    onMouseUp={handleLbMouseUp}
                    onMouseLeave={handleLbMouseUp}
                    onWheel={handleLbWheel}
                    onDoubleClick={handleLbDoubleClick}
                    onContextMenu={e => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                    className={`relative flex-1 flex items-center justify-center overflow-hidden select-none ${
                      lightboxZoom > 1
                        ? isLightboxDragging
                          ? 'cursor-grabbing'
                          : 'cursor-grab'
                        : 'cursor-zoom-in'
                    }`}
                  >
                    <div
                      style={{
                        transform: `translate3d(${lightboxPan.x}px, ${lightboxPan.y}px, 0) scale(${lightboxZoom})`,
                        transformOrigin: 'center center',
                        transition: isLightboxDragging ? 'none' : 'transform 0.16s ease-out'
                      }}
                      className="w-full h-full flex items-center justify-center select-none pointer-events-none"
                    >
                      <img
                        src={currentPhoto.url}
                        alt={currentPhoto.title}
                        draggable={false}
                        onContextMenu={e => e.preventDefault()}
                        onError={e => handleImageError(e, currentPhoto.url)}
                        className="max-h-full max-w-full object-contain select-none pointer-events-none"
                      />
                    </div>

                    {/* Next / Prev Navigation Arrows */}
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      onTouchStart={e => e.stopPropagation()}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/20 cursor-pointer"
                      title="الصورة السابقة"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      onTouchStart={e => e.stopPropagation()}
                      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/20 cursor-pointer"
                      title="الصورة التالية"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Bottom Control Bar Below Viewer (+ تكبير / - تصغير / إعادة ضبط) */}
                  <div
                    className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white z-20 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-slate-300 hidden sm:inline">
                      اسحب بإصبعين للتكبير (Pinch-to-Zoom) أو انقر مرتين وحرّك في جميع الاتجاهات
                    </span>

                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                      <button
                        type="button"
                        onClick={() => setLightboxZoom(prev => Math.min(+(prev + 0.5).toFixed(2), 5))}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                        title="تكبير (+)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>+ تكبير</span>
                      </button>

                      <span className="text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-amber-300 tabular-nums">
                        {Math.round(lightboxZoom * 100)}%
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setLightboxZoom(prev => {
                            const next = Math.max(+(prev - 0.5).toFixed(2), 1);
                            if (next <= 1) setLightboxPan({ x: 0, y: 0 });
                            return next;
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                        title="تصغير (-)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                        <span>- تصغير</span>
                      </button>

                      <button
                        type="button"
                        onClick={resetLightboxTransform}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                        title="إعادة ضبط الحجم"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة ضبط</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes & Metadata Sidebar */}
                <div className="doc-viewer-notes w-full lg:w-96 border-t lg:border-t-0 lg:border-r border-slate-200 bg-white p-5 sm:p-6 overflow-y-auto space-y-5">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                      {CATEGORY_MAP[currentPhoto.category || 'historical']?.label || 'أرشيف عام'}
                    </span>
                    <h2 className="text-lg font-bold font-['Alexandria'] text-slate-900 leading-snug">
                      {currentPhoto.title}
                    </h2>
                  </div>

                  {/* Metadata Badges */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {currentPhoto.era && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span><strong>الفترة:</strong> {currentPhoto.era}</span>
                      </div>
                    )}
                    {currentPhoto.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span><strong>الموقع:</strong> {currentPhoto.location}</span>
                      </div>
                    )}
                    {currentPhoto.addedBy && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span><strong>المصدر / التوثيق:</strong> {currentPhoto.addedBy}</span>
                      </div>
                    )}
                  </div>

                  {/* Full Notes Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>الملاحظات والوصف التاريخي الكامل:</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {currentPhoto.notes}
                    </div>
                  </div>

                  {/* Tagged Persons Details */}
                  {currentPhoto.taggedPersonKeys && currentPhoto.taggedPersonKeys.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span>الأفراد الموثقون بالصورة ({currentPhoto.taggedPersonKeys.length}):</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {currentPhoto.taggedPersonKeys.map(key => {
                          const person = registry.people.get(key);
                          if (!person) return null;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900">{person.name}</p>
                                <p className="text-[10px] text-slate-500">الجيل {person.generation}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedPhotoIndex(null);
                                  handlePersonClick(key);
                                }}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-bold transition-all"
                              >
                                عرض في الشجرة
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
