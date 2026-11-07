import React, { useState, useMemo } from 'react';
import { ProcessedPerson, FamilyTreeProcessed, MotherInfo } from '../types/family';
import { BRANCH_COLORS, getArabicInitial, getQuadLineageName, normalizeArabic } from '../data/treeManager';
import { X, Search, Heart, User, Sparkles, Check, ChevronDown } from 'lucide-react';

interface AddEditMotherModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: ProcessedPerson;
  motherToEdit?: MotherInfo | null;
  registry: FamilyTreeProcessed;
  onSubmit: (mother: MotherInfo) => void;
  onDelete?: () => void;
}

export const AddEditMotherModal: React.FC<AddEditMotherModalProps> = ({
  isOpen,
  onClose,
  person,
  motherToEdit,
  registry,
  onSubmit,
  onDelete
}) => {
  const [isFromFamily, setIsFromFamily] = useState<boolean>(() => {
    return motherToEdit ? motherToEdit.isFromFamily : true;
  });

  const [selectedPersonKey, setSelectedPersonKey] = useState<string>(() => {
    return motherToEdit?.personKey || '';
  });

  const [manualName, setManualName] = useState<string>(() => {
    return motherToEdit?.name || '';
  });

  const [familyOrigin, setFamilyOrigin] = useState<string>(() => {
    return motherToEdit?.familyOrigin || '';
  });

  const [notes, setNotes] = useState<string>(() => {
    return motherToEdit?.notes || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Father of person
  const father = person.parentKey ? registry.people.get(person.parentKey) : null;
  const fatherSpouses = father?.spouses || [];

  // All daughters/females registered in tree
  const familyDaughters = useMemo(() => {
    const list: ProcessedPerson[] = [];
    registry.people.forEach(p => {
      if (!p.deleted && p.gender === 'f' && p.key !== person.key) {
        list.push(p);
      }
    });

    list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return list;
  }, [registry, person.key]);

  // Filtered daughters for dropdown
  const filteredDaughters = useMemo(() => {
    if (!searchQuery.trim()) return familyDaughters.slice(0, 30);
    const q = normalizeArabic(searchQuery.trim());
    return familyDaughters.filter(d => {
      const normName = normalizeArabic(d.name);
      const parent = d.parentKey ? registry.people.get(d.parentKey) : null;
      const normParent = parent ? normalizeArabic(parent.name) : '';
      const quad = getQuadLineageName(d.key, registry.people, 4);
      const normQuad = normalizeArabic(quad);
      return (
        normName.includes(q) ||
        normParent.includes(q) ||
        normQuad.includes(q) ||
        (d.branchName && normalizeArabic(d.branchName).includes(q))
      );
    }).slice(0, 30);
  }, [familyDaughters, searchQuery, registry]);

  const selectedDaughter = selectedPersonKey ? registry.people.get(selectedPersonKey) : null;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFromFamily) {
      if (!selectedDaughter) {
        alert('يرجى اختيار الوالدة من قائمة بنات العائلة المسجلات');
        return;
      }
      onSubmit({
        name: selectedDaughter.name,
        isFromFamily: true,
        personKey: selectedDaughter.key,
        familyOrigin: 'عائلة آل فردان',
        notes: notes.trim()
      });
    } else {
      if (!manualName.trim()) {
        alert('يرجى إدخال اسم الوالدة');
        return;
      }
      onSubmit({
        name: manualName.trim(),
        isFromFamily: false,
        familyOrigin: familyOrigin.trim() || 'من خارج العائلة',
        notes: notes.trim()
      });
    }
  };

  const handleSelectFatherSpouse = (sp: { name: string; isFromFamily: boolean; personKey?: string; familyOrigin?: string }) => {
    if (sp.isFromFamily && sp.personKey) {
      setIsFromFamily(true);
      setSelectedPersonKey(sp.personKey);
      setManualName(sp.name);
    } else {
      setIsFromFamily(false);
      setManualName(sp.name);
      setFamilyOrigin(sp.familyOrigin || '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Readex_Pro',sans-serif]">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Heart className="w-5 h-5 text-amber-300 fill-amber-300/30" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Alexandria']">
                {motherToEdit ? 'تعديل بيانات الوالدة (الأم)' : 'توثيق بيانات الوالدة (الأم)'}
              </h3>
              <p className="text-xs text-emerald-200">
                للفرد: <span className="font-bold text-white">{person.name}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Picker from Father's Spouses if available */}
          {father && fatherSpouses.length > 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-bold text-amber-900 block">
                اختيار سريع من زوجات الوالد ({father.name}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fatherSpouses.map(sp => (
                  <button
                    key={`quick-sp-${sp.id}`}
                    type="button"
                    onClick={() => handleSelectFatherSpouse(sp)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{sp.name}</span>
                    <span className="text-[10px] text-amber-700">
                      ({sp.isFromFamily ? 'آل فردان' : sp.familyOrigin || 'خارج العائلة'})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              نسب الوالدة:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsFromFamily(true)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isFromFamily
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                من نفس العائلة (آل فردان)
              </button>
              <button
                type="button"
                onClick={() => setIsFromFamily(false)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isFromFamily
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                من خارج العائلة (عائلة أخرى)
              </button>
            </div>
          </div>

          {/* Case 1: Mother from family (Dropdown of daughters) */}
          {isFromFamily ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                اختر الوالدة من بنات العائلة المسجلات:
              </label>

              {/* Selected card if already selected */}
              {selectedDaughter ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {getArabicInitial(selectedDaughter.name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-emerald-950 truncate">
                        {selectedDaughter.name}
                      </h4>
                      <p className="text-xs font-semibold text-emerald-900 truncate mt-0.5">
                        {getQuadLineageName(selectedDaughter.key, registry.people, 4)}
                      </p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        الجيل {selectedDaughter.generation} {selectedDaughter.branchName ? `· فرع ${selectedDaughter.branchName}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPersonKey('');
                      setIsDropdownOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="ابحث باسم البنت أو والدها..."
                      className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 p-1 divide-y divide-slate-100">
                      {filteredDaughters.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          لا توجد نتائج مطابقة لـ "{searchQuery}"
                        </div>
                      ) : (
                        filteredDaughters.map(d => {
                          const branch = BRANCH_COLORS[d.branch] || BRANCH_COLORS.b0;
                          const dParent = d.parentKey ? registry.people.get(d.parentKey) : null;

                          return (
                            <button
                              key={`d-${d.key}`}
                              type="button"
                              onClick={() => {
                                setSelectedPersonKey(d.key);
                                setIsDropdownOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-right p-2 hover:bg-emerald-50 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0"
                                  style={{ backgroundColor: branch.bg, color: branch.accent }}
                                >
                                  {getArabicInitial(d.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                    {getQuadLineageName(d.key, registry.people, 4) || d.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    الجيل {d.generation} {d.branchName ? `· فرع ${d.branchName}` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                                الجيل {d.generation}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Case 2: External Family
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  اسم الوالدة الكامل:
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="مثال: مريم بنت جاسم..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs text-slate-900 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  عائلة الوالدة / النسب:
                </label>
                <input
                  type="text"
                  value={familyOrigin}
                  onChange={e => setFamilyOrigin(e.target.value)}
                  placeholder="مثال: عائلة آل فلان، كرزكان..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs text-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              ملاحظات إضافية (اختياري):
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول نسب الوالدة أو مكان السكن أو تاريخ الوفاة..."
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs text-slate-900 outline-none transition-all"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {motherToEdit && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                حذف بيانات الوالدة
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                حفظ بيانات الوالدة
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
