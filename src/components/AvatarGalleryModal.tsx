import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Upload, Images, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';
import { sanitizeAvatarUrl, getDefaultAvatarDataUri, markAvatarUrlFailed } from './MemberAvatar';

interface AvailableAvatar {
  filename: string;
  url: string;
}

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  personKey: string;
  currentPhoto?: string | null;
  onSelectPhoto: (url: string) => void;
  onUploadNew: () => void;
  onRemovePhoto?: () => void;
}

export const AvatarGalleryModal: React.FC<AvatarGalleryModalProps> = ({
  isOpen,
  onClose,
  personName,
  personKey,
  currentPhoto,
  onSelectPhoto,
  onUploadNew,
  onRemovePhoto,
}) => {
  const [avatars, setAvatars] = useState<AvailableAvatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentPhoto || null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUrl(currentPhoto || null);
    setLoading(true);

    apiFetch('/api/available-avatars')
      .then(res => {
        if (!res.ok) throw new Error('API not available in static mode');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvatars(data);
        } else {
          return fetch('/avatars-manifest.json')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setAvatars(d); });
        }
      })
      .catch(() => {
        fetch('/avatars-manifest.json')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setAvatars(data);
            }
          })
          .catch(err => {
            console.error('Failed to load avatars manifest:', err);
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, currentPhoto]);

  const filteredAvatars = useMemo(() => {
    const validList = avatars.filter(a => a && a.url && sanitizeAvatarUrl(a.url) !== null);
    if (!search.trim()) return validList;
    const q = search.toLowerCase().trim();
    return validList.filter(a => a.filename.toLowerCase().includes(q));
  }, [avatars, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-['Readex_Pro',sans-serif]">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Alexandria']">
                اختيار صورة لـ «{personName}»
              </h3>
              <p className="text-xs text-slate-500">
                اختر من الصور المرفوعة على GitHub ({avatars.length} صورة متوفرة) أو ارفع صورة جديدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search + Upload New Button */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم ملف الصورة..."
              className="w-full pr-9 pl-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentPhoto && onRemovePhoto && (
              <button
                type="button"
                onClick={() => {
                  onRemovePhoto();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الصورة الحالية</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onUploadNew();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع صورة جديدة من الجهاز</span>
            </button>
          </div>
        </div>

        {/* Body: Grid of Avatars */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
              <p className="text-sm font-semibold">جارِ تحميل الصور المرفوعة من GitHub...</p>
            </div>
          ) : filteredAvatars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertCircle className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">لا توجد صور مطابقة</p>
              <p className="text-xs text-slate-400 mt-1">تأكد من كتابة الاسم أو ارفع صورة جديدة من جهازك</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {filteredAvatars.map((item, idx) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <button
                    key={`${item.filename}-${idx}`}
                    type="button"
                    onClick={() => setSelectedUrl(item.url)}
                    className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 shadow-md scale-102'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm hover:scale-101'
                    }`}
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center mb-1.5">
                      <img
                        src={item.url}
                        alt={item.filename}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.stopPropagation();
                          markAvatarUrlFailed(item.url);
                          e.currentTarget.src = getDefaultAvatarDataUri(item.filename);
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] text-slate-600 text-center truncate w-full px-1 font-medium"
                      title={item.filename}
                    >
                      {item.filename}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-500">
            {selectedUrl ? (
              <span className="text-emerald-700 font-bold">تم اختيار صورة جاهزة للتعيين</span>
            ) : (
              <span>انقر على أي صورة لتعيينها لـ «{personName}»</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              disabled={!selectedUrl || selectedUrl === currentPhoto}
              onClick={() => {
                if (selectedUrl) {
                  onSelectPhoto(selectedUrl);
                  onClose();
                }
              }}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد وتثبيت الصورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
