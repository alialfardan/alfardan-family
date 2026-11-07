import React, { useState, useEffect, useRef } from 'react';
import { ArchivalPhoto, FamilyTreeProcessed } from '../types/family';
import {
  X,
  Upload,
  Image as ImageIcon,
  Calendar,
  MapPin,
  FileText,
  Users,
  AlertCircle,
  Check,
  Search,
  Loader2,
  Download
} from 'lucide-react';
import { getQuadLineageName, searchFamilyMembers } from '../data/treeManager';
import { compressImageFile, downloadImageSmoothly } from '../utils/imageDownload';

interface AddEditArchivalPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoData: Omit<ArchivalPhoto, 'id' | 'createdAt'> & { id?: string }) => void;
  photoToEdit?: ArchivalPhoto | null;
  registry: FamilyTreeProcessed;
  defaultCategory?: ArchivalPhoto['category'];
}

const CATEGORIES: { key: ArchivalPhoto['category']; label: string }[] = [
  { key: 'documents', label: 'وثائق ومخطوطات تاريخية' },
  { key: 'portraits', label: 'شخصيات وصور تذكارية' },
  { key: 'events', label: 'مناسبات وتجمعات العائلة' },
  { key: 'heritage', label: 'تراث ومعالم كرزكان' },
  { key: 'historical', label: 'أرشيف وتوثيق عام' },
];

export const AddEditArchivalPhotoModal: React.FC<AddEditArchivalPhotoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  photoToEdit,
  registry,
  defaultCategory = 'documents'
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [era, setEra] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<ArchivalPhoto['category']>(defaultCategory);
  const [taggedPersonKeys, setTaggedPersonKeys] = useState<string[]>([]);
  const [addedBy, setAddedBy] = useState('إدارة الأرشيف العائلي');

  const [personSearch, setPersonSearch] = useState('');
  const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photoToEdit) {
      setTitle(photoToEdit.title || '');
      setUrl(photoToEdit.url || '');
      setNotes(photoToEdit.notes || '');
      setEra(photoToEdit.era || '');
      setLocation(photoToEdit.location || '');
      setCategory(photoToEdit.category || defaultCategory);
      setTaggedPersonKeys(photoToEdit.taggedPersonKeys || []);
      setAddedBy(photoToEdit.addedBy || 'إدارة الأرشيف العائلي');
    } else {
      setTitle('');
      setUrl('');
      setNotes('');
      setEra('');
      setLocation('كرزكان - مملكة البحرين');
      setCategory(defaultCategory);
      setTaggedPersonKeys([]);
      setAddedBy('إدارة الأرشيف العائلي');
    }
    setError(null);
    setPersonSearch('');
    setIsCompressing(false);
  }, [photoToEdit, isOpen, defaultCategory]);

  if (!isOpen) return null;

  // Search filtered people for tagging
  const matchedPeople = (() => {
    if (!personSearch.trim()) return [];
    return searchFamilyMembers(personSearch, registry.people, 15)
      .filter(p => !taggedPersonKeys.includes(p.key));
  })();

  const processSelectedFile = async (file: File) => {
    setIsCompressing(true);
    setError(null);
    try {
      const compressedDataUrl = await compressImageFile(file, 1400, 320000);
      setUrl(compressedDataUrl);
      if (!title.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        if (baseName && !/^(img|image|photo|whatsapp|dsc|screenshot)/i.test(baseName)) {
          setTitle(baseName);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر معالجة الصورة المختارة.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleAddTag = (key: string) => {
    if (!taggedPersonKeys.includes(key)) {
      setTaggedPersonKeys(prev => [...prev, key]);
    }
    setPersonSearch('');
    setIsPersonSearchOpen(false);
  };

  const handleRemoveTag = (key: string) => {
    setTaggedPersonKeys(prev => prev.filter(k => k !== key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCompressing) {
      setError('يرجى الانتظار لحظة حتى يكتمل تجهيز الصورة...');
      return;
    }

    if (!url.trim()) {
      setError('يرجى رفع ملف الصورة أو الوثيقة من جهازك أولاً.');
      return;
    }

    const finalTitle = title.trim() || (category === 'documents' ? 'وثيقة تاريخية لعائلة الفردان' : 'صورة أرشيفية لعائلة الفردان');
    const finalNotes = notes.trim() || `تم توثيق وحفظ «${finalTitle}» في الأرشيف الرقمي المعتمد لشجرة عائلة الفردان الكرزكاني.`;

    onSubmit({
      id: photoToEdit?.id,
      title: finalTitle,
      url: url.trim(),
      notes: finalNotes,
      era: era.trim() || undefined,
      location: location.trim() || undefined,
      category,
      taggedPersonKeys,
      addedBy: addedBy.trim() || 'إدارة الأرشيف العائلي'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm overflow-y-auto font-['Readex_Pro',sans-serif] animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 text-slate-800 my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-800 text-emerald-200">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Alexandria']">
                {photoToEdit
                  ? 'تعديل الصورة / الوثيقة والملاحظات'
                  : category === 'documents'
                  ? 'رفع وثيقة أو مخطوطة جديدة للأرشيف'
                  : 'رفع صورة أرشيفية جديدة للأرشيف'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                رفع ومزامنة فورية على جميع المواقع والأجهزة عبر السحابة وGitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Preview & Upload Box with Drag & Drop */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ملف الصورة أو الوثيقة <span className="text-rose-500">*</span>
            </label>

            {isCompressing ? (
              <div className="border-2 border-emerald-400 bg-emerald-50/40 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
                <p className="text-xs font-bold text-emerald-900">
                  جاري معالجة وضغط الصورة بجودة عالية للمزامنة الفورية...
                </p>
              </div>
            ) : url ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-100 shadow-inner group max-h-72 flex items-center justify-center">
                <img src={url} alt="معاينة الصورة" className="max-h-72 w-auto object-contain" />
                <div className="absolute inset-0 bg-slate-900/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>تغيير الصورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadImageSmoothly(url, title || 'fardan-archive.jpg')}
                    className="px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الصورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-600 bg-emerald-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-2.5 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  اضغط هنا لاختيار صورة أو وثيقة من جهازك (أو اسحبها وأفلتها هنا)
                </p>
                <p className="text-[11px] text-slate-500">
                  يدعم جميع صيغ الصور (JPG, PNG, WebP, HEIC) مع معالجة تلقائية للنشر المباشر على كل المواقع
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Optional URL input fallback */}
            <div className="mt-2 text-right">
              <input
                type="text"
                value={url.startsWith('data:') ? '' : url}
                onChange={e => setUrl(e.target.value)}
                placeholder="أو الصق رابط الصورة المباشر هنا (URL)..."
                className="w-full px-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان الصورة أو الوثيقة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: وثيقة نسب آل فردان أو اجتماع أفراد العائلة في كرزكان"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تصنيف الصورة / الوثيقة
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    category === cat.key
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Era / Date & Location (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>الفترة الزمنية أو السنة</span>
              </label>
              <input
                type="text"
                value={era}
                onChange={e => setEra(e.target.value)}
                placeholder="مثال: 1985م أو السبعينيات أو 1442 هـ"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>المكان / المنطقة</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="مثال: كرزكان - البحرين"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Notes (Detailed context and story) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>الملاحظات والوصف التاريخي (اختياري)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                القصة، التوثيق، والمناسبة
              </span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب هنا التفاصيل والملاحظات المتعلقة بالصورة أو الوثيقة..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Tagged Persons from Tree */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>ربط أفراد من شجرة العائلة بالصورة (اختياري)</span>
            </label>

            {/* Currently tagged chips */}
            {taggedPersonKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {taggedPersonKeys.map(key => {
                  const p = registry.people.get(key);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-semibold"
                    >
                      <span>{p ? (getQuadLineageName(p.key, registry.people, 4) || p.name) : key}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(key)}
                        className="text-emerald-700 hover:text-rose-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Person search input for tagging */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={personSearch}
                onChange={e => {
                  setPersonSearch(e.target.value);
                  setIsPersonSearchOpen(true);
                }}
                onFocus={() => setIsPersonSearchOpen(true)}
                placeholder="ابحث بالاسم لربط فرد من الشجرة بالصورة..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />

              {isPersonSearchOpen && matchedPeople.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-20 p-1 divide-y divide-slate-100">
                  {matchedPeople.map(person => (
                    <button
                      key={person.key}
                      type="button"
                      onClick={() => handleAddTag(person.key)}
                      className="w-full text-right px-3 py-1.5 hover:bg-emerald-50 rounded-lg text-xs flex items-center justify-between transition-colors gap-2 cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900 truncate">{getQuadLineageName(person.key, registry.people, 4) || person.name}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">الجيل {person.generation}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{photoToEdit ? 'حفظ التعديلات ونشرها مباشرة' : 'رفع وحفظ الصورة على جميع المواقع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
