import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArchivalPhoto, FamilyTreeProcessed } from '../types/family';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  BookOpen,
  MapPin,
  Calendar,
  Award,
  Maximize2,
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Users,
  ExternalLink,
  Lock,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon
} from 'lucide-react';
import { normalizeArabic } from '../data/treeManager';
import { getFallbackImageUrl } from '../utils/imageDownload';
import { getDefaultAvatarDataUri } from './MemberAvatar';

interface DocumentArchiveViewProps {
  photos?: ArchivalPhoto[];
  registry?: FamilyTreeProcessed;
  isAuthorized?: boolean;
  onOpenAddDocumentModal?: (defaultCategory?: ArchivalPhoto['category']) => void;
  onOpenEditDocumentModal?: (photo: ArchivalPhoto) => void;
  onDeleteDocument?: (photoId: string) => void;
  onOpenAuthModal?: () => void;
  onSelectPerson?: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onSwitchToTree?: (key?: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  isPrivacyRestricted?: boolean;
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  all: { label: 'جميع الوثائق والصور', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  heritage: { label: 'الشعار والتراث', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
  documents: { label: 'وثائق ومخطوطات', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  portraits: { label: 'شخصيات وصور تذكارية', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  events: { label: 'مناسبات وتجمعات العائلة', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  historical: { label: 'أرشيف وتوثيق عام', bg: 'bg-stone-50', text: 'text-stone-900', border: 'border-stone-200' },
};

// IDs and titles of the duplicate original tree manuscript cards that are now unified into the main interactive viewer
const DUPLICATE_ORIGINAL_DOC_IDS = new Set(['photo_doc_original', 'photo_classic_archive']);
const DUPLICATE_ORIGINAL_DOC_TITLES = new Set([
  'مخطوطة شجرة نسب عائلة الفردان الأصلية',
  'صورة التوثيق التاريخي لشجرة آل فردان'
]);

function isDuplicateOriginalDocCard(photo?: ArchivalPhoto | null): boolean {
  if (!photo) return true;
  if (DUPLICATE_ORIGINAL_DOC_IDS.has(photo.id)) return true;
  const trimmedTitle = (photo.title || '').trim();
  if (DUPLICATE_ORIGINAL_DOC_TITLES.has(trimmedTitle)) return true;
  if (photo.url === '/original.jpg' || photo.url === '/original-document.jpg' || photo.url === '/assets/aistudio/original_252a7942.jpg') {
    return true;
  }
  return false;
}

export const DocumentArchiveView: React.FC<DocumentArchiveViewProps> = ({
  photos = [],
  registry,
  isAuthorized = false,
  onOpenAddDocumentModal,
  onOpenEditDocumentModal,
  onDeleteDocument,
  onOpenAuthModal,
  onSelectPerson,
  onSwitchToTree,
  onShowToast,
  isPrivacyRestricted = false
}) => {
  const [docZoom, setDocZoom] = useState(1);
  const [docPan, setDocPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gallery Filter & Search State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLightboxDragging, setIsLightboxDragging] = useState(false);

  // Touch & Mouse Gesture Refs for Lightbox Viewer (1x to 5x Pinch-to-Zoom, Pan, Double-Tap)
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

  // Touch & Mouse Gesture Refs for Main Original Document Viewer (1x to 5x Pinch-to-Zoom, Pan, Double-Tap)
  const docTouchRef = useRef<{
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

  const resetDocTransform = () => {
    setDocZoom(1);
    setDocPan({ x: 0, y: 0 });
    setIsDocDragging(false);
  };

  // Helper to get distance between 2 touch points
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  // --- Lightbox Touch & Mouse Handlers ---
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
        // Double-Tap to toggle zoom (1x <-> 2.5x)
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
      // Transition smoothly from 2-finger pinch to 1-finger pan
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

  // --- Original Document Showcase Touch & Mouse Handlers ---
  const handleDocTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      docTouchRef.current.mode = 'pinch';
      docTouchRef.current.startDist = Math.max(dist, 10);
      docTouchRef.current.startZoom = docZoom;
      docTouchRef.current.startX = midX;
      docTouchRef.current.startY = midY;
      docTouchRef.current.startPanX = docPan.x;
      docTouchRef.current.startPanY = docPan.y;
      setIsDocDragging(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const dt = now - docTouchRef.current.lastTapTime;
      const dx = Math.abs(touch.clientX - docTouchRef.current.lastTapX);
      const dy = Math.abs(touch.clientY - docTouchRef.current.lastTapY);

      if (dt > 0 && dt < 300 && dx < 30 && dy < 30) {
        e.preventDefault();
        if (docZoom > 1.05) {
          resetDocTransform();
        } else {
          setDocZoom(2.5);
          setDocPan({ x: 0, y: 0 });
        }
        docTouchRef.current.lastTapTime = 0;
        docTouchRef.current.mode = 'none';
        return;
      }

      docTouchRef.current.lastTapTime = now;
      docTouchRef.current.lastTapX = touch.clientX;
      docTouchRef.current.lastTapY = touch.clientY;

      if (docZoom > 1) {
        docTouchRef.current.mode = 'pan';
        docTouchRef.current.startX = touch.clientX;
        docTouchRef.current.startY = touch.clientY;
        docTouchRef.current.startPanX = docPan.x;
        docTouchRef.current.startPanY = docPan.y;
        setIsDocDragging(true);
      } else {
        docTouchRef.current.mode = 'none';
      }
    }
  };

  const handleDocTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && docTouchRef.current.mode === 'pinch') {
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleRatio = dist / docTouchRef.current.startDist;
      const nextZoom = Math.min(Math.max(docTouchRef.current.startZoom * scaleRatio, 1), 5);
      setDocZoom(nextZoom);

      if (nextZoom <= 1.02) {
        setDocPan({ x: 0, y: 0 });
      } else {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setDocPan({
          x: docTouchRef.current.startPanX + (midX - docTouchRef.current.startX),
          y: docTouchRef.current.startPanY + (midY - docTouchRef.current.startY)
        });
      }
    } else if (e.touches.length === 1 && docTouchRef.current.mode === 'pan' && docZoom > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setDocPan({
        x: docTouchRef.current.startPanX + (touch.clientX - docTouchRef.current.startX),
        y: docTouchRef.current.startPanY + (touch.clientY - docTouchRef.current.startY)
      });
    }
  };

  const handleDocTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && docZoom > 1) {
      const touch = e.touches[0];
      docTouchRef.current.mode = 'pan';
      docTouchRef.current.startX = touch.clientX;
      docTouchRef.current.startY = touch.clientY;
      docTouchRef.current.startPanX = docPan.x;
      docTouchRef.current.startPanY = docPan.y;
    } else if (e.touches.length === 0) {
      docTouchRef.current.mode = 'none';
      setIsDocDragging(false);
      if (docZoom <= 1.02) {
        setDocZoom(1);
        setDocPan({ x: 0, y: 0 });
      }
    }
  };

  const handleDocMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (docZoom <= 1) return;
    e.preventDefault();
    docTouchRef.current.mode = 'pan';
    docTouchRef.current.startX = e.clientX;
    docTouchRef.current.startY = e.clientY;
    docTouchRef.current.startPanX = docPan.x;
    docTouchRef.current.startPanY = docPan.y;
    setIsDocDragging(true);
  };

  const handleDocMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDocDragging || docTouchRef.current.mode !== 'pan' || docZoom <= 1) return;
    e.preventDefault();
    setDocPan({
      x: docTouchRef.current.startPanX + (e.clientX - docTouchRef.current.startX),
      y: docTouchRef.current.startPanY + (e.clientY - docTouchRef.current.startY)
    });
  };

  const handleDocMouseUp = () => {
    if (isDocDragging) {
      docTouchRef.current.mode = 'none';
      setIsDocDragging(false);
    }
  };

  const handleDocWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isFullscreen && docZoom <= 1) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    setDocZoom(prev => {
      const next = Math.min(Math.max(+(prev + delta).toFixed(2), 1), 5);
      if (next <= 1) setDocPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDocDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (docZoom > 1.05) {
      resetDocTransform();
    } else {
      setDocZoom(2.5);
      setDocPan({ x: 0, y: 0 });
    }
  };

  // Extract the main document record (if customized) for the unified top showcase
  const mainDocPhoto = useMemo(() => {
    return photos.find(p => p && p.id === 'photo_doc_original');
  }, [photos]);

  const classicDocPhoto = useMemo(() => {
    return photos.find(p => p && p.id === 'photo_classic_archive');
  }, [photos]);

  const primaryDocUrl =
    mainDocPhoto?.url && mainDocPhoto.url !== '/assets/aistudio/original_252a7942.jpg'
      ? mainDocPhoto.url
      : '/original-document.jpg';

  // Unified tagged keys from both historical document records
  const unifiedDocTaggedKeys = useMemo(() => {
    const keys = new Set<string>(['ot0', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF', 'o4', 'o13', 'o15']);
    (mainDocPhoto?.taggedPersonKeys || []).forEach(k => keys.add(k));
    (classicDocPhoto?.taggedPersonKeys || []).forEach(k => keys.add(k));
    return Array.from(keys);
  }, [mainDocPhoto, classicDocPhoto]);

  // Deduplicated gallery items: excludes the 2 duplicate original document cards while keeping the Emblem card and all other photos
  const galleryPhotos = useMemo(() => {
    const baseList = Array.isArray(photos) ? photos.filter(p => p && !isDuplicateOriginalDocCard(p)) : [];
    // Ensure the official emblem card is always present in the gallery
    const hasEmblem = baseList.some(p => p.id === 'photo_emblem');
    if (!hasEmblem) {
      baseList.unshift({
        id: 'photo_emblem',
        title: 'شعار وهوية عائلة الفردان الكرزكاني',
        url: '/fardan-logo.jpg',
        category: 'heritage',
        era: 'الإصدار المعتمد',
        location: 'كرزكان - مملكة البحرين',
        notes: 'الشعار الرسمي المعتمد لعائلة الفردان، يرمز لأصالة الشجرة وعمق جذورها التاريخية في أرض كرزكان ومملكة البحرين، ويجمع بين الهيبة والتراث المعماري الأصيل.',
        taggedPersonKeys: ['oF', 'am_mvzm8u6pyafp'],
        createdAt: 1640995200000,
        addedBy: 'إدارة شجرة آل فردان'
      });
    }
    return baseList;
  }, [photos]);

  // Filtered gallery cards
  const filteredPhotos = useMemo(() => {
    return galleryPhotos.filter(photo => {
      if (activeCategory !== 'all' && (photo.category || 'historical') !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const qNorm = normalizeArabic(searchQuery);
        const titleNorm = normalizeArabic(photo.title || '');
        const notesNorm = normalizeArabic(photo.notes || '');
        const eraNorm = normalizeArabic(photo.era || '');
        const locNorm = normalizeArabic(photo.location || '');

        const matchesTagged = (photo.taggedPersonKeys || []).some(key => {
          const person = registry?.people?.get(key);
          if (!person || (isPrivacyRestricted && person.gender === 'f')) return false;
          return normalizeArabic(person.name).includes(qNorm);
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
  }, [galleryPhotos, activeCategory, searchQuery, registry, isPrivacyRestricted]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: galleryPhotos.length };
    galleryPhotos.forEach(p => {
      const cat = p.category || 'historical';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [galleryPhotos]);

  const currentPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
    resetLightboxTransform();
    setSelectedPhotoIndex(prev => (prev! > 0 ? prev! - 1 : filteredPhotos.length - 1));
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
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
    if (!onOpenAddDocumentModal) return;
    const defaultCat = activeCategory !== 'all' ? (activeCategory as ArchivalPhoto['category']) : 'portraits';
    onOpenAddDocumentModal(defaultCat);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl: string) => {
    e.stopPropagation();
    const imgEl = e.currentTarget;
    if (imgEl.dataset.fallbackApplied === 'true') {
      if (originalUrl === '/original-document.jpg' && !imgEl.src.includes('original_252a7942.jpg')) {
        imgEl.src = '/assets/aistudio/original_252a7942.jpg';
        return;
      }
      imgEl.src = getDefaultAvatarDataUri(imgEl.alt || 'وثيقة');
      return;
    }
    const fallback = getFallbackImageUrl(originalUrl);
    imgEl.dataset.fallbackApplied = 'true';
    if (fallback && fallback !== originalUrl) {
      imgEl.src = fallback;
    } else if (originalUrl === '/original-document.jpg') {
      imgEl.src = '/assets/aistudio/original_252a7942.jpg';
    } else {
      imgEl.src = getDefaultAvatarDataUri(imgEl.alt || 'وثيقة');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-['Readex_Pro',sans-serif]">
      {/* 1. Hero Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>الأرشيف الموحد للوثائق والصور التاريخية</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Alexandria'] text-white tracking-tight">
              وثائق وصور عائلة الفردان الكرزكاني
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              يجمع هذا القسم الوثيقة التاريخية الأصلية المحققة عن خط المرحوم الحاج كاظم بن إبراهيم الفردان، وشعار وهوية العائلة، ومعرض الصور التذكارية والمخطوطات المعتمدة في سجل بصري موحد ومتكامل.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                الوثيقة الأصلية المعتمدة: <strong className="text-amber-300">1442 هـ / 2020 م</strong>
              </span>
              {registry && (
                <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                  الأفراد الموثقون بالصور: <strong className="text-white">{registry.stats.photosCount}</strong>
                </span>
              )}
              <span className="px-3 py-1 bg-emerald-800/60 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-200">
                الموطن التأسيسي: <strong className="text-amber-300">كرزكان - مملكة البحرين</strong>
              </span>
            </div>
          </div>

          {/* Admin Upload Action */}
          <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-2.5">
            {isAuthorized ? (
              <div className="space-y-2 text-right">
                <button
                  onClick={handleUploadTrigger}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ رفع صورة أو وثيقة جديدة</span>
                </button>
                <p className="text-[11px] text-emerald-300 flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>وضع المشرف مفعّل: تُحفظ وتُزامن الوثائق والصور لحظياً</span>
                </p>
              </div>
            ) : (
              onOpenAuthModal && (
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 max-w-xs text-right space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>إدارة ورفع الوثائق والصور</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    يمكن لجميع الزوار استعراض وتكبير كافة الوثائق والصور التاريخية بجودة عالية. الإضافة والتعديل مخصصان للمشرف الموثق.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 2. Unified Single Showcase of the Original Family Tree Document (Appears ONLY ONCE with all merged documentary notes) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                الوثيقة التاريخية الأم (المرجع الأول المعتمد)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                1442 هـ / 26 ديسمبر 2020م (محققة عن الأصول)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                كرزكان – مملكة البحرين
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-['Alexandria'] text-slate-900">
              مخطوطة ووثيقة شجرة نسب عائلة الفردان الأصلية
            </h3>
            <p className="text-xs text-slate-500">
              حررت عن خط المرحوم الحاج كاظم بن إبراهيم بن علي الفردان — وحققها وأعدّها الأستاذ عبدالله عبدالكريم حسين الفردان
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {isAuthorized && mainDocPhoto && onOpenEditDocumentModal && (
              <button
                type="button"
                onClick={() => onOpenEditDocumentModal(mainDocPhoto)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="تحديث صورة الوثيقة أو بياناتها"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                <span>تحديث الوثيقة</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsFullscreen(!isFullscreen);
                resetDocTransform();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-amber-300" />
              <span>{isFullscreen ? 'تصغير العرض' : 'استعراض بملء الشاشة'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Zoomable Document Area (Supports 2-Finger Pinch-to-Zoom 1x-5x, 1-Finger Pan, Double-Tap) */}
        <div className="space-y-3">
          <div
            onTouchStart={handleDocTouchStart}
            onTouchMove={handleDocTouchMove}
            onTouchEnd={handleDocTouchEnd}
            onTouchCancel={handleDocTouchEnd}
            onMouseDown={handleDocMouseDown}
            onMouseMove={handleDocMouseMove}
            onMouseUp={handleDocMouseUp}
            onMouseLeave={handleDocMouseUp}
            onWheel={handleDocWheel}
            onDoubleClick={handleDocDoubleClick}
            onContextMenu={e => e.preventDefault()}
            style={{
              touchAction: docZoom > 1 ? 'none' : 'pan-y'
            }}
            className={`relative overflow-hidden rounded-2xl bg-[#e5e7eb] border border-slate-300 p-2 sm:p-4 flex items-center justify-center select-none min-h-[380px] sm:min-h-[480px] max-h-[680px] ${
              docZoom > 1 ? (isDocDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
          >
            <div
              style={{
                transform: `translate3d(${docPan.x}px, ${docPan.y}px, 0) scale(${docZoom})`,
                transformOrigin: 'center center',
                transition: isDocDragging ? 'none' : 'transform 0.18s ease-out'
              }}
              className="max-w-full inline-block select-none pointer-events-none"
            >
              <img
                src={primaryDocUrl}
                alt="مخطوطة ووثيقة شجرة نسب عائلة الفردان الأصلية"
                loading="lazy"
                decoding="async"
                draggable={false}
                onContextMenu={e => e.preventDefault()}
                onError={e => handleImageError(e, primaryDocUrl)}
                className="w-full h-auto max-h-[78vh] object-contain rounded-lg shadow-2xl bg-white select-none pointer-events-none"
              />
            </div>
          </div>

          {/* Fullscreen Original Document Portal Modal (Covers Top Header & Right Sidebar 100% on all Mobile & PWA screens) */}
          {isFullscreen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                dir="rtl"
                className="doc-viewer-backdrop fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in font-['Readex_Pro',sans-serif]"
                onClick={() => {
                  setIsFullscreen(false);
                  resetDocTransform();
                }}
              >
                <div
                  className="doc-viewer-modal bg-white rounded-3xl max-w-6xl w-full h-[94dvh] max-h-[94dvh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Sticky Top Header: Right = Counter, Center = Document Title, Left = Large Clear Close Button (✕) */}
                  <div className="doc-viewer-header sticky top-0 z-50 bg-white border-b border-slate-200 px-4 sm:px-5 pb-3 pt-3 flex items-center justify-between gap-2 shrink-0 shadow-xs">
                    {/* Right: Counter */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 font-mono tabular-nums">
                        1 / 1
                      </span>
                    </div>

                    {/* Center: Document Title */}
                    <h3 className="flex-1 text-center text-xs sm:text-sm font-bold font-['Alexandria'] text-slate-900 truncate px-2">
                      مخطوطة ووثيقة شجرة نسب عائلة الفردان الأصلية
                    </h3>

                    {/* Left: Close Button (✕) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFullscreen(false);
                          resetDocTransform();
                        }}
                        aria-label="إغلاق نافذة الوثيقة"
                        className="flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        <span className="text-base leading-none font-black">✕</span>
                        <span className="hidden sm:inline">إغلاق</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Fullscreen Document Stage */}
                  <div className="doc-viewer-stage-full flex-1 flex flex-col bg-slate-950 overflow-hidden min-h-0">
                    <div
                      onTouchStart={handleDocTouchStart}
                      onTouchMove={handleDocTouchMove}
                      onTouchEnd={handleDocTouchEnd}
                      onTouchCancel={handleDocTouchEnd}
                      onMouseDown={handleDocMouseDown}
                      onMouseMove={handleDocMouseMove}
                      onMouseUp={handleDocMouseUp}
                      onMouseLeave={handleDocMouseUp}
                      onWheel={handleDocWheel}
                      onDoubleClick={handleDocDoubleClick}
                      onContextMenu={e => e.preventDefault()}
                      style={{ touchAction: 'none' }}
                      className={`relative flex-1 flex items-center justify-center overflow-hidden select-none p-2 sm:p-4 ${
                        docZoom > 1 ? (isDocDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                      }`}
                    >
                      <div
                        style={{
                          transform: `translate3d(${docPan.x}px, ${docPan.y}px, 0) scale(${docZoom})`,
                          transformOrigin: 'center center',
                          transition: isDocDragging ? 'none' : 'transform 0.18s ease-out'
                        }}
                        className="w-full h-full flex items-center justify-center select-none pointer-events-none"
                      >
                        <img
                          src={primaryDocUrl}
                          alt="مخطوطة ووثيقة شجرة نسب عائلة الفردان الأصلية"
                          draggable={false}
                          onContextMenu={e => e.preventDefault()}
                          onError={e => handleImageError(e, primaryDocUrl)}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white select-none pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Bottom Zoom Control Bar in Fullscreen */}
                    <div
                      className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-center sm:justify-between gap-2 text-white z-20 shrink-0"
                      onClick={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                    >
                      <span className="text-[11px] text-slate-300 hidden sm:inline">
                        اسحب بإصبعين للتكبير (Pinch-to-Zoom) أو انقر مرتين وحرّك في جميع الاتجاهات
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDocZoom(prev => Math.min(+(prev + 0.5).toFixed(2), 5))}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
                          title="تكبير (+)"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>+ تكبير</span>
                        </button>

                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg tabular-nums text-amber-300">
                          {Math.round(docZoom * 100)}%
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setDocZoom(prev => {
                              const next = Math.max(+(prev - 0.5).toFixed(2), 1);
                              if (next <= 1) setDocPan({ x: 0, y: 0 });
                              return next;
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
                          title="تصغير (-)"
                        >
                          <ZoomOut className="w-4 h-4" />
                          <span>- تصغير</span>
                        </button>

                        <button
                          type="button"
                          onClick={resetDocTransform}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
                          title="إعادة ضبط الحجم"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة ضبط</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

          {/* Dedicated Bottom Control Bar Below Main Document Viewer (+ تكبير / - تصغير / إعادة ضبط) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2.5">
            <span className="text-xs text-slate-600 font-semibold">
              💡 يمكنك تكبير الوثيقة بإصبعين (Pinch-to-Zoom) أو النقر المزدوج وتحريكها في جميع الاتجاهات
            </span>

            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <button
                type="button"
                onClick={() => setDocZoom(prev => Math.min(+(prev + 0.5).toFixed(2), 5))}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="تكبير (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>+ تكبير</span>
              </button>

              <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 tabular-nums">
                {Math.round(docZoom * 100)}%
              </span>

              <button
                type="button"
                onClick={() =>
                  setDocZoom(prev => {
                    const next = Math.max(+(prev - 0.5).toFixed(2), 1);
                    if (next <= 1) setDocPan({ x: 0, y: 0 });
                    return next;
                  })
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="تصغير (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span>- تصغير</span>
              </button>

              <button
                type="button"
                onClick={resetDocTransform}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="إعادة ضبط"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>
        </div>

        {/* Merged Comprehensive Documentary Notes & Transcribed Chronicle (Combines all notes from the 2 former duplicate cards + original text) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          {/* Right Column: Official Inscription Text */}
          <div className="lg:col-span-7 bg-amber-50/70 border-r-4 border-amber-600 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm font-['Alexandria']">
              <BookOpen className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <span>النص التاريخي المثبت على الوثيقة الأصلية (نص الإقرار والتحقيق):</span>
            </div>
            <p className="text-center font-bold text-amber-950 text-sm">
              بسم الله الرحمن الرحيم
            </p>
            <p className="text-xs sm:text-sm leading-loose text-slate-900 font-medium">
              «بعد الاطلاع على الوثيقة التي كتبت بخط المرحوم <strong>الحاج كاظم بن إبراهيم بن علي بن محمد بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي</strong> المتضمنة أبناء الفردان وأيوب ابني عبد الحسين الكرزكاني، وجمع معلومات من قبل والدي وبعض المهتمين بمعرفة أحوال الأنساب من العائلة، قمت بمراجعتها وإضافة الأسماء المنتمية لكل فرد من أفراد العائلة.»
            </p>
            <div className="pt-1 text-left text-xs font-bold text-amber-900">
              — عبدالله عبدالكريم حسين الفردان (السبت 26 ديسمبر 2020م - 12 جمادى الأولى 1442هـ)
            </div>
          </div>

          {/* Left Column: Merged Archival & Documentary Notes from the former cards */}
          <div className="lg:col-span-5 bg-emerald-50/50 border border-emerald-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm font-['Alexandria']">
                <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>الملاحظات التوثيقية والتاريخية المدمجة للوثيقة:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                • <strong>مخطوطة شجرة نسب عائلة الفردان الأصلية:</strong>{' '}
                {mainDocPhoto?.notes ||
                  'الوثيقة التاريخية الكبرى المحفوظة التي جمعت وحققت أسماء ذرية عائلة الفردان الكرزكاني ابتداءً من الجد الأكبر الشيخ علي، وتفرع ذرية عبد الحسين بن يوسف بن الشيخ علي إلى الفردان (الذي يتفرع منه ابنان هما: محمد وحسين وذريتهما) وأيوب (والد فردان الذي يتفرع منه عبدالله وذريته). خطها وحققها المرحوم الحاج كاظم بن إبراهيم بن علي الفردان، وتعد المرجع المعتمد الأول لنسب وتفرعات العائلة.'}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                • <strong>التوثيق التاريخي والأرشيف التراثي:</strong>{' '}
                {classicDocPhoto?.notes ||
                  'توثق مسودة حفظ الأنساب وتدوين أسماء الأجداد والآباء في كرزكان ومملكة البحرين وفروع الامتداد في المنامة والقصبة بالبصرة، والتي شكلت النواة الأولى لتدوين المشجر العائلي المعتمد.'}
              </p>
            </div>

            {/* Tagged Founders & Patriarchs in the Original Document */}
            {registry && unifiedDocTaggedKeys.length > 0 && (
              <div className="pt-3 border-t border-emerald-200/70">
                <div className="text-[11px] font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>الأجداد المؤسسون الموثقون في عمود الوثيقة (اضغط للانتقال للشجرة):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unifiedDocTaggedKeys.map(key => {
                    const person = registry.people.get(key);
                    if (!person) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePersonClick(key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        title="الانتقال إلى موقعه في الشجرة التفاعلية"
                      >
                        <span>{person.name}</span>
                        <ExternalLink className="w-3 h-3 text-emerald-600" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Geographical and Historical Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs pt-1">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <MapPin className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="block font-bold text-slate-900">الموطن التأسيسي</span>
            <span className="text-slate-600">قرية كرزكان – مملكة البحرين</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <MapPin className="w-4 h-4 text-blue-600 mb-1" />
            <span className="block font-bold text-slate-900">فروع الامتداد</span>
            <span className="text-slate-600">المنامة، القصبة في البصرة، والمناطق المجاورة</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <Award className="w-4 h-4 text-purple-600 mb-1" />
            <span className="block font-bold text-slate-900">الأصول الخطية</span>
            <span className="text-slate-600">مخطوطة المرحوم الحاج كاظم بن إبراهيم الفردان</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <Calendar className="w-4 h-4 text-amber-600 mb-1" />
            <span className="block font-bold text-slate-900">التوثيق والمزامنة</span>
            <span className="text-slate-600">إصدار رقمي تفاعلي محدث مع تعاقب الأجيال</span>
          </div>
        </div>
      </div>

      {/* 3. Gallery of Family Emblem, Historical Photos & Uploaded Documents (Zero duplication of Original Document) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-['Alexandria'] text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>معرض الشعار والصور والوثائق التاريخية ({filteredPhotos.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يضم بطاقة شعار وهوية عائلة الفردان الكرزكاني وكافة الصور التاريخية والتذكارية والمخطوطات المرفوعة
            </p>
          </div>
        </div>

        {/* Toolbar: Category Filters, Search & Admin "+ رفع صورة" Button */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Buttons */}
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

          {/* Search Input & "+ رفع صورة" Button */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث في الوثائق، الصور، أو الملاحظات..."
                className="w-full pr-9 pl-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isAuthorized && onOpenAddDocumentModal && (
              <button
                onClick={handleUploadTrigger}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap cursor-pointer"
                title="رفع صورة أو وثيقة جديدة"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ رفع صورة</span>
              </button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold font-['Alexandria'] text-slate-800">
              لا توجد نتائج مطابقة في هذا التصنيف
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `لم نجد أي بطاقة تطابق "${searchQuery}". جرب البحث بكلمة أخرى أو اختر «جميع الوثائق والصور».`
                : 'لا توجد بطاقات مضافة في هذا التصنيف حالياً.'}
            </p>
            {activeCategory !== 'all' && (
              <button
                onClick={() => setActiveCategory('all')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <span>عرض جميع الوثائق والصور</span>
              </button>
            )}
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
                  {/* Thumbnail Container */}
                  <div
                    className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center select-none"
                    onContextMenu={e => e.preventDefault()}
                    onClick={() => {
                      setSelectedPhotoIndex(index);
                      resetLightboxTransform();
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onContextMenu={e => e.preventDefault()}
                      onError={e => handleImageError(e, photo.url)}
                      className={`w-full h-full select-none ${
                        photo.id === 'photo_emblem' ? 'object-contain p-4 bg-gradient-to-br from-slate-50 via-emerald-50/20 to-amber-50/30' : 'object-cover'
                      } group-hover:scale-105 transition-transform duration-500`}
                    />

                    {/* Category Pill */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}>
                        {catInfo.label}
                      </span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 text-slate-900 rounded-xl text-xs font-bold shadow-lg">
                        <Maximize2 className="w-4 h-4 text-emerald-700" />
                        <span>تكبير واستعراض</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
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

                      <h4
                        onClick={() => {
                          setSelectedPhotoIndex(index);
                          resetLightboxTransform();
                        }}
                        className="text-base font-bold font-['Alexandria'] text-slate-900 group-hover:text-emerald-800 transition-colors cursor-pointer leading-snug"
                      >
                        {photo.title}
                      </h4>

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
                      {registry && photo.taggedPersonKeys && photo.taggedPersonKeys.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>الأفراد المرتبطون:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {photo.taggedPersonKeys.map(key => {
                              const person = registry.people.get(key);
                              if (!person || (isPrivacyRestricted && person.gender === 'f')) return null;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handlePersonClick(key)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="الانتقال إلى الشخص في الشجرة التفاعلية"
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

                    {/* Card Footer Actions (View Only - No Download Button) */}
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

                      {/* Admin Edit & Delete Controls */}
                      {isAuthorized && (
                        <div className="flex items-center gap-1">
                          {onOpenEditDocumentModal && (
                            <button
                              type="button"
                              onClick={() => onOpenEditDocumentModal(photo)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="تعديل الصورة والملاحظات"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteDocument && photo.id !== 'photo_emblem' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف «${photo.title}» من الأرشيف؟`)) {
                                  onDeleteDocument(photo.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Fullscreen Lightbox & Notes Modal via React Portal (Covers Top Header & Right Sidebar 100% on all Mobile & PWA screens) */}
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
                  {isAuthorized && onOpenEditDocumentModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditDocumentModal(currentPhoto)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تعديل</span>
                    </button>
                  )}

                  <button
                    type="button"
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

              {/* Modal Content */}
              <div className="doc-viewer-body flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Interactive Image Viewport + Bottom Zoom Controls */}
                <div className="doc-viewer-stage flex-1 flex flex-col bg-slate-950 overflow-hidden min-h-[300px] sm:min-h-[380px] lg:min-h-[480px]">
                  {/* Pinch-to-Zoom & Pan Viewport (`touch-action: none` so two-finger gestures are never blocked) */}
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
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onContextMenu={e => e.preventDefault()}
                        onError={e => handleImageError(e, currentPhoto.url)}
                        className="max-h-full max-w-full object-contain select-none pointer-events-none"
                      />
                    </div>

                    {filteredPhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevPhoto}
                          onTouchStart={e => e.stopPropagation()}
                          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/20 cursor-pointer"
                          title="السابق"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextPhoto}
                          onTouchStart={e => e.stopPropagation()}
                          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/20 cursor-pointer"
                          title="التالي"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}
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

                {/* Sidebar Notes */}
                <div className="doc-viewer-notes w-full lg:w-96 border-t lg:border-t-0 lg:border-r border-slate-200 bg-white p-5 sm:p-6 overflow-y-auto space-y-5">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                      {CATEGORY_MAP[currentPhoto.category || 'historical']?.label || 'أرشيف عام'}
                    </span>
                    <h2 className="text-lg font-bold font-['Alexandria'] text-slate-900 leading-snug">
                      {currentPhoto.title}
                    </h2>
                  </div>

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

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>الملاحظات والوصف التاريخي الكامل:</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {currentPhoto.notes}
                    </div>
                  </div>

                  {registry && currentPhoto.taggedPersonKeys && currentPhoto.taggedPersonKeys.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span>الأفراد الموثقون ({currentPhoto.taggedPersonKeys.length}):</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {currentPhoto.taggedPersonKeys.map(key => {
                          const person = registry.people.get(key);
                          if (!person || (isPrivacyRestricted && person.gender === 'f')) return null;
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
                                type="button"
                                onClick={() => {
                                  setSelectedPhotoIndex(null);
                                  handlePersonClick(key);
                                }}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                عرض في الشجرة 🌳
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
