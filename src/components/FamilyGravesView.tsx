import React, { useState, useMemo } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { getFatherName, formatLineageString, BRANCH_COLORS, normalizeArabic } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import { Search, MapPin, ExternalLink, GitBranch, Calendar, Shield, Edit3, X, Plus } from 'lucide-react';

interface FamilyGravesViewProps {
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onOpenPersonDetail: (key: string) => void;
  onSwitchToHub: () => void;
  isAuthorized?: boolean;
  onUpdateGraveInfo?: (personKey: string, graveImageUrl: string | null, graveMapUrl: string | null) => void;
}

export const FamilyGravesView: React.FC<FamilyGravesViewProps> = ({
  registry,
  onSelectPerson,
  onOpenPersonDetail,
  onSwitchToHub,
  isAuthorized = false,
  onUpdateGraveInfo,
}) => {
  const [query, setQuery] = useState('');
  const [editingPersonKey, setEditingPersonKey] = useState<string | null>(null);
  const [graveImageInput, setGraveImageInput] = useState('');
  const [graveMapInput, setGraveMapInput] = useState('');

  // Collect all deceased members
  const deceasedMembers = useMemo(() => {
    const list: ProcessedPerson[] = [];
    registry.people.forEach(p => {
      if (p.deleted) return;
      if (p.isDeceased) {
        list.push(p);
      }
    });

    // Sort by death year descending (unknown year at the end), then by name
    list.sort((a, b) => {
      const yearA = a.deathYear || 0;
      const yearB = b.deathYear || 0;
      if (yearA !== yearB) return yearB - yearA;
      return a.name.localeCompare(b.name, 'ar');
    });

    return list;
  }, [registry]);

  // Filtered deceased members by search query
  const filteredDeceased = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return deceasedMembers;
    return deceasedMembers.filter(p => {
      const normName = normalizeArabic(p.name);
      const lineage = normalizeArabic(formatLineageString(p.key, registry.people));
      const note = normalizeArabic(p.note || '');
      return normName.includes(q) || lineage.includes(q) || note.includes(q);
    });
  }, [deceasedMembers, query, registry.people]);

  const handleSaveGrave = (personKey: string) => {
    if (!onUpdateGraveInfo) return;
    onUpdateGraveInfo(
      personKey,
      graveImageInput.trim() ? graveImageInput.trim() : null,
      graveMapInput.trim() ? graveMapInput.trim() : null
    );
    setEditingPersonKey(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-['Readex_Pro',sans-serif]">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSwitchToHub}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
        >
          <span>← العودة إلى بوابة دليل العائلة</span>
        </button>

        <span className="text-xs font-bold px-3 py-1 bg-zinc-900 text-amber-200 rounded-full border border-zinc-800">
          سجل المزارات والوفيات ({deceasedMembers.length} متوفى رحمه الله)
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span>🖤 قبور عائلة الفردان والمزارات التاريخية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Alexandria'] tracking-tight">
            سجل وفيات ومزارات أفراد عائلة الفردان
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            استعراض لأسماء المتوفين من العائلة (رحمهم الله)، مع توثيق مواقع الدفن، صور القبور، وروابط الخرائط لزيارة المزارات والدعاء لهم، مع إمكانية الوصول المباشر لموقع كل شخص في الشجرة التفاعلية.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث باسم المتوفى أو النسب الكامل أو الملاحظة..."
            className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              title="مسح"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Graves List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeceased.map(person => {
          const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
          const isEditing = editingPersonKey === person.key;

          return (
            <div
              key={`grave-${person.key}`}
              className="bg-white border border-slate-200 hover:border-zinc-400 hover:shadow-lg rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Top Row: Avatar & Name */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: branchInfo.bg,
                      color: branchInfo.accent,
                      border: `2px solid ${branchInfo.border}`
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
                      <h3 className="font-bold text-slate-900 text-base font-['Alexandria'] truncate">
                        {person.title && (
                          <span className="text-amber-700 font-semibold ml-1">
                            {person.title}
                          </span>
                        )}
                        {person.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-950 text-amber-200 font-bold rounded-full">
                        متوفى {person.deathYear ? `(${person.deathYear}م)` : ''} 🖤
                      </span>
                    </div>

                    <p className="text-xs text-emerald-800 font-semibold leading-snug mt-1" title={formatLineageString(person.key, registry.people)}>
                      {formatLineageString(person.key, registry.people)}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        الجيل {person.generation}
                      </span>
                      {person.branchName && (
                        <span className="text-slate-600 font-medium">· {person.branchName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grave Photo if available */}
                {person.graveImageUrl && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                    <img
                      src={person.graveImageUrl}
                      alt={`قبر ${person.name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg">
                      صورة القبر / المزار
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Edit Grave Info Form */}
              {isAuthorized && isEditing && (
                <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                    <span>تعديل معلومات القبر وموقع الخريطة:</span>
                    <button onClick={() => setEditingPersonKey(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رابط صورة القبر (URL):</label>
                    <input
                      type="text"
                      value={graveImageInput}
                      onChange={e => setGraveImageInput(e.target.value)}
                      placeholder="https://... أو مسار الصورة"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رابط خريطة Google Maps:</label>
                    <input
                      type="text"
                      value={graveMapInput}
                      onChange={e => setGraveMapInput(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingPersonKey(null)}
                      className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs rounded-lg font-medium"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleSaveGrave(person.key)}
                      className="px-3 py-1 bg-zinc-900 text-amber-200 text-xs rounded-lg font-bold"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {person.graveMapUrl ? (
                    <a
                      href={person.graveMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="فتح موقع القبر في خريطة جوجل"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الخريطة 📍</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic px-2">لا توجد إحداثيات للخريطة</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isAuthorized && !isEditing && (
                    <button
                      onClick={() => {
                        setEditingPersonKey(person.key);
                        setGraveImageInput(person.graveImageUrl || '');
                        setGraveMapInput(person.graveMapUrl || '');
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition-colors"
                      title="إضافة أو تعديل صورة القبر وخريطة الموقع"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onSelectPerson(person.key, { reveal: true, center: true });
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="التمركز على موقع الفرد في الشجرة"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-amber-300" />
                    <span>موقعه في الشجرة 🌳</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDeceased.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
          <span className="text-3xl block mb-2">🕊️</span>
          <h3 className="text-base font-bold text-slate-700">لم يتم العثور على أي نتائج مطابقة</h3>
          <p className="text-xs text-slate-500 mt-1">جرّب البحث باسم آخر.</p>
        </div>
      )}
    </div>
  );
};
