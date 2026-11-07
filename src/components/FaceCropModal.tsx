import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, Sparkles, User, RefreshCw } from 'lucide-react';

interface FaceCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  memberName?: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const FaceCropModal: React.FC<FaceCropModalProps> = ({
  isOpen,
  imageSrc,
  memberName,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState<number>(1.25);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Viewport box size in modal (px)
  const VIEWPORT_SIZE = 280;

  // On image load, compute initial scale and position focusing on the upper part (face area)
  useEffect(() => {
    if (!imageSrc) return;
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);

      // Default smart face centering:
      // If photo is tall (portrait), faces are typically 15%-25% down from the top
      const baseScale = Math.max(VIEWPORT_SIZE / img.naturalWidth, VIEWPORT_SIZE / img.naturalHeight);
      const initialZoom = 1.25;
      const effectiveScale = baseScale * initialZoom;
      const renderedW = img.naturalWidth * effectiveScale;
      const renderedH = img.naturalHeight * effectiveScale;

      const initialX = (VIEWPORT_SIZE - renderedW) / 2;
      // Focus on upper portion if portrait
      let initialY = (VIEWPORT_SIZE - renderedH) / 2;
      if (img.naturalHeight > img.naturalWidth) {
        // Shift up to center the face
        const faceTopOffset = -renderedH * 0.12;
        const minY = VIEWPORT_SIZE - renderedH;
        initialY = Math.max(minY, Math.min(0, faceTopOffset));
      }

      setPosition({ x: initialX, y: initialY });
      setZoom(initialZoom);
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute base scale to cover viewport
  const baseScale = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    return Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
  }, [naturalSize]);

  const currentScale = baseScale * zoom;
  const renderedWidth = naturalSize.width * currentScale;
  const renderedHeight = naturalSize.height * currentScale;

  // Clamp position to keep viewport fully covered
  const clampPosition = useCallback((x: number, y: number, z = zoom) => {
    const scale = baseScale * z;
    const rw = naturalSize.width * scale;
    const rh = naturalSize.height * scale;

    const minX = VIEWPORT_SIZE - rw;
    const maxX = 0;
    const minY = VIEWPORT_SIZE - rh;
    const maxY = 0;

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }, [baseScale, naturalSize]);

  // Pointer Drag Handlers (touch & mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition(clampPosition(newX, newY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  // Zoom changes
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3.5, Math.max(1.0, newZoom));
    // Center-based zoom adjustment
    const ratio = clampedZoom / zoom;
    const newX = VIEWPORT_SIZE / 2 - (VIEWPORT_SIZE / 2 - position.x) * ratio;
    const newY = VIEWPORT_SIZE / 2 - (VIEWPORT_SIZE / 2 - position.y) * ratio;

    setZoom(clampedZoom);
    setPosition(clampPosition(newX, newY, clampedZoom));
  };

  // Quick Preset: Focus Face (Upper 20% zoomed)
  const handleFaceFocusPreset = () => {
    const targetZoom = 1.45;
    const scale = baseScale * targetZoom;
    const rw = naturalSize.width * scale;
    const rh = naturalSize.height * scale;

    const newX = (VIEWPORT_SIZE - rw) / 2;
    let newY = (VIEWPORT_SIZE - rh) / 2;
    if (naturalSize.height > naturalSize.width) {
      newY = Math.max(VIEWPORT_SIZE - rh, Math.min(0, -rh * 0.15));
    }
    setZoom(targetZoom);
    setPosition(clampPosition(newX, newY, targetZoom));
  };

  // Quick Preset: Center Full Image
  const handleCenterPreset = () => {
    const targetZoom = 1.0;
    const scale = baseScale * targetZoom;
    const rw = naturalSize.width * scale;
    const rh = naturalSize.height * scale;
    setZoom(targetZoom);
    setPosition({
      x: (VIEWPORT_SIZE - rw) / 2,
      y: (VIEWPORT_SIZE - rh) / 2
    });
  };

  // Generate cropped output
  const handleConfirmCrop = () => {
    if (!imageRef.current || !naturalSize.width) return;

    const OUTPUT_SIZE = 350;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background to preserve clean edges
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Source coordinates on natural image
    // Viewport (0,0) corresponds to image point (-position.x / currentScale, -position.y / currentScale)
    const sx = -position.x / currentScale;
    const sy = -position.y / currentScale;
    const sWidth = VIEWPORT_SIZE / currentScale;
    const sHeight = VIEWPORT_SIZE / currentScale;

    // Handle rotation if applied
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-OUTPUT_SIZE / 2, -OUTPUT_SIZE / 2);
    }

    ctx.drawImage(
      imageRef.current,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    if (rotation !== 0) {
      ctx.restore();
    }

    // High fidelity lightweight 350x350 JPEG (~14KB) for instant Firebase storage
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    onCropComplete(dataUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-['Readex_Pro',sans-serif]">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Alexandria']">
                ضبط وتوسيط صورة الوجه
              </h3>
              <p className="text-xs text-emerald-200">
                {memberName ? `للفرد: ${memberName}` : 'حرك وكبّر الصورة لوضع الوجه في المنتصف تماماً'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Viewport & Instructions */}
        <div className="p-5 flex flex-col items-center space-y-4 overflow-y-auto">
          {/* Tip Banner */}
          <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-semibold flex items-center justify-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
            <span>اسحب الصورة بالأصبع أو الفأرة لوضع ملامح الوجه داخل الدائرة الذهبية</span>
          </div>

          {/* Interactive Crop Stage */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-700 select-none touch-none cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            {/* The Image being panned/zoomed */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                width: renderedWidth || 'auto',
                height: renderedHeight || 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate3d(${position.x}px, ${position.y}px, 0px) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out'
              }}
              className="absolute pointer-events-none"
            />

            {/* Circular Avatar Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <svg width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} className="w-full h-full">
                <defs>
                  <mask id="avatarHole">
                    <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                    <circle
                      cx={VIEWPORT_SIZE / 2}
                      cy={VIEWPORT_SIZE / 2}
                      r={VIEWPORT_SIZE / 2 - 12}
                      fill="black"
                    />
                  </mask>
                </defs>
                {/* Darkened backdrop outside avatar circle */}
                <rect
                  width={VIEWPORT_SIZE}
                  height={VIEWPORT_SIZE}
                  fill="rgba(15, 23, 42, 0.72)"
                  mask="url(#avatarHole)"
                />
                {/* Golden Circle Border */}
                <circle
                  cx={VIEWPORT_SIZE / 2}
                  cy={VIEWPORT_SIZE / 2}
                  r={VIEWPORT_SIZE / 2 - 12}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                {/* Center Crosshair / Facial Alignment Guide */}
                <line
                  x1={VIEWPORT_SIZE / 2 - 18}
                  y1={VIEWPORT_SIZE / 2}
                  x2={VIEWPORT_SIZE / 2 + 18}
                  y2={VIEWPORT_SIZE / 2}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
                <line
                  x1={VIEWPORT_SIZE / 2}
                  y1={VIEWPORT_SIZE / 2 - 18}
                  x2={VIEWPORT_SIZE / 2}
                  y2={VIEWPORT_SIZE / 2 + 18}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
                {/* Golden Face Eye-Line Guide */}
                <line
                  x1={VIEWPORT_SIZE / 2 - 40}
                  y1={VIEWPORT_SIZE / 2 - 32}
                  x2={VIEWPORT_SIZE / 2 + 40}
                  y2={VIEWPORT_SIZE / 2 - 32}
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-center gap-2 w-full pt-1">
            <button
              type="button"
              onClick={handleFaceFocusPreset}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>تركيز ذكي على الوجه</span>
            </button>

            <button
              type="button"
              onClick={handleCenterPreset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>إعادة التوسيط</span>
            </button>

            <button
              type="button"
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="تدوير الصورة 90 درجة"
            >
              <RotateCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Zoom Slider Control */}
          <div className="w-full space-y-1.5 px-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
              <span className="flex items-center gap-1">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                <span>تصغير</span>
              </span>
              <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {Math.round(zoom * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <span>تكبير الوجه</span>
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.15)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                -
              </button>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={e => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
              />
              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.15)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>اعتماد وحفظ صورة الوجه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
