import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  User,
  Move
} from 'lucide-react';

interface PersonPhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null | undefined;
  personName: string;
  personKey?: string;
  generation?: number;
  branchName?: string;
  lineageTitle?: string;
}

export const PersonPhotoLightboxModal: React.FC<PersonPhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  personName,
  generation,
  branchName,
  lineageTitle,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);

  // Reset zoom and pan whenever modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setIsDragging(false);
      setImageError(false);
    }
  }, [isOpen, photoUrl]);

  // Keyboard navigation: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(prev + 0.3, 4));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel(prev => {
          const next = Math.max(prev - 0.3, 1);
          if (next === 1) setPanOffset({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.4, 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.4, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Toggle zoom on double click
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomLevel > 1) {
      handleResetZoom();
    } else {
      setZoomLevel(2.2);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev + 0.25, 4));
    } else {
      setZoomLevel(prev => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag to pan image when zoomed
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  if (!isOpen || !photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif] overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <User className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-['Alexandria'] text-slate-900 leading-tight truncate">
                  صورة «{personName}»
                </h3>
                {branchName && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    فرع {branchName}
                  </span>
                )}
                {generation && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                    الجيل {generation}
                  </span>
                )}
              </div>
              {lineageTitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                  {lineageTitle}
                </p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex-shrink-0"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Display Area with Pure Zooming and Pan */}
        <div
          className={`relative bg-slate-950 flex-1 min-h-[340px] sm:min-h-[460px] max-h-[66vh] overflow-hidden flex items-center justify-center p-4 ${
            zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageError ? (
            <div className="text-center text-slate-400 p-8 flex flex-col items-center justify-center gap-3">
              <User className="w-16 h-16 text-slate-600" />
              <p className="text-sm font-medium">تعذر تحميل الصورة أو أن الملف غير متوفر</p>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out select-none"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
              }}
            >
              <img
                src={photoUrl}
                alt={personName}
                onError={() => setImageError(true)}
                draggable={false}
                className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl transition-shadow select-none pointer-events-none"
                style={{
                  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6))'
                }}
              />
            </div>
          )}

          {/* Floating Zoom Controls Bar */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer active:scale-95"
              title="تكبير (+)"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer active:scale-95"
              title="تصغير (-)"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer active:scale-95"
              title="إعادة ضبط الحجم الطبيعي (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
            <span className="w-px h-4 bg-white/20 mx-0.5" />
            <span className="text-xs font-mono font-bold text-amber-300 px-1.5 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {zoomLevel > 1 && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-[11px] px-3 py-1 rounded-full border border-white/10 pointer-events-none">
              <Move className="w-3 h-3 text-amber-300" />
              <span>اسحب للتحريك</span>
            </div>
          )}
        </div>

        {/* Clean Footer Bar - Focused solely on zoom info & close */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>انقر مرتين للتكبير السريع • استخدم عجلة الفأرة للتكبير والتصغير</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

