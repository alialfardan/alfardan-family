import React, { useState, useMemo } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { searchFamilyMembers, BRANCH_COLORS, getArabicInitial, formatLineageString, getQuadLineageName } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import {
  Search,
  X,
  GitBranch,
  User,
  Award,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Maximize2,
  Camera,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react';
import { PersonPhotoLightboxModal } from './PersonPhotoLightboxModal';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onOpenPersonDetail: (key: string) => void;
  onOpenCertificate: (key: string) => void;
  onGoToTree: (key: string) => void;
  isAuthorized?: boolean;
  isPrivacyRestricted?: boolean;
  onOpenAddModal?: (parentKey: string) => void;
  onOpenEditModal?: (personKey: string) => void;
  onDeletePerson?: (personKey: string) => void;
}

const PROTECTED_TRUNK_KEYS = new Set(['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF']);

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  registry,
  onSelectPerson,
  onOpenPersonDetail,
  onOpenCertificate,
  onGoToTree,
  isAuthorized = false,
  isPrivacyRestricted = false,
  onOpenAddModal,
  onOpenEditModal,
  onDeletePerson,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | 'm' | 'f'>('all');
  const [selectedGen, setSelectedGen] = useState<string>('all');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState<boolean>(false);
  const [lightboxPerson, setLightboxPerson] = useState<ProcessedPerson | null>(null);

  // Sync initial query when opened
  React.useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Compute matched people
  const matchedPeople = useMemo(() => {
    const rawMatches = searchFamilyMembers(query, registry.people, 100, { excludeFemales: isPrivacyRestricted });

    return rawMatches.filter(p => {
      if (isPrivacyRestricted && p.gender === 'f') return false;
      if (selectedBranch !== 'all' && p.branch !== selectedBranch) return false;
      if (selectedGender !== 'all' && p.gender !== selectedGender) return false;
      if (selectedGen !== 'all' && p.generation !== parseInt(selectedGen, 10)) return false;
      if (onlyWithPhotos && !p.photo) return false;
      return true;
    });
  }, [query, registry, selectedBranch, selectedGender, selectedGen, onlyWithPhotos, isPrivacyRestricted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 border-b border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-amber-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Alexandria'] text-slate-900 leading-tight">
                إطار نتائج البحث الدقيقة عن الأسماء
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                عرض مفصل ودقيق للأفراد المطابقين مع سلسلة النسب والخيارات المباشرة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input & Live Filter Bar */}
        <div className="px-5 sm:px-7 py-4 bg-slate-50/80 border-b border-slate-200/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="اكتب أول أحرف من الاسم، اسم الأب، اللقب، أو سنة الميلاد..."
              className="w-full pr-10 pl-10 py-2.5 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-2xl text-sm font-medium text-slate-900 shadow-xs focus:outline-none transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                <Filter className="w-3 h-3 text-emerald-700" />
                <span>تصفية:</span>
              </span>

              {/* Branch filter */}
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="all">جميع الفروع</option>
                {registry.heads.map(h => (
                  <option key={`res-b-${h.branch}`} value={h.branch}>
                    فرع {h.name}
                  </option>
                ))}
              </select>

              {/* Gender filter */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                <button
                  onClick={() => setSelectedGender('all')}
                  className={`px-2 py-0.5 rounded-lg text-xs ${
                    selectedGender === 'all' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedGender('m')}
                  className={`px-2 py-0.5 rounded-lg text-xs ${
                    selectedGender === 'm' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600'
                  }`}
                >
                  ذكور
                </button>
                {!isPrivacyRestricted && (
                  <button
                    onClick={() => setSelectedGender('f')}
                    className={`px-2 py-0.5 rounded-lg text-xs ${
                      selectedGender === 'f' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    إناث
                  </button>
                )}
              </div>

              {/* Photo Filter Button */}
              <button
                onClick={() => setOnlyWithPhotos(!onlyWithPhotos)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  onlyWithPhotos
                    ? 'bg-emerald-800 text-white shadow-2xs font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title="إظهار الأفراد الذين لديهم صور فقط"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>مع صور فقط</span>
              </button>
            </div>

            <div className="text-[11px] font-bold text-slate-500">
              المطابقات: <span className="text-emerald-700 font-extrabold">{matchedPeople.length}</span> فرد
            </div>
          </div>
        </div>

        {/* Dedicated Results Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 bg-slate-50/40">
          {matchedPeople.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-slate-700 font-bold text-sm">
                لم يتم العثور على أفراد مطابقين للبحث الحالي
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرّب كتابة الأحرف الأولى من الاسم بشكل مجرد، أو ابحث باسم الأب أو الجد
              </p>
            </div>
          ) : (
            matchedPeople.map(person => {
              const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
              const lineageStr = formatLineageString(person.key, registry.people);

              return (
                <div
                  key={`result-card-${person.key}`}
                  className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-3 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Person identity */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        onClick={(e) => {
                          if (person.photo) {
                            e.stopPropagation();
                            setLightboxPerson(person);
                          }
                        }}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs overflow-hidden relative group/resPhoto ${
                          person.photo
                            ? 'cursor-zoom-in hover:ring-2 hover:ring-emerald-500 hover:scale-105 active:scale-95 transition-all'
                            : ''
                        }`}
                        style={{
                          backgroundColor: branchInfo.bg,
                          color: branchInfo.accent,
                          border: person.photo ? '2px solid #059669' : `1.5px solid ${branchInfo.border}`
                        }}
                        title={person.photo ? 'اضغط لتكبير واستعراض الصورة 🔍' : person.name}
                      >
                        <MemberAvatar
                          src={person.photo}
                          personKey={person.key}
                          name={person.name}
                          gender={person.gender}
                        />
                        {person.photo && (
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/resPhoto:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                            {person.title ? `${person.title} ` : ''}
                            {person.name}
                          </h4>
                          {person.photo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              صورة 📷
                            </span>
                          )}
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            الجيل {person.generation}
                          </span>
                          {person.branchName && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{
                                backgroundColor: branchInfo.bg,
                                color: branchInfo.accent,
                                border: `1px solid ${branchInfo.border}`
                              }}
                            >
                              فرع {person.branchName}
                            </span>
                          )}
                          {person.isDeceased && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-950 text-white border border-zinc-800 shadow-2xs">
                              {person.gender === 'f' ? 'متوفاة' : 'متوفى'} {person.deathYear ? `(${person.deathYear}م)` : ''} 🖤
                            </span>
                          )}
                        </div>

                        {/* 4-Generation Name */}
                        <p className="text-xs font-semibold text-emerald-900 mt-0.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">الاسم الرباعي:</span>
                          <span>{getQuadLineageName(person.key, registry.people, 4)}</span>
                        </p>

                        {person.year && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>مواليد: {person.year}م</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => {
                          onClose();
                          onGoToTree(person.key);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                        title="عرض الشخص في الشجرة التفاعلية"
                      >
                        <GitBranch className="w-3.5 h-3.5 text-emerald-700" />
                        <span>في الشجرة</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenPersonDetail(person.key);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="عرض الملف الشخصي وتفاصيل الأبناء"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenCertificate(person.key);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-amber-200 shadow-2xs"
                        title="إصدار وثيقة إثبات النسب"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-700" />
                        <span>شهادة النسب</span>
                      </button>

                      {isAuthorized && onOpenAddModal && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenAddModal(person.key);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title={`إضافة ابن أو ابنة لـ ${person.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة ابن</span>
                        </button>
                      )}

                      {isAuthorized && onOpenEditModal && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenEditModal(person.key);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title={`تعديل بيانات ${person.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      )}

                      {isAuthorized && onDeletePerson && !PROTECTED_TRUNK_KEYS.has(person.key) && (
                        <button
                          onClick={() => {
                            onDeletePerson(person.key);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title={`إلغاء وحذف ${person.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lineage Patronymic Chain box */}
                  <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-200/60 text-xs text-slate-700 font-['Noto_Naskh_Arabic'] leading-relaxed">
                    <span className="font-bold text-amber-900 ml-1.5 font-['Readex_Pro']">
                      سلسلة النسب:
                    </span>
                    <span className="text-slate-800 font-medium">
                      {lineageStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>شجرة عائلة الفردان الكرزكاني الرسمية</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Enlarged Photo Lightbox Modal from Search */}
      {lightboxPerson && (
        <PersonPhotoLightboxModal
          isOpen={!!lightboxPerson}
          onClose={() => setLightboxPerson(null)}
          photoUrl={lightboxPerson.photo}
          personName={lightboxPerson.name}
          personKey={lightboxPerson.key}
          generation={lightboxPerson.generation}
          branchName={lightboxPerson.branchName}
          lineageTitle={formatLineageString(lightboxPerson.key, registry.people)}
        />
      )}
    </div>
  );
};
