import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProcessedPerson, FamilyTreeProcessed, MotherInfo } from '../types/family';
import { normalizeArabic, getArabicInitial, getQuadLineageName } from '../data/treeManager';
import { X, Search, Camera, Trash, UserPlus, Check, Sparkles, Heart } from 'lucide-react';
import { FaceCropModal } from './FaceCropModal';
import { fastCompressAvatar } from '../utils/imageDownload';

interface AddEditMemberModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  targetKey: string; // parentKey if adding, or personKey if editing
  registry: FamilyTreeProcessed;
  onClose: () => void;
  defaultGender?: 'm' | 'f';
  onDelete?: (personKey: string) => void;
  onSubmit: (data: {
    name: string;
    gender: 'm' | 'f';
    year: number | null;
    note: string;
    parentKey: string;
    photo?: string | null;
    motherInfo?: MotherInfo | null;
    isDeceased?: boolean;
    deathYear?: number | null;
    birthDate?: string | null;
  }) => void;
}

const PROTECTED_TRUNK_KEYS = new Set(['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF']);

export const AddEditMemberModal: React.FC<AddEditMemberModalProps> = ({
  isOpen,
  mode,
  targetKey,
  registry,
  onClose,
  defaultGender = 'm',
  onDelete,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [year, setYear] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [note, setNote] = useState('');
  const [parentKey, setParentKey] = useState<string>('');
  const [selectedMotherId, setSelectedMotherId] = useState<string>('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDeceased, setIsDeceased] = useState(false);
  const [deathYear, setDeathYear] = useState('');

  // Face crop modal state
  const [rawImageForCrop, setRawImageForCrop] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Parent selector search
  const [isChangingParent, setIsChangingParent] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Initial load
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'add') {
      const parent = registry.people.get(targetKey);
      setName('');
      setGender(defaultGender);
      setYear('');
      setBirthDate('');
      setNote('');
      setParentKey(targetKey);
      if (parent?.spouses && parent.spouses.length === 1) {
        setSelectedMotherId(parent.spouses[0].id);
      } else {
        setSelectedMotherId('');
      }
      setPhoto(null);
      setIsDeceased(false);
      setDeathYear('');
      setIsChangingParent(false);
      setErrorMessage('');
    } else {
      const person = registry.people.get(targetKey);
      if (person) {
        setName(person.name);
        setGender(person.gender);
        setYear(person.year ? String(person.year) : '');
        setBirthDate(person.birthDate || (person.year ? String(person.year) : ''));
        setNote(person.note || '');
        setIsDeceased(person.isDeceased || false);
        setDeathYear(person.deathYear ? String(person.deathYear) : '');
        const pKey = person.parentKey || registry.fardanKey;
        setParentKey(pKey);
        const personFather = registry.people.get(pKey);
        if (person.mother && personFather?.spouses) {
          const matched = personFather.spouses.find(s =>
            (person.mother?.personKey && s.personKey === person.mother.personKey) ||
            (s.name.trim() === person.mother?.name.trim())
          );
          setSelectedMotherId(matched?.id || '');
        } else {
          setSelectedMotherId('');
        }
        setPhoto(person.photo || null);
        setIsChangingParent(false);
        setErrorMessage('');
        setConfirmingDelete(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, targetKey, defaultGender]);

  const currentParent = registry.people.get(parentKey);

  // Filter candidates for parent picker
  const parentCandidates = useMemo(() => {
    if (!parentQuery.trim()) return [];
    const q = normalizeArabic(parentQuery);

    const results: ProcessedPerson[] = [];
    registry.people.forEach((p: ProcessedPerson) => {
      if (p.deleted) return;
      // When editing, can't choose oneself or one's descendants as parent (cycle prevention)
      if (mode === 'edit' && p.key === targetKey) return;

      const normName = normalizeArabic(p.name);
      const quad = getQuadLineageName(p.key, registry.people, 4);
      const normQuad = normalizeArabic(quad);
      if (normName.includes(q) || normQuad.includes(q)) {
        results.push(p);
      }
    });

    return results.slice(0, 20);
  }, [parentQuery, registry, mode, targetKey]);

  // Handle Photo File Pick with Instant Canvas Pre-compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (PNG أو JPG)');
      return;
    }

    try {
      // Fast offscreen Canvas pre-compression so massive 15MB phone photos open in <10ms
      const quickUrl = await fastCompressAvatar(file, 900, 0.85);
      setRawImageForCrop(quickUrl);
      setIsCropModalOpen(true);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        setRawImageForCrop(rawUrl);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم الفرد');
      return;
    }

    let parsedYear: number | null = null;
    let birthDateVal: string | null = null;
    const bStr = birthDate.trim() || year.trim();
    if (bStr) {
      birthDateVal = bStr;
      const match = bStr.match(/\b(18|19|20)\d{2}\b/);
      if (match) {
        parsedYear = parseInt(match[0], 10);
      }
    }

    let parsedDeathYear: number | null = null;
    if (isDeceased && deathYear.trim()) {
      const num = parseInt(deathYear.trim(), 10);
      if (isNaN(num) || num < 1800 || num > 2035) {
        setErrorMessage('يرجى إدخال سنة وفاة صحيحة بأربعة أرقام (مثال: 2015)');
        return;
      }
      parsedDeathYear = num;
    }

    if (!parentKey) {
      setErrorMessage('يرجى تحديد الأب');
      return;
    }

    let motherInfo: MotherInfo | null = null;
    if (selectedMotherId && currentParent?.spouses) {
      const sp = currentParent.spouses.find(s => s.id === selectedMotherId);
      if (sp) {
        motherInfo = {
          name: sp.name,
          isFromFamily: sp.isFromFamily,
          personKey: sp.personKey,
          familyOrigin: sp.familyOrigin || (sp.isFromFamily ? 'عائلة آل فردان' : 'من خارج العائلة'),
          notes: sp.notes
        };
      }
    }

    onSubmit({
      name: name.trim(),
      gender,
      year: parsedYear,
      birthDate: birthDateVal,
      note: note.trim(),
      parentKey,
      photo,
      motherInfo,
      isDeceased,
      deathYear: parsedDeathYear
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-['Alexandria'] text-slate-900">
                {mode === 'add' ? 'إضافة فرد إلى العائلة' : 'تعديل بيانات الفرد'}
              </h2>
              <p className="text-xs text-slate-500">
                {currentParent ? `يُنسب إلى: ${currentParent.name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Gender Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">الصلة والجنس</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('m')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  gender === 'm'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>ابن (ذكر)</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('f')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  gender === 'f'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>ابنة (أنثى)</span>
              </button>
            </div>
          </div>

          {/* Full Name & Birth Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الأول <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: أحمد، علي، فاطمة..."
                maxLength={80}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ أو سنة الميلاد <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                placeholder="مثال: 1990 أو 1990/04/15"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Death Status Section (زر الوفاة باللون الأسود وسنة الوفاة) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">حالة الفرد (على قيد الحياة / متوفى)</span>
                <span className="text-[10px] text-slate-500">حدد ما إذا كان الفرد متوفياً لتوثيق سنة الوفاة وإظهار علامة الوفاة</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDeceased(!isDeceased)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isDeceased
                    ? 'bg-zinc-950 text-white border border-zinc-800 ring-2 ring-zinc-900/30'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isDeceased ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>{isDeceased ? 'متوفى 🖤' : 'على قيد الحياة'}</span>
              </button>
            </div>

            {isDeceased && (
              <div className="pt-2 border-t border-slate-200/80 animate-in fade-in">
                <label className="block text-xs font-bold text-zinc-900 mb-1">
                  سنة الوفاة (ميلادية) <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={deathYear}
                  onChange={e => setDeathYear(e.target.value)}
                  placeholder="مثال: 2018 أو 1985"
                  maxLength={4}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>
            )}
          </div>

          {/* Parent Selection */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">الأب والنسب:</span>
              <button
                type="button"
                onClick={() => setIsChangingParent(!isChangingParent)}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                {isChangingParent ? 'إغلاق البحث' : 'تغيير الأب'}
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-900">
              {currentParent ? (getQuadLineageName(currentParent.key, registry.people, 4) || currentParent.name) : 'غير محدد'}
            </p>

            {isChangingParent && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={parentQuery}
                    onChange={e => setParentQuery(e.target.value)}
                    placeholder="ابحث بالاسم الرباعي لاختيار الأب الصحيح..."
                    className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1">
                  {parentCandidates.map(cand => (
                    <button
                      key={`cand-${cand.key}`}
                      type="button"
                      onClick={() => {
                        setParentKey(cand.key);
                        setIsChangingParent(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-emerald-50 text-right gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {getQuadLineageName(cand.key, registry.people, 4) || cand.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          الجيل {cand.generation} {cand.branchName ? `· فرع ${cand.branchName}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full flex-shrink-0">
                        الجيل {cand.generation}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mother Selection from Father's Spouses */}
          {currentParent && currentParent.spouses && currentParent.spouses.length > 0 && (
            <div className="p-3.5 bg-rose-50/60 border border-rose-200/90 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-200" />
                  <span>الوالدة (من زوجات الأب {currentParent.name}):</span>
                </div>
                {currentParent.spouses.length > 1 && (
                  <span className="text-[10px] bg-rose-200/80 text-rose-900 font-bold px-2 py-0.5 rounded-full">
                    الأب متزوج من {currentParent.spouses.length} زوجات
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMotherId('')}
                  className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                    !selectedMotherId
                      ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>لم تُحدد الوالدة بعد</span>
                </button>

                {currentParent.spouses.map(sp => {
                  const isSelected = selectedMotherId === sp.id;
                  return (
                    <button
                      key={`modal-sp-m-${sp.id}`}
                      type="button"
                      onClick={() => setSelectedMotherId(sp.id)}
                      className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                          : 'bg-white text-slate-800 border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block font-bold truncate">🌸 {sp.name}</span>
                        <span className={`text-[10px] block truncate ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                          {sp.isFromFamily ? 'من عائلة الفردان' : sp.familyOrigin || 'من خارج العائلة'}
                        </span>
                      </div>
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Avatar / Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              صورة الفرد <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 text-lg font-bold">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{name.trim() ? getArabicInitial(name) : '؟'}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photo ? 'تغيير الصورة' : 'رفع صورة'}</span>
                </button>

                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="حذف الصورة"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو نبذة <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="مثال: المهنة، السكن، معلومات تاريخية..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          {/* Live Preview */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 leading-relaxed">
            <span className="block font-bold text-emerald-800 mb-0.5">معاينة الاسم في الشجرة:</span>
            {name.trim() ? name.trim() : '…'}{' '}
            {gender === 'f' ? 'بنت' : 'بن'}{' '}
            {currentParent ? currentParent.name : '…'}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {mode === 'edit' && onDelete && !PROTECTED_TRUNK_KEYS.has(targetKey) && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between gap-2">
                {!confirmingDelete ? (
                  <>
                    <span className="text-xs font-semibold text-rose-800">
                      هل ترغب في إلغاء أو حذف هذا الاسم من الشجرة؟
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="px-3 py-1.5 bg-white hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>إلغاء / حذف الاسم</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-900">
                      تأكيد حذف «{name}» وتحديث GitHub و Firebase فوراً؟
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        تراجع
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(targetKey);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span>تأكيد الحذف النهائي</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{mode === 'add' ? 'إضافة إلى الشجرة وحفظ سحابي' : 'حفظ التعديلات وتحديث السحابة'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Face Crop Modal */}
      {isCropModalOpen && rawImageForCrop && (
        <FaceCropModal
          isOpen={isCropModalOpen}
          imageSrc={rawImageForCrop}
          memberName={name.trim() || 'الفرد'}
          onClose={() => {
            setIsCropModalOpen(false);
            setRawImageForCrop('');
          }}
          onCropComplete={(croppedUrl) => {
            setPhoto(croppedUrl);
            setIsCropModalOpen(false);
            setRawImageForCrop('');
          }}
        />
      )}
    </div>
  );
};
