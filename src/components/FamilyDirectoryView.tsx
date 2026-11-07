import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { normalizeArabic, BRANCH_COLORS, getArabicInitial, searchFamilyMembers, getQuadLineageName } from '../data/treeManager';
import { Search, Filter, ArrowUpDown, ChevronRight, User, Eye, Camera, FileText, X, Edit3, Trash2, Plus } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';

interface FamilyDirectoryViewProps {
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onOpenPersonDetail: (key: string) => void;
  onOpenAddModal: (parentKey?: string) => void;
  onOpenEditModal?: (personKey: string) => void;
  onDeletePerson?: (personKey: string) => void;
  isAuthorized?: boolean;
  onOpenSearchResults?: (query: string) => void;
}

const PROTECTED_TRUNK_KEYS = new Set(['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF']);

export const FamilyDirectoryView: React.FC<FamilyDirectoryViewProps> = ({
  registry,
  onSelectPerson,
  onOpenPersonDetail,
  onOpenAddModal,
  onOpenEditModal,
  onDeletePerson,
  isAuthorized = false,
  onOpenSearchResults,
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete suggestions when typing
  const autocompleteSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return searchFamilyMembers(query, registry.people, 12);
  }, [query, registry]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | 'm' | 'f'>('all');
  const [selectedGen, setSelectedGen] = useState<string>('all');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);

  const [sortField, setSortField] = useState<'name' | 'gen' | 'children' | 'year'>('gen');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtered & Sorted list
  const filteredPeople = useMemo(() => {
    const list: ProcessedPerson[] = [];
    const normQ = normalizeArabic(query);

    registry.people.forEach((p: ProcessedPerson) => {
      if (p.deleted) return;

      // Filter branch
      if (selectedBranch !== 'all' && p.branch !== selectedBranch) return;

      // Filter gender
      if (selectedGender !== 'all' && p.gender !== selectedGender) return;

      // Filter generation
      if (selectedGen !== 'all' && p.generation !== parseInt(selectedGen, 10)) return;

      // Filter photos
      if (onlyWithPhotos && !p.photo) return;

      // Filter newly added
      if (onlyNew && !p.isNew) return;

      // Search query
      if (normQ) {
        const normName = normalizeArabic(p.name);
        const normNote = normalizeArabic(p.note || '');
        const parent = p.parentKey ? registry.people.get(p.parentKey) : null;
        const normParent = parent ? normalizeArabic(parent.name) : '';
        const quad = getQuadLineageName(p.key, registry.people, 4);
        const normQuad = normalizeArabic(quad);

        if (!normName.includes(normQ) && !normNote.includes(normQ) && !normParent.includes(normQ) && !normQuad.includes(normQ)) {
          return;
        }
      }

      list.push(p);
    });

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'ar');
      } else if (sortField === 'gen') {
        comparison = a.generation - b.generation;
      } else if (sortField === 'children') {
        comparison = b.childrenKeys.length - a.childrenKeys.length;
      } else if (sortField === 'year') {
        comparison = (a.year || 9999) - (b.year || 9999);
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [registry, query, selectedBranch, selectedGender, selectedGen, onlyWithPhotos, onlyNew, sortField, sortAsc]);

  // Available generations
  const generations = useMemo(() => {
    const set = new Set<number>();
    registry.people.forEach((p: ProcessedPerson) => {
      if (!p.deleted && p.generation > 0) set.add(p.generation);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [registry]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-['Readex_Pro',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Alexandria'] text-slate-900">
            دليل أفراد عائلة الفردان
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            فهرس شامل يضم {registry.stats.totalCount} فرداً، مع أدوات الفلترة والبحث المتقدم
          </p>
        </div>

        {isAuthorized && (
          <button
            onClick={() => onOpenAddModal(registry.fardanKey)}
            className="self-start sm:self-auto px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <span>+ إضافة فرد جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Top: Search query input with autocomplete dropdown */}
        <div ref={searchInputRef} className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim() && onOpenSearchResults) {
                  setIsDropdownOpen(false);
                  onOpenSearchResults(query.trim());
                }
              }}
              placeholder="ابحث بالاسم، أول أحرف من الاسم، اسم الأب، أو الملاحظة..."
              className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setIsDropdownOpen(false);
                }}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && query.trim().length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-30 p-2 animate-in fade-in">
              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100">
                <span>اقتراحات الأسماء المسجلة ({autocompleteSuggestions.length})</span>
                {onOpenSearchResults && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenSearchResults(query.trim());
                    }}
                    className="text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
                  >
                    عرض في إطار منفرد ⇱
                  </button>
                )}
              </div>

              {autocompleteSuggestions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  لا توجد أسماء مطابقة لـ "{query}"
                </div>
              ) : (
                <div className="space-y-0.5 py-1">
                  {autocompleteSuggestions.map(person => {
                    const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
                    const parent = person.parentKey ? registry.people.get(person.parentKey) : null;

                    return (
                      <button
                        key={`dir-suggest-${person.key}`}
                        onClick={() => {
                          setQuery(person.name);
                          setIsDropdownOpen(false);
                          onOpenPersonDetail(person.key);
                        }}
                        className="w-full flex items-center justify-between p-2 hover:bg-emerald-50 rounded-xl transition-colors text-right cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                            style={{
                              backgroundColor: branchInfo.bg,
                              color: branchInfo.accent,
                              border: `1px solid ${branchInfo.border}`
                            }}
                          >
                            <MemberAvatar
                              src={person.photo}
                              personKey={person.key}
                              name={person.name}
                              gender={person.gender}
                              imgClassName="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                              {getQuadLineageName(person.key, registry.people, 4) || person.name}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                              <span className="font-semibold text-emerald-700">{person.gender === 'f' ? 'أنثى' : 'ذكر'}</span>
                              <span> · الجيل {person.generation}</span>
                              {person.branchName ? ` · فرع ${person.branchName}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                            الجيل {person.generation}
                          </span>
                          <span className="text-xs text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            ←
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {onOpenSearchResults && (
                    <div className="pt-1.5 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenSearchResults(query.trim());
                        }}
                        className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>فتح النتائج كاملة في إطار منفرد ودقيق ({autocompleteSuggestions.length})</span>
                        <span className="text-emerald-700">←</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Filter dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Branch filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الفرع</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">جميع الفروع</option>
              {registry.heads.map((h: ProcessedPerson) => (
                <option key={`opt-branch-${h.branch}`} value={h.branch}>
                  ذرية {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الجنس</label>
            <select
              value={selectedGender}
              onChange={e => setSelectedGender(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">الكل ({registry.stats.totalCount})</option>
              <option value="m">الذكور ({registry.stats.maleCount})</option>
              <option value="f">الإناث ({registry.stats.femaleCount})</option>
            </select>
          </div>

          {/* Generation filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الجيل</label>
            <select
              value={selectedGen}
              onChange={e => setSelectedGen(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">جميع الأجيال</option>
              {generations.map(g => (
                <option key={`opt-gen-${g}`} value={String(g)}>
                  الجيل {g}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الترتيب حسب</label>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="gen">الجيل</option>
              <option value="name">الاسم أبجدياً</option>
              <option value="children">عدد الأبناء</option>
              <option value="year">سنة الميلاد</option>
            </select>
          </div>

          {/* Photos toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={onlyWithPhotos}
                onChange={e => setOnlyWithPhotos(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-slate-700">مع صور فقط</span>
            </label>
          </div>

          {/* Newly added toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={onlyNew}
                onChange={e => setOnlyNew(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-slate-700">مضافون حديثاً</span>
            </label>
          </div>
        </div>
      </div>

      {/* Directory Grid of Cards */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
          <span>يظهر {filteredPeople.length} من أصل {registry.stats.totalCount} فرداً</span>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 hover:text-slate-800 font-semibold"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? 'تصاعدي' : 'تنازلي'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredPeople.map(person => {
            const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
            const parent = person.parentKey ? registry.people.get(person.parentKey) : null;

            return (
              <div
                key={`dir-${person.key}`}
                className="bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: branchInfo.bg,
                      color: branchInfo.accent,
                      border: `1px solid ${branchInfo.border}`
                    }}
                  >
                    <MemberAvatar
                      src={person.photo}
                      personKey={person.key}
                      name={person.name}
                      gender={person.gender}
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm font-['Alexandria'] truncate">
                        {person.title && (
                          <span className="text-emerald-700 font-semibold ml-1">
                            {person.title}
                          </span>
                        )}
                        {person.name}
                      </h4>
                      {person.isNew && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                          جديد
                        </span>
                      )}
                      {person.isDeceased && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-zinc-950 text-white border border-zinc-800 rounded font-bold">
                          {person.gender === 'f' ? 'متوفاة' : 'متوفى'} {person.deathYear ? `(${person.deathYear}م)` : ''} 🖤
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-emerald-800 font-semibold truncate mt-0.5" title={getQuadLineageName(person.key, registry.people, 4)}>
                      {getQuadLineageName(person.key, registry.people, 4)}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        الجيل {person.generation}
                      </span>
                      {person.childrenKeys.length > 0 && (
                        <span>{person.childrenKeys.length} أبناء</span>
                      )}
                      {person.year && <span>ولد {person.year}</span>}
                    </div>
                  </div>
                </div>

                {person.note && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl line-clamp-2 italic">
                    {person.note}
                  </p>
                )}

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPersonDetail(person.key)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>التفاصيل</span>
                    </button>

                    <button
                      onClick={() => onSelectPerson(person.key, { reveal: true, center: true })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>في الشجرة</span>
                    </button>
                  </div>

                  {isAuthorized && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenAddModal(person.key)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                        title={`إضافة ابن أو ابنة لـ ${person.name}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة ابن</span>
                      </button>

                      {onOpenEditModal && (
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(person.key)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                          title={`تعديل الاسم والبيانات لـ ${person.name}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                      )}

                      {onDeletePerson && !PROTECTED_TRUNK_KEYS.has(person.key) && (
                        <button
                          type="button"
                          onClick={() => onDeletePerson(person.key)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          title={`إلغاء وحذف ${person.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>إلغاء</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredPeople.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700">لم يتم العثور على أي فرد</h3>
            <p className="text-xs text-slate-500 mt-1">جرّب تغيير كلمات البحث أو إعادة ضبط خيارات الفلترة.</p>
          </div>
        )}
      </div>
    </div>
  );
};
