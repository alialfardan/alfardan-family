import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProcessedPerson, SpouseInfo, FamilyTreeProcessed } from '../types/family';
import { normalizeArabic, BRANCH_COLORS, getArabicInitial, getQuadLineageName } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import {
  X,
  Heart,
  Users,
  Search,
  Check,
  AlertCircle,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface AddEditSpouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: ProcessedPerson;
  spouseToEdit?: SpouseInfo | null;
  registry: FamilyTreeProcessed;
  onSubmit: (spouse: SpouseInfo) => void;
}

export const AddEditSpouseModal: React.FC<AddEditSpouseModalProps> = ({
  isOpen,
  onClose,
  person,
  spouseToEdit,
  registry,
  onSubmit
}) => {
  const isTargetFemale = person.gender === 'f';
  const spouseNoun = isTargetFemale ? 'الزوج' : 'الزوجة';
  const spouseNounIndef = isTargetFemale ? 'زوج' : 'زوجة';

  const [isFromFamily, setIsFromFamily] = useState<boolean>(true);
  const [selectedPersonKey, setSelectedPersonKey] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [familyOrigin, setFamilyOrigin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize form state
  useEffect(() => {
    if (spouseToEdit) {
      setIsFromFamily(!!spouseToEdit.isFromFamily);
      setSelectedPersonKey(spouseToEdit.personKey || '');
      setName(spouseToEdit.name || '');
      setFamilyOrigin(spouseToEdit.familyOrigin || '');
      setNotes(spouseToEdit.notes || '');
    } else {
      setIsFromFamily(true);
      setSelectedPersonKey('');
      setName('');
      setFamilyOrigin('');
      setNotes('');
    }
    setCandidateSearchQuery('');
    setError(null);
  }, [spouseToEdit, isOpen]);

  // All eligible candidates from family tree
  // If target person is female (daughter), candidate must be male (husband).
  // If target person is male (son/father), candidate must be female (wife).
  const eligibleCandidates = useMemo(() => {
    const list: ProcessedPerson[] = [];
    registry.people.forEach(p => {
      if (p.deleted) return;
      if (isTargetFemale) {
        if (p.gender !== 'f' && p.key !== person.key) {
          list.push(p);
        }
      } else {
        if (p.gender === 'f' && p.key !== person.key) {
          list.push(p);
        }
      }
    });
    return list;
  }, [registry, person, isTargetFemale]);

  // Filtered candidate search results matching query
  const filteredCandidates = useMemo(() => {
    if (!candidateSearchQuery.trim()) {
      return eligibleCandidates.slice(0, 30);
    }
    const qNorm = normalizeArabic(candidateSearchQuery);
    return eligibleCandidates
      .filter(c => {
        const nameNorm = normalizeArabic(c.name);
        const parent = c.parentKey ? registry.people.get(c.parentKey) : null;
        const parentNorm = parent ? normalizeArabic(parent.name) : '';
        const quad = normalizeArabic(getQuadLineageName(c.key, registry.people, 4));
        return (
          nameNorm.includes(qNorm) ||
          parentNorm.includes(qNorm) ||
          quad.includes(qNorm) ||
          c.name.startsWith(candidateSearchQuery.trim())
        );
      })
      .slice(0, 30);
  }, [eligibleCandidates, candidateSearchQuery, registry]);

  const selectedCandidatePerson = selectedPersonKey ? registry.people.get(selectedPersonKey) : null;

  if (!isOpen) return null;

  const handleSelectCandidate = (candidate: ProcessedPerson) => {
    setSelectedPersonKey(candidate.key);
    setName(candidate.name);
    setFamilyOrigin('عائلة الفردان (من نفس الشجرة)');
    setCandidateSearchQuery('');
    setIsDropdownOpen(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFromFamily) {
      if (!selectedPersonKey || !selectedCandidatePerson) {
        setError(`يرجى اختيار ${spouseNoun} من القائمة المنسدلة لأفراد العائلة.`);
        return;
      }
    } else {
      if (!name.trim()) {
        setError(`يرجى إدخال اسم ${spouseNoun}.`);
        return;
      }
    }

    const finalSpouse: SpouseInfo = {
      id: spouseToEdit?.id || 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: isFromFamily && selectedCandidatePerson ? selectedCandidatePerson.name : name.trim(),
      isFromFamily,
      personKey: isFromFamily ? selectedPersonKey : undefined,
      familyOrigin: isFromFamily ? 'عائلة الفردان' : (familyOrigin.trim() || undefined),
      notes: notes.trim() || undefined
    };

    onSubmit(finalSpouse);
    onClose();
  };

  const modalTitle = spouseToEdit
    ? `تعديل بيانات ${spouseNoun}`
    : `إضافة ${spouseNounIndef}`;

  const fromFamilyDescription = isTargetFemale
    ? 'من أبناء ورجال شجرة آل فردان'
    : 'من بنات شجرة آل فردان';

  const searchPlaceholder = isTargetFemale
    ? 'ابحث بالاسم الرباعي عن زوج من رجال العائلة...'
    : 'ابحثي/ابحث بالاسم عن زوجة من بنات العائلة...';

  const candidateListTitle = isTargetFemale
    ? `رجال وشباب العائلة المسجلون (${filteredCandidates.length})`
    : `بنات العائلة المسجلات (${filteredCandidates.length})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-['Readex_Pro',sans-serif] animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 text-slate-800 my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Heart className="w-5 h-5 fill-rose-300/40 text-rose-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Alexandria']">
                {modalTitle}
              </h3>
              <p className="text-[11px] text-emerald-300">
                {isTargetFemale ? 'للبنت:' : 'للفرد:'} <strong className="text-white">{person.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle: From Family vs Outside Family */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              مصدر ونسب {spouseNoun}:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsFromFamily(true);
                  setError(null);
                }}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  isFromFamily
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border-2 ${
                    isFromFamily
                      ? 'border-emerald-700 bg-emerald-700'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  {isFromFamily && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">من نفس العائلة</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{fromFamilyDescription}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFromFamily(false);
                  setSelectedPersonKey('');
                  setError(null);
                }}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  !isFromFamily
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border-2 ${
                    !isFromFamily
                      ? 'border-amber-600 bg-amber-600'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  {!isFromFamily && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">من خارج العائلة</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">عائلة أخرى / صهر ونسب</p>
                </div>
              </button>
            </div>
          </div>

          {/* If From Family: Dropdown in Tree */}
          {isFromFamily ? (
            <div className="space-y-2" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-700">
                اختيار {spouseNoun} من شجرة العائلة <span className="text-rose-500">*</span>:
              </label>

              {selectedCandidatePerson ? (
                // Selected Candidate Card
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500/70 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden">
                      <MemberAvatar
                        src={selectedCandidatePerson.photo}
                        personKey={selectedCandidatePerson.key}
                        name={selectedCandidatePerson.name}
                        gender={selectedCandidatePerson.gender}
                        imgClassName="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-xs text-emerald-950 truncate">
                          {selectedCandidatePerson.name}
                        </h5>
                        <span className="text-[10px] px-2 py-0.2 bg-emerald-200 text-emerald-900 rounded-full font-semibold">
                          الجيل {selectedCandidatePerson.generation}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium mt-0.5 truncate">
                        {getQuadLineageName(selectedCandidatePerson.key, registry.people, 4)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPersonKey('');
                      setName('');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                // Searchable Dropdown
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={candidateSearchQuery}
                      onChange={e => {
                        setCandidateSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder={searchPlaceholder}
                      className="w-full pr-10 pl-9 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
                    />
                    <ChevronDown
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-4 h-4 absolute left-3 top-3 text-slate-400 cursor-pointer"
                    />
                  </div>

                  {/* Dropdown Results */}
                  {isDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-60 overflow-y-auto z-40 p-1.5 divide-y divide-slate-100 animate-in fade-in">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {candidateListTitle}
                      </div>
                      {filteredCandidates.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          لا توجد أسماء مطابقة لـ "{candidateSearchQuery}"
                        </div>
                      ) : (
                        filteredCandidates.map(cand => {
                          const branch = BRANCH_COLORS[cand.branch] || BRANCH_COLORS.b0;
                          const quadLineage = getQuadLineageName(cand.key, registry.people, 4);

                          return (
                            <button
                              key={`cand-opt-${cand.key}`}
                              type="button"
                              onClick={() => handleSelectCandidate(cand)}
                              className="w-full text-right p-2.5 hover:bg-emerald-50/80 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden"
                                  style={{ backgroundColor: branch.bg, color: branch.accent }}
                                >
                                  <MemberAvatar
                                    src={cand.photo}
                                    personKey={cand.key}
                                    name={cand.name}
                                    gender={cand.gender}
                                    imgClassName="w-full h-full object-cover rounded-lg"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                    {quadLineage || cand.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    <span className="font-semibold text-emerald-700">{isTargetFemale ? 'زوج من العائلة' : 'زوجة من بنات العائلة'}</span>
                                    <span> · الجيل {cand.generation}</span>
                                    {cand.branchName ? ` · فرع ${cand.branchName}` : ''}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0 font-medium">
                                الجيل {cand.generation}
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
            // If Outside Family: Manual Inputs
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم {spouseNoun} الكامل <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={
                    isTargetFemale
                      ? 'مثال: أحمد بن عبد الله بن حسن'
                      : 'مثال: فاطمة بنت جاسم بن حسن'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم عائلة {spouseNoun} / الأصل والقبيلة (اختياري):
                </label>
                <input
                  type="text"
                  value={familyOrigin}
                  onChange={e => setFamilyOrigin(e.target.value)}
                  placeholder="مثال: عائلة آل فلان - كرزكان"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات وتفاصيل إضافية عن {spouseNoun} (اختياري):
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                isTargetFemale
                  ? 'مثال: معلومات العمل، تاريخ الزواج، سكن العائلة...'
                  : 'مثال: أم الأبناء محمد وعلي، تاريخ الزواج...'
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{spouseToEdit ? `حفظ تعديل ${spouseNoun}` : `تأكيد إضافة ${spouseNoun}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
