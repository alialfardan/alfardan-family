import React, { useState, useMemo } from 'react';
import { ProcessedPerson, FamilyTreeProcessed, SpouseInfo, MotherInfo } from '../types/family';
import {
  BRANCH_COLORS,
  getArabicInitial,
  getLineageChain,
  formatLineageString,
  getQuadLineageName,
  formatArabicCount,
  getChildrenOfSpouse,
  normalizeArabic
} from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import {
  X,
  Copy,
  Check,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Award,
  Users,
  ChevronLeft,
  FileText,
  Camera,
  Share2,
  Heart,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { AddEditSpouseModal } from './AddEditSpouseModal';
import { AddEditMotherModal } from './AddEditMotherModal';
import { PersonPhotoLightboxModal } from './PersonPhotoLightboxModal';

interface PersonDetailDrawerProps {
  personKey: string;
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onClose: () => void;
  onAddChild: (parentKey: string) => void;
  onEditPerson: (personKey: string) => void;
  onDeletePerson: (personKey: string) => void;
  onUpdateNote: (personKey: string, note: string) => void;
  onChangePhoto: (personKey: string) => void;
  onOpenCertificate: (personKey: string) => void;
  isAuthorized?: boolean;
  onSaveSpouse?: (personKey: string, spouse: SpouseInfo) => void;
  onDeleteSpouse?: (personKey: string, spouseId: string) => void;
  onSaveMother?: (personKey: string, mother: MotherInfo) => void;
  onDeleteMother?: (personKey: string) => void;
  onUpdateDeathStatus?: (personKey: string, isDeceased: boolean, deathYear: number | null) => void;
  onUpdateBirthDate?: (personKey: string, birthDate: string | null, year: number | null) => void;
  isPrivacyRestricted?: boolean;
}

export const PersonDetailDrawer: React.FC<PersonDetailDrawerProps> = ({
  personKey,
  registry,
  onSelectPerson,
  onClose,
  onAddChild,
  onEditPerson,
  onDeletePerson,
  onUpdateNote,
  onChangePhoto,
  onOpenCertificate,
  isAuthorized = false,
  onSaveSpouse,
  onDeleteSpouse,
  onSaveMother,
  onDeleteMother,
  onUpdateDeathStatus,
  onUpdateBirthDate,
  isPrivacyRestricted = false,
}) => {
  const person = registry.people.get(personKey);
  const [copied, setCopied] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSpouseModalOpen, setIsSpouseModalOpen] = useState(false);
  const [spouseToEdit, setSpouseToEdit] = useState<SpouseInfo | null>(null);
  const [spouseToDeleteConfirm, setSpouseToDeleteConfirm] = useState<string | null>(null);
  const [isMotherModalOpen, setIsMotherModalOpen] = useState(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);

  // Quick Death Status state
  const [isEditingDeath, setIsEditingDeath] = useState(false);
  const [deathYearInput, setDeathYearInput] = useState<string>(
    person?.deathYear ? String(person.deathYear) : ''
  );
  const [isDeceasedDraft, setIsDeceasedDraft] = useState<boolean>(!!person?.isDeceased);

  // Quick Birth Date state
  const [isEditingBirthDate, setIsEditingBirthDate] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState<string>(
    person?.birthDate || (person?.year ? String(person.year) : '')
  );

  // Sync state when personKey or person changes
  React.useEffect(() => {
    if (person) {
      setIsDeceasedDraft(!!person.isDeceased);
      setDeathYearInput(person.deathYear ? String(person.deathYear) : '');
      setIsEditingDeath(false);
      setBirthDateInput(person.birthDate || (person.year ? String(person.year) : ''));
      setIsEditingBirthDate(false);
    }
  }, [personKey, person?.isDeceased, person?.deathYear, person?.birthDate, person?.year]);

  const handleSaveDeathStatus = () => {
    if (!onUpdateDeathStatus || !person) return;
    const parsedYear = deathYearInput.trim() ? parseInt(deathYearInput.trim(), 10) : null;
    onUpdateDeathStatus(
      person.key,
      isDeceasedDraft,
      isDeceasedDraft ? (parsedYear && !isNaN(parsedYear) ? parsedYear : null) : null
    );
    setIsEditingDeath(false);
  };

  const handleSaveBirthDate = () => {
    if (!onUpdateBirthDate || !person) return;
    const trimmed = birthDateInput.trim();
    if (!trimmed) {
      onUpdateBirthDate(person.key, null, null);
    } else {
      const match = trimmed.match(/\b(18|19|20)\d{2}\b/);
      const parsedYear = match ? parseInt(match[0], 10) : null;
      onUpdateBirthDate(person.key, trimmed, parsedYear);
    }
    setIsEditingBirthDate(false);
  };

  if (!person) return null;

  const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
  const lineageChain = getLineageChain(personKey, registry.people);
  const parent = person.parentKey ? registry.people.get(person.parentKey) : null;
  const spouses: SpouseInfo[] = person.spouses || [];
  const fatherSpouses: SpouseInfo[] = parent?.spouses || [];
  const hasMultipleWives = fatherSpouses.length > 1;

function getSpouseOrdinal(index: number, isFemaleUser: boolean): string {
  const ordinalsMale = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  const ordinalsFemale = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];
  const ord = (isFemaleUser ? ordinalsMale : ordinalsFemale)[index - 1] || `${index}`;
  return isFemaleUser ? `الزوج ${ord}` : `الزوجة ${ord}`;
}

  // Resolve ALL children for this person (both for fathers and mothers across all marriages)
  const allResolvedChildren = useMemo(() => {
    const list: ProcessedPerson[] = [];
    const seen = new Set<string>();

    // 1. Direct children from childrenKeys or parentKey pointing to this person
    (person.childrenKeys || []).forEach(ck => {
      const c = registry.people.get(ck);
      if (c && !c.deleted && !seen.has(c.key)) {
        seen.add(c.key);
        list.push(c);
      }
    });

    registry.people.forEach(c => {
      if (!c.deleted && c.parentKey === person.key && !seen.has(c.key)) {
        seen.add(c.key);
        list.push(c);
      }
    });

    // 2. Offspring calculated from spouses
    (person.spouses || []).forEach(sp => {
      const spInfo = getChildrenOfSpouse(person.key, sp, registry.people);
      spInfo.all.forEach(c => {
        if (!c.deleted && !seen.has(c.key)) {
          seen.add(c.key);
          list.push(c);
        }
      });
    });

    // 3. For females: match children where mother is explicitly linked by personKey
    if (person.gender === 'f') {
      registry.people.forEach(p => {
        if (p.deleted || seen.has(p.key)) return;
        if (p.mother && p.mother.personKey && p.mother.personKey === person.key) {
          seen.add(p.key);
          list.push(p);
        }
      });
    }

    return list;
  }, [person, registry.people]);

  const children = allResolvedChildren;
  const sonsCount = children.filter((c: ProcessedPerson) => c.gender !== 'f').length;
  const daughtersCount = children.filter((c: ProcessedPerson) => c.gender === 'f').length;

  // Breakdown of children grouped by spouse (husband for women, wife for men)
  const childrenBySpouse = useMemo(() => {
    const groups: {
      spouse: SpouseInfo;
      spousePerson: ProcessedPerson | null;
      spouseQuad: string;
      sons: ProcessedPerson[];
      daughters: ProcessedPerson[];
      all: ProcessedPerson[];
      index: number;
    }[] = [];

    const accountedChildKeys = new Set<string>();

    (person.spouses || []).forEach((sp, idx) => {
      const spInfo = getChildrenOfSpouse(person.key, sp, registry.people);
      spInfo.all.forEach(c => accountedChildKeys.add(c.key));
      const spPerson = sp.personKey ? registry.people.get(sp.personKey) || null : null;
      const spQuad = spPerson ? getQuadLineageName(spPerson.key, registry.people, 4) : '';

      groups.push({
        spouse: sp,
        spousePerson: spPerson,
        spouseQuad: spQuad,
        sons: spInfo.sons,
        daughters: spInfo.daughters,
        all: spInfo.all,
        index: idx + 1
      });
    });

    const unassigned = allResolvedChildren.filter(c => !accountedChildKeys.has(c.key));
    const unassignedSons = unassigned.filter(c => c.gender !== 'f');
    const unassignedDaughters = unassigned.filter(c => c.gender === 'f');

    return {
      groups,
      unassigned: {
        sons: unassignedSons,
        daughters: unassignedDaughters,
        all: unassigned
      }
    };
  }, [person, registry.people, allResolvedChildren]);

  // Siblings
  const siblings = parent
    ? parent.childrenKeys
        .map((k: string) => registry.people.get(k))
        .filter((s): s is ProcessedPerson => !!s && !s.deleted && s.key !== person.key)
    : [];

  // Count total descendants in subtree
  let totalDescendants = 0;
  function countSubtree(k: string) {
    const item = registry.people.get(k);
    if (!item) return;
    item.childrenKeys.forEach((childKey: string) => {
      const child = registry.people.get(childKey);
      if (child && !child.deleted) {
        totalDescendants++;
        countSubtree(childKey);
      }
    });
  }
  countSubtree(person.key);

  const handleCopyLineage = () => {
    const text = formatLineageString(person.key, registry.people);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSaveNote = () => {
    onUpdateNote(person.key, noteDraft);
    setIsEditingNote(false);
  };

  return (
    <div
      className="member-modal-scroll flex flex-col w-full h-full max-h-[calc(100vh-80px)] max-h-[calc(100dvh-80px)] bg-white text-slate-800 shadow-2xl overflow-y-auto overscroll-contain touch-pan-y font-['Readex_Pro',sans-serif]"
      style={{
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        maxHeight: 'calc(100dvh - 80px)'
      }}
    >
      {/* Top Banner with Branch Color Accent */}
      <div
        className="relative flex-shrink-0 px-6 pt-6 pb-5 border-b border-slate-100 transition-colors touch-pan-y"
        style={{
          background: `linear-gradient(135deg, ${branchInfo.bg} 0%, #ffffff 80%)`,
          touchAction: 'pan-y'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-black/5 rounded-full transition-colors"
          title="إغلاق البطاقة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branch / Generation Tag */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: branchInfo.badge,
              color: branchInfo.text
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: branchInfo.accent }}
            />
            {person.branchName || 'سلسلة الأجداد'}
          </span>

          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            الجيل {person.generation}
          </span>

          {!isPrivacyRestricted && person.mother && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
              title={`الوالدة: ${person.mother.name}`}
            >
              <span>🌸</span>
              <span>أمه: {person.mother.name}</span>
            </span>
          )}

          {person.isNew && (
            <span className="px-2 py-0.5 border border-dashed border-emerald-600 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
              مُضاف حديثاً
            </span>
          )}

          {person.isDeceased && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-950 text-white border border-zinc-800 shadow-xs"
              title={person.deathYear ? `سنة الوفاة: ${person.deathYear}م` : 'متوفى'}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>{person.gender === 'f' ? 'متوفاة (رحمها الله)' : 'متوفى (رحمه الله)'}</span>
              {person.deathYear ? (
                <span className="text-zinc-300 font-normal mr-0.5">· {person.deathYear}م</span>
              ) : null}
            </span>
          )}
        </div>

        {/* Avatar and Name */}
        <div className="flex items-center gap-4">
          <div className="relative group/avatar flex-shrink-0">
            <div
              onClick={() => {
                if (person.photo) {
                  setIsPhotoLightboxOpen(true);
                } else if (isAuthorized) {
                  onChangePhoto(person.key);
                }
              }}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden relative transition-all ${
                person.photo
                  ? 'cursor-zoom-in group/photo hover:ring-3 hover:ring-emerald-500 hover:scale-105 active:scale-95'
                  : ''
              }`}
              style={{
                backgroundColor: branchInfo.bg,
                color: branchInfo.accent,
                border: `2px solid ${branchInfo.border}`
              }}
              title={person.photo ? 'اضغط لتكبير واستعراض الصورة 🔍' : person.name}
            >
              <MemberAvatar
                src={person.photo}
                personKey={person.key}
                name={person.name}
                gender={person.gender}
                imgClassName="w-full h-full object-cover"
              />
              {person.photo && (
                /* Subtle zoom icon on hover */
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                  <Maximize2 className="w-5 h-5 drop-shadow-md text-white" />
                  <span className="text-[9px] font-bold text-amber-200 mt-0.5 hidden sm:block">تكبير</span>
                </div>
              )}
            </div>

            {/* Change photo overlay button (Authorized Admin only) */}
            {isAuthorized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePhoto(person.key);
                }}
                title={person.photo ? 'تغيير الصورة' : 'إضافة صورة'}
                className="absolute -bottom-1.5 -left-1.5 p-1.5 bg-slate-900 hover:bg-emerald-800 text-white rounded-full shadow-md hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold font-['Alexandria'] text-slate-900 leading-tight">
              {person.title && (
                <span className="text-emerald-700 text-lg font-semibold ml-1.5">
                  {person.title}
                </span>
              )}
              {person.name}
            </h2>

            {parent && (
              <p className="text-sm text-slate-500 mt-1">
                {person.gender === 'f' ? 'ابنة' : 'ابن'}{' '}
                <button
                  onClick={() => onSelectPerson(parent.key, { reveal: true, center: true })}
                  className="font-semibold text-slate-700 hover:text-emerald-700 underline underline-offset-4 decoration-slate-300 hover:decoration-emerald-500"
                >
                  {parent.name}
                </button>
              </p>
            )}

            {!isPrivacyRestricted && person.mother && (
              <p className="text-xs text-slate-500 mt-0.5">
                <span>الوالدة:{' '}</span>
                {person.mother.isFromFamily && person.mother.personKey ? (
                  <button
                    onClick={() => onSelectPerson(person.mother!.personKey!, { reveal: true, center: true })}
                    className="font-semibold text-rose-800 hover:text-rose-950 underline decoration-rose-300"
                  >
                    {person.mother.name} (آل فردان)
                  </button>
                ) : (
                  <span className="font-semibold text-slate-700">
                    {person.mother.name} {person.mother.familyOrigin ? `(${person.mother.familyOrigin})` : ''}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Drawer Body */}
      <div
        className="member-modal-body flex-shrink-0 p-6 pb-28 space-y-6 touch-pan-y"
        style={{
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
          touchAction: 'pan-y'
        }}
      >
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <span className="block text-[11px] font-medium text-slate-500">الأبناء المباشرون</span>
            <span className="block text-lg font-bold font-['Alexandria'] text-slate-800 mt-0.5">
              {children.length}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <span className="block text-[11px] font-medium text-slate-500">إجمالي الذرية</span>
            <span className="block text-lg font-bold font-['Alexandria'] text-emerald-700 mt-0.5">
              {totalDescendants}
            </span>
          </div>

          <div
            onClick={() => {
              if (isAuthorized) {
                setIsEditingBirthDate(!isEditingBirthDate);
                setBirthDateInput(person.birthDate || (person.year ? String(person.year) : ''));
              }
            }}
            className={`border rounded-2xl p-3 text-center transition-all relative ${
              isAuthorized
                ? 'cursor-pointer hover:border-emerald-500 hover:shadow-xs group/bdate active:scale-98'
                : ''
            } ${
              person.birthDate || person.year
                ? 'bg-slate-50 border-slate-200/80'
                : 'bg-emerald-50/50 border-emerald-200/80'
            }`}
            title={isAuthorized ? 'اضغط لتعديل أو إضافة تاريخ الميلاد' : undefined}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
              <span>تاريخ / سنة الميلاد</span>
              {isAuthorized && (
                <Edit3 className="w-3 h-3 text-emerald-600 opacity-70 group-hover/bdate:opacity-100 transition-opacity" />
              )}
            </div>
            <span className="block text-sm font-bold font-['Alexandria'] text-slate-800 mt-1 truncate">
              {person.birthDate ? person.birthDate : person.year ? `${person.year}م` : 'غير مسجل'}
            </span>
            {isAuthorized && !person.birthDate && !person.year && (
              <span className="block text-[10px] text-emerald-700 font-bold mt-0.5 underline">
                + إضافة الآن
              </span>
            )}
          </div>
        </div>

        {/* Prominent Admin Quick Action Bar at the Top of the Drawer */}
        {isAuthorized && (
          <div className="p-3 bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/60 border border-emerald-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>أدوات وصلاحيات المشرف السريعة (تحديث لحظي على GitHub و Firebase):</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onAddChild(person.key)}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                title="إضافة ابن أو ابنة لهذا الفرد"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة ابن/ابنة</span>
              </button>
              <button
                type="button"
                onClick={() => onEditPerson(person.key)}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                title="تعديل الاسم، الأب، الجنس، الميلاد، الوفاة، والصورة"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الاسم</span>
              </button>
              {!['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF'].includes(person.key) && (
                <button
                  type="button"
                  onClick={() => {
                    onDeletePerson(person.key);
                  }}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  title="إلغاء وحذف هذا الاسم من الشجرة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إلغاء الاسم</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Birth Date Inline Editor for Admin */}
        {isAuthorized && isEditingBirthDate && (
          <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-2xl animate-in fade-in duration-200 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>إضافة / تعديل تاريخ الميلاد (خاص بالمشرف):</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingBirthDate(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600">
              يمكنك كتابة سنة الميلاد فقط (مثال: <strong>1985</strong>) أو كتابة التاريخ كاملاً (مثال: <strong>1985/04/12</strong> أو <strong>15 شوال 1405</strong>):
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                placeholder="مثال: 1990 أو 1990/05/20"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-['Alexandria'] text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBirthDate();
                  if (e.key === 'Escape') setIsEditingBirthDate(false);
                }}
              />
              <button
                type="button"
                onClick={handleSaveBirthDate}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
              >
                حفظ
              </button>
              {(person.birthDate || person.year) && (
                <button
                  type="button"
                  onClick={() => {
                    setBirthDateInput('');
                    if (onUpdateBirthDate) onUpdateBirthDate(person.key, null, null);
                    setIsEditingBirthDate(false);
                  }}
                  className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer flex-shrink-0"
                  title="مسح تاريخ الميلاد"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        )}

        {/* Death Status Section (زر الوفاة باللون الأسود وسنة الوفاة) */}
        <div
          className={`rounded-2xl p-3.5 border transition-all ${
            person.isDeceased
              ? 'bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white border-zinc-800 shadow-md'
              : 'bg-zinc-50 border-zinc-200 text-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                  person.isDeceased
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                🖤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${person.isDeceased ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    حالة الوفاة
                  </span>
                  {person.isDeceased ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-amber-200 border border-zinc-700">
                      {person.gender === 'f' ? 'متوفاة (رحمها الله)' : 'متوفى (رحمه الله)'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      على قيد الحياة
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs">
                  {person.isDeceased ? (
                    <span className="text-zinc-300 font-medium">
                      سنة الوفاة:{' '}
                      <strong className="text-white font-bold">
                        {person.deathYear ? `${person.deathYear} ميلادي` : 'غير مسجلة'}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[11px]">
                      أطال الله في عمره / عمرها بالصحة والعافية
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Respectful death status action (for authorized admin) */}
            {isAuthorized ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditingDeath(!isEditingDeath);
                  setIsDeceasedDraft(!!person.isDeceased);
                  setDeathYearInput(person.deathYear ? String(person.deathYear) : '');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-black text-white border border-zinc-700 hover:border-zinc-500 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                title="توثيق وتعديل حالة الوفاة (خاص بالمشرف)"
              >
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span>{person.isDeceased ? 'تعديل بيانات الوفاة' : 'توثيق حالة الوفاة'}</span>
              </button>
            ) : (
              person.isDeceased && (
                <div className="px-3 py-1 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-200 border border-zinc-800 flex-shrink-0">
                  {person.deathYear ? `${person.deathYear}م` : 'متوفى'}
                </div>
              )
            )}
          </div>

          {/* Quick Death Editing Form for Admin */}
          {isAuthorized && isEditingDeath && (
            <div className="mt-3 pt-3 border-t border-zinc-800/80 bg-zinc-900/90 -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl text-white animate-in fade-in duration-200 space-y-3">
              <span className="text-xs font-bold text-zinc-200 block">
                تحديث حالة الوفاة وسنة الوفاة (خاص بالمشرف):
              </span>

              {/* Status Toggle Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeceasedDraft(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    !isDeceasedDraft
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  🌱 على قيد الحياة
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeceasedDraft(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isDeceasedDraft
                      ? 'bg-zinc-950 text-white border-zinc-600 ring-2 ring-zinc-500 shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  🖤 {person.gender === 'f' ? 'متوفاة (رحمها الله)' : 'متوفى (رحمه الله)'}
                </button>
              </div>

              {/* Death Year Input (if deceased) */}
              {isDeceasedDraft && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 block">
                    سنة الوفاة (ميلادي):
                  </label>
                  <input
                    type="number"
                    value={deathYearInput}
                    onChange={(e) => setDeathYearInput(e.target.value)}
                    placeholder="مثال: 1995 أو 2012"
                    min="1600"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400 font-['Alexandria']"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingDeath(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeathStatus}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-zinc-950 hover:bg-black border border-zinc-600 hover:border-zinc-400 shadow-sm transition-all cursor-pointer"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Parents Card (الوالدان ونسب الأبوين) */}
        <div className="border border-slate-200/90 rounded-2xl p-3.5 bg-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {isPrivacyRestricted ? 'الوالد ونسب الأب' : 'الوالدان ونسب الأبوين'}
            </span>
            {isAuthorized && (
              <button
                onClick={() => setIsMotherModalOpen(true)}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                {person.mother ? 'تعديل الوالدة' : '+ توثيق الوالدة'}
              </button>
            )}
          </div>

          <div className={isPrivacyRestricted ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
            {/* Father */}
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl">
              <span className="text-[10px] text-emerald-800 font-bold block">الوالد (الأب)</span>
              {parent ? (
                <button
                  onClick={() => onSelectPerson(parent.key, { reveal: true, center: true })}
                  className="font-bold text-xs text-emerald-950 hover:underline mt-0.5 text-right block truncate cursor-pointer"
                >
                  {parent.name}
                </button>
              ) : (
                <span className="text-xs text-slate-400">الجد التأسيسي</span>
              )}
            </div>

            {/* Mother (Hidden in Visitor Privacy Mode) */}
            {!isPrivacyRestricted && (
              <div className="p-2.5 bg-rose-50/60 border border-rose-200/90 rounded-xl">
                <span className="text-[10px] text-rose-800 font-bold block">الوالدة (الأم)</span>
                {person.mother ? (
                  <div>
                    {person.mother.isFromFamily && person.mother.personKey ? (
                      <button
                        onClick={() => onSelectPerson(person.mother!.personKey!, { reveal: true, center: true })}
                        className="font-bold text-xs text-rose-950 hover:underline mt-0.5 text-right block truncate cursor-pointer"
                        title="عرض بطاقة الوالدة في الشجرة"
                      >
                        {person.mother.name}
                      </button>
                    ) : (
                      <span className="font-bold text-xs text-slate-800 mt-0.5 block truncate">
                        {person.mother.name}
                      </span>
                    )}
                    <span className="text-[10px] text-rose-700 block truncate">
                      {person.mother.isFromFamily ? 'من عائلة الفردان' : person.mother.familyOrigin || 'من خارج العائلة'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic block mt-0.5">
                    لم توثق بعد
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Section: نسبة للأم (من زوجات الأب) خاصة إذا كان الأب متزوجاً من أكثر من زوجة */}
          {!isPrivacyRestricted && parent && fatherSpouses.length > 0 && (
            <div className="mt-2 p-2.5 rounded-xl border bg-gradient-to-r from-rose-50/70 via-pink-50/40 to-amber-50/30 border-rose-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-200" />
                  <span>نسبة للأم (من زوجات الأب)</span>
                </div>
                {hasMultipleWives && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300">
                    والده متزوج من {fatherSpouses.length} زوجات
                  </span>
                )}
              </div>

              {person.mother ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-white/95 p-2 rounded-lg border border-rose-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-slate-800 truncate">
                        منسوب حالياً للوالدة: <strong className="text-rose-950 font-bold">{person.mother.name}</strong>
                      </span>
                    </div>
                    {isAuthorized && (
                      <button
                        onClick={() => setIsMotherModalOpen(true)}
                        className="text-[11px] font-semibold text-rose-700 hover:underline px-1.5 py-0.5 cursor-pointer flex-shrink-0"
                      >
                        تعديل
                      </button>
                    )}
                  </div>

                  {/* If father has multiple wives, show quick switch buttons */}
                  {isAuthorized && hasMultipleWives && (
                    <div className="pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-600 block mb-1">
                        تغيير نسبة هذا الفرد إلى إحدى زوجات والده الأخرى:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {fatherSpouses.map(sp => {
                          const isCurrent =
                            (person.mother?.personKey && person.mother.personKey === sp.personKey) ||
                            (person.mother?.name.trim() === sp.name.trim());

                          return (
                            <button
                              key={`switch-sp-${sp.id}`}
                              type="button"
                              disabled={isCurrent}
                              onClick={() => {
                                if (onSaveMother) {
                                  onSaveMother(person.key, {
                                    name: sp.name,
                                    isFromFamily: sp.isFromFamily,
                                    personKey: sp.personKey,
                                    familyOrigin: sp.familyOrigin || (sp.isFromFamily ? 'عائلة آل فردان' : 'من خارج العائلة'),
                                    notes: sp.notes
                                  });
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                isCurrent
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300 font-bold'
                                  : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 hover:border-rose-300'
                              }`}
                            >
                              <span>{isCurrent ? '✓' : '🌸'}</span>
                              <span>{sp.name}</span>
                              {sp.isFromFamily && <span className="text-[9px] text-emerald-700">(آل فردان)</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {hasMultipleWives
                      ? `والده «${parent.name}» متزوج من أكثر من زوجة (${fatherSpouses.length} زوجات). يرجى اختيار والدة هذا الفرد:`
                      : `والده «${parent.name}» متزوج من «${fatherSpouses[0].name}». هل تود نسبة الفرد إليها؟`}
                  </p>

                  {isAuthorized ? (
                    <div className="flex flex-wrap gap-1.5">
                      {fatherSpouses.map(sp => (
                        <button
                          key={`pick-sp-${sp.id}`}
                          type="button"
                          onClick={() => {
                            if (onSaveMother) {
                              onSaveMother(person.key, {
                                name: sp.name,
                                isFromFamily: sp.isFromFamily,
                                personKey: sp.personKey,
                                familyOrigin: sp.familyOrigin || (sp.isFromFamily ? 'عائلة آل فردان' : 'من خارج العائلة'),
                                notes: sp.notes
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 border-2 border-rose-300 hover:border-rose-500 text-rose-950 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>🌸 أمه: {sp.name}</span>
                          <span className="text-[9px] text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                            {sp.isFromFamily ? 'آل فردان' : sp.familyOrigin || 'خارج العائلة'}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsMotherModalOpen(true)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        + والدة أخرى
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {fatherSpouses.map(sp => (
                        <span
                          key={`badge-sp-${sp.id}`}
                          className="px-2 py-0.5 bg-white border border-rose-200 text-rose-900 rounded-md text-xs"
                        >
                          {sp.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nasab Lineage Box */}
        <div className="bg-gradient-to-br from-amber-50/50 to-emerald-50/40 border border-amber-200/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Award className="w-4 h-4 text-amber-700" />
              <span>النسب الشريف الكامل</span>
            </div>
            <button
              onClick={handleCopyLineage}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg shadow-2xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ النسب</span>
                </>
              )}
            </button>
          </div>

          <div className="text-sm leading-relaxed text-slate-800 mt-2">
            {lineageChain.map((p, idx) => (
              <React.Fragment key={`nasab-${p.key}`}>
                {idx === 0 ? (
                  <span className="font-bold text-slate-900 text-base">{p.name}</span>
                ) : (
                  <button
                    onClick={() => onSelectPerson(p.key, { reveal: true, center: true })}
                    className="font-medium text-slate-700 hover:text-emerald-700 hover:underline decoration-emerald-500 transition-colors mx-0.5"
                  >
                    {p.name}
                  </button>
                )}
                {idx < lineageChain.length - 1 && (
                  <span className="text-slate-400 text-xs mx-1">
                    {lineageChain[idx].gender === 'f' ? 'بنت' : 'بن'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Action Bar: Certificate and Add Child (Authorized Only) */}
        <div className={isAuthorized ? 'grid grid-cols-2 gap-2' : 'flex'}>
          {isAuthorized && (
            <button
              onClick={() => onAddChild(person.key)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ابن / ابنة</span>
            </button>
          )}

          <button
            onClick={() => onOpenCertificate(person.key)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors ${
              isAuthorized ? '' : 'w-full'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>عرض وثيقة النسب</span>
          </button>
        </div>

        {/* Notes & Bio Section */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">نبذة وملاحظات</span>
            {isAuthorized && !isEditingNote ? (
              <button
                onClick={() => {
                  setNoteDraft(person.note || '');
                  setIsEditingNote(true);
                }}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                {person.note ? 'تعديل' : '+ إضافة ملاحظة'}
              </button>
            ) : null}
          </div>

          {isAuthorized && isEditingNote ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="اكتب معلومات عن المهنة، السكن، تاريخ الوفاة، أو أي تفاصيل تخص هذا الفرد..."
                rows={3}
                className="w-full text-sm p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingNote(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-3 py-1 text-xs bg-emerald-700 text-white font-medium rounded-lg"
                >
                  حفظ الملاحظة
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              {person.note ? (
                person.note
              ) : (
                <span className="text-slate-400 italic">لا توجد ملاحظات مسجلة حتى الآن.</span>
              )}
            </p>
          )}
        </div>

        {/* Spouses / Wives Section (الزوجات أو الأزواج) - Hidden in Visitor Privacy Mode */}
        {!isPrivacyRestricted && (
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100" />
              <span>
                {person.gender === 'f'
                  ? (spouses.length > 1 ? `الأزواج (${spouses.length})` : `الزوج (${spouses.length})`)
                  : `الزوجات (${spouses.length})`}
              </span>
            </div>

            {isAuthorized && (
              <button
                onClick={() => {
                  setSpouseToEdit(null);
                  setIsSpouseModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{person.gender === 'f' ? 'إضافة زوج' : 'إضافة زوجة'}</span>
              </button>
            )}
          </div>

          {spouses.length === 0 ? (
            <div className="text-center py-2.5 text-xs text-slate-400">
              <span>{person.gender === 'f' ? 'لم يتم تسجيل بيانات الزوج بعد.' : 'لم يتم تسجيل بيانات الزوجة بعد.'}</span>
              {isAuthorized && (
                <button
                  onClick={() => {
                    setSpouseToEdit(null);
                    setIsSpouseModalOpen(true);
                  }}
                  className="block mx-auto mt-1 text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  + {person.gender === 'f' ? 'اضغط هنا لإضافة زوج' : 'اضغط هنا لإضافة زوجة'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {spouses.map(spouse => {
                const spousePerson = spouse.personKey ? registry.people.get(spouse.personKey) : null;
                const spouseQuad = spousePerson ? getQuadLineageName(spousePerson.key, registry.people, 4) : '';
                const spouseChildrenInfo = getChildrenOfSpouse(person.key, spouse, registry.people);
                const spouseSonsCount = spouseChildrenInfo.sons.length;
                const spouseDaughtersCount = spouseChildrenInfo.daughters.length;
                const spouseTotalCount = spouseChildrenInfo.all.length;

                return (
                  <div
                    key={spouse.id}
                    className="p-3.5 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/90 rounded-2xl transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-2xs">
                          {spousePerson?.photo ? (
                            <MemberAvatar
                              src={spousePerson.photo}
                              personKey={spousePerson.key}
                              name={spouse.name}
                              gender={spousePerson.gender}
                            />
                          ) : (
                            <Heart className="w-4 h-4 fill-rose-200/70" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {spouse.isFromFamily && spousePerson ? (
                              <button
                                onClick={() => onSelectPerson(spousePerson.key, { reveal: true, center: true })}
                                className="font-bold text-xs text-emerald-950 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer text-right"
                                title={`الانتقال إلى بطاقة ${person.gender === 'f' ? 'الزوج' : 'الزوجة'} في الشجرة`}
                              >
                                <span>{spouse.name}</span>
                                <ExternalLink className="w-3 h-3 text-emerald-600" />
                              </button>
                            ) : (
                              <h4 className="font-bold text-xs text-slate-900">
                                {spouse.name}
                              </h4>
                            )}

                            {spouse.isFromFamily ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                من عائلة الفردان
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                {spouse.familyOrigin || 'من خارج العائلة'}
                              </span>
                            )}
                          </div>

                          {spouse.isFromFamily && spousePerson && (
                            <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5" title={spouseQuad}>
                              الجيل {spousePerson.generation} · {spouseQuad}
                            </p>
                          )}

                          {spouse.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">
                              {spouse.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Admin Actions with foolproof inline delete confirm */}
                      {isAuthorized && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {spouseToDeleteConfirm === spouse.id ? (
                            <div className="flex items-center gap-1 p-1 bg-rose-50 border border-rose-300 rounded-xl animate-in fade-in">
                              <span className="text-[10px] font-bold text-rose-900 whitespace-nowrap">
                                حذف؟
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onDeleteSpouse) {
                                    onDeleteSpouse(person.key, spouse.id);
                                  }
                                  setSpouseToDeleteConfirm(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                نعم
                              </button>
                              <button
                                type="button"
                                onClick={() => setSpouseToDeleteConfirm(null)}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSpouseToEdit(spouse);
                                  setIsSpouseModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSpouseToDeleteConfirm(spouse.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={`حذف بيانات ${person.gender === 'f' ? 'الزوج' : 'الزوجة'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Children breakdown summary from this specific spouse */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          {person.gender === 'f' ? 'الأبناء من هذا الزوج:' : 'الأبناء من هذه الزوجة:'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            spouseTotalCount > 0
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {spouseTotalCount > 0
                            ? `${spouseTotalCount} (${spouseSonsCount} ذكور · ${spouseDaughtersCount} إناث)`
                            : 'لا توجد ذرية مسجلة بعد'}
                        </span>
                      </div>
                      {spouseTotalCount > 0 && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          مفصلون أدناه ↓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Children & Descendants - Beautifully Grouped by Spouse (or Flat Male List + Daughters Count in Visitor Mode) */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                الأبناء والذرية ({children.length})
              </h3>
              {children.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                  {sonsCount > 0 && `${sonsCount} ذكور`}
                  {sonsCount > 0 && daughtersCount > 0 && ' · '}
                  {daughtersCount > 0 && `${daughtersCount} إناث`}
                </span>
              )}
            </div>
            {isAuthorized && (
              <button
                type="button"
                onClick={() => onAddChild(person.key)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                title="إضافة ابن أو ابنة جديدة لهذا الشخص"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة ابن/ابنة</span>
              </button>
            )}
          </div>

          {/* If the person has recorded spouses and not in visitor privacy mode: group children distinctly per spouse */}
          {!isPrivacyRestricted && childrenBySpouse.groups.length > 0 ? (
            <div className="space-y-4">
              {childrenBySpouse.groups.map(group => {
                const sp = group.spouse;
                const spTotal = group.all.length;
                const spSons = group.sons.length;
                const spDaughters = group.daughters.length;
                const ordinalLabel = getSpouseOrdinal(group.index, person.gender === 'f');
                const spousePerson = group.spousePerson;
                const spouseBranch = spousePerson ? (BRANCH_COLORS[spousePerson.branch] || BRANCH_COLORS.b0) : null;

                return (
                  <div
                    key={`spouse-group-${sp.id || group.index}`}
                    className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* Spouse Group Header Banner */}
                    <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Spouse Avatar */}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs overflow-hidden border"
                          style={{
                            backgroundColor: spouseBranch ? spouseBranch.bg : '#F1F5F9',
                            color: spouseBranch ? spouseBranch.accent : '#475569',
                            borderColor: spouseBranch ? spouseBranch.border : '#CBD5E1'
                          }}
                        >
                          <MemberAvatar
                            src={spousePerson?.photo}
                            personKey={spousePerson?.key}
                            name={sp.name}
                            gender={spousePerson?.gender}
                          />
                        </div>

                        {/* Spouse Title, Name & Lineage */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                              {ordinalLabel}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {sp.name}
                            </span>
                            {sp.isFromFamily && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                                من العائلة
                              </span>
                            )}
                          </div>
                          {group.spouseQuad ? (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5" title={group.spouseQuad}>
                              {group.spouseQuad}
                            </p>
                          ) : sp.familyOrigin ? (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {sp.familyOrigin}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Right side: Count Badge & Open Spouse Button */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            spTotal > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {spTotal > 0
                            ? `${spTotal} أبناء (${spSons} ذكور · ${spDaughters} إناث)`
                            : 'لا توجد ذرية'}
                        </span>

                        {sp.isFromFamily && sp.personKey && (
                          <button
                            type="button"
                            onClick={() => onSelectPerson(sp.personKey!, { reveal: true, center: true })}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                            title={`انتقال لبطاقة ${sp.name} في الشجرة`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Children under this spouse */}
                    <div className="p-3 space-y-3">
                      {spTotal > 0 ? (
                        <>
                          {/* Sons from this spouse */}
                          {spSons > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 mb-1.5">
                                <span>👨 قسم الأبناء (الذكور) ({spSons}):</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.sons.map(child => {
                                  const childBranch = BRANCH_COLORS[child.branch] || BRANCH_COLORS.b0;
                                  return (
                                    <button
                                      key={`sp-son-${child.key}`}
                                      type="button"
                                      onClick={() => onSelectPerson(child.key, { reveal: true, center: true })}
                                      className="group flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer hover:shadow-xs active:scale-95"
                                    >
                                      <div
                                        className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                        style={{
                                          backgroundColor: childBranch.bg,
                                          color: childBranch.accent,
                                          border: `1px solid ${childBranch.border}`
                                        }}
                                      >
                                        <MemberAvatar
                                          src={child.photo}
                                          personKey={child.key}
                                          name={child.name}
                                          gender={child.gender}
                                        />
                                      </div>
                                      <span>{child.name}</span>
                                      {child.generation > 0 && (
                                        <span className="text-[9px] text-slate-400 font-normal">
                                          الجيل {child.generation}
                                        </span>
                                      )}
                                      {child.childrenKeys.length > 0 && (
                                        <span className="text-[10px] text-emerald-600 bg-emerald-100/60 px-1 py-0.2 rounded font-bold">
                                          ({child.childrenKeys.length})
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Daughters from this spouse */}
                          {spDaughters > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800 mb-1.5">
                                <span>🧕 قسم البنات (الكريمات) ({spDaughters}):</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.daughters.map(child => (
                                  <button
                                    key={`sp-dau-${child.key}`}
                                    type="button"
                                    onClick={() => onSelectPerson(child.key, { reveal: true, center: true })}
                                    className="group flex items-center gap-2 px-2.5 py-1.5 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-xs font-semibold text-rose-950 transition-all cursor-pointer hover:shadow-xs active:scale-95"
                                  >
                                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0 bg-rose-100 text-rose-700 border border-rose-300">
                                      <MemberAvatar
                                        src={child.photo}
                                        personKey={child.key}
                                        name={child.name}
                                        gender={child.gender}
                                      />
                                    </div>
                                    <span>{child.name}</span>
                                    {child.generation > 0 && (
                                      <span className="text-[9px] text-rose-400 font-normal">
                                        الجيل {child.generation}
                                      </span>
                                    )}
                                    {child.childrenKeys.length > 0 && (
                                      <span className="text-[10px] text-rose-600 bg-white border border-rose-200 px-1 py-0.2 rounded font-bold">
                                        ({child.childrenKeys.length})
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 py-1">
                          لم تسجل ذرية بعد من هذا {person.gender === 'f' ? 'الزوج' : 'الزوجة'}.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned children if any exist */}
              {childrenBySpouse.unassigned.all.length > 0 && (
                <div className="border border-amber-200 rounded-2xl bg-amber-50/30 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      أبناء مسجلون (غير محدد {person.gender === 'f' ? 'الزوج' : 'الزوجة'} بدقة) ({childrenBySpouse.unassigned.all.length}):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {childrenBySpouse.unassigned.all.map(child => (
                      <button
                        key={`unassigned-${child.key}`}
                        type="button"
                        onClick={() => onSelectPerson(child.key, { reveal: true, center: true })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-800 hover:bg-amber-50 transition-all cursor-pointer"
                      >
                        <span>{child.gender === 'f' ? '🧕' : '👨'}</span>
                        <span>{child.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : children.length > 0 ? (
            /* Person has NO spouses recorded: show standard flat children list */
            <div className="space-y-3">
              {sonsCount > 0 && (
                <div>
                  {daughtersCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 mb-1.5">
                      <span>👨 قسم الأبناء (الذكور) ({sonsCount}):</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {children.filter(c => c.gender !== 'f').map((child: ProcessedPerson) => {
                      const childBranch = BRANCH_COLORS[child.branch] || BRANCH_COLORS.b0;
                      return (
                        <button
                          key={`child-${child.key}`}
                          onClick={() => onSelectPerson(child.key, { reveal: true, center: true })}
                          className="group flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 transition-all cursor-pointer"
                        >
                          <div
                            className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                            style={{
                              backgroundColor: childBranch.bg,
                              color: childBranch.accent,
                              border: `1px solid ${childBranch.border}`
                            }}
                          >
                            <MemberAvatar
                              src={child.photo}
                              personKey={child.key}
                              name={child.name}
                              gender={child.gender}
                            />
                          </div>
                          <span>{child.name}</span>
                          {!isPrivacyRestricted && child.mother?.name && (hasMultipleWives || spouses.length > 1) && (
                            <span className="text-[9px] font-semibold text-rose-700 bg-rose-50/90 border border-rose-200 px-1 py-0.2 rounded-md">
                              أمه: {child.mother.name}
                            </span>
                          )}
                          {child.childrenKeys.length > 0 && (
                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600">
                              ({isPrivacyRestricted
                                ? child.childrenKeys.map(k => registry.people.get(k)).filter(c => c && !c.deleted && c.gender !== 'f').length
                                : child.childrenKeys.length})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {daughtersCount > 0 && (
                isPrivacyRestricted ? (
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs text-slate-700">
                    <span className="font-bold text-slate-700">البنات:</span>
                    <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full font-bold text-slate-800">
                      {daughtersCount === 1 ? 'بنت واحدة' : daughtersCount === 2 ? 'بنتان' : `${daughtersCount} بنات`}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 mb-1.5">
                      <span>🧕 قسم البنات (الكريمات) ({daughtersCount}):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {children.filter(c => c.gender === 'f').map((child: ProcessedPerson) => (
                        <button
                          key={`child-${child.key}`}
                          onClick={() => onSelectPerson(child.key, { reveal: true, center: true })}
                          className="group flex items-center gap-2 px-2.5 py-1.5 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-xs font-medium text-rose-950 transition-all cursor-pointer"
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0 bg-rose-100 text-rose-700 border border-rose-300">
                            <MemberAvatar
                              src={child.photo}
                              personKey={child.key}
                              name={child.name}
                              gender={child.gender}
                            />
                          </div>
                          <span>{child.name}</span>
                          {child.mother?.name && (hasMultipleWives || spouses.length > 1) && (
                            <span className="text-[9px] font-semibold text-rose-700 bg-white border border-rose-200 px-1 py-0.2 rounded-md">
                              أمها: {child.mother.name}
                            </span>
                          )}
                          {child.childrenKeys.length > 0 && (
                            <span className="text-[10px] text-rose-400 group-hover:text-rose-700">
                              ({child.childrenKeys.length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">لا يوجد أبناء مسجلون في الشجرة.</p>
          )}
        </div>

        {/* Siblings List */}
        {siblings.length > 0 && (() => {
          const visibleSiblings = isPrivacyRestricted ? siblings.filter(s => s.gender !== 'f') : siblings;
          const sistersCount = siblings.filter(s => s.gender === 'f').length;
          if (visibleSiblings.length === 0 && sistersCount === 0) return null;
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isPrivacyRestricted ? `الإخوة (${visibleSiblings.length})` : `الإخوة والأخوات (${siblings.length})`}
                </h3>
                {isPrivacyRestricted && sistersCount > 0 && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    الأخوات: {sistersCount === 1 ? 'أخت واحدة' : sistersCount === 2 ? 'أختان' : `${sistersCount} أخوات`}
                  </span>
                )}
              </div>
              {visibleSiblings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visibleSiblings.map((sib: ProcessedPerson) => {
                    const sibBranch = BRANCH_COLORS[sib.branch] || BRANCH_COLORS.b0;
                    return (
                      <button
                        key={`sib-${sib.key}`}
                        onClick={() => onSelectPerson(sib.key, { reveal: true, center: true })}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition-colors cursor-pointer"
                      >
                        <div
                          className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: sibBranch.bg,
                            color: sibBranch.accent,
                            border: `1px solid ${sibBranch.border}`
                          }}
                        >
                          <MemberAvatar
                            src={sib.photo}
                            personKey={sib.key}
                            name={sib.name}
                            gender={sib.gender}
                          />
                        </div>
                        <span>{sib.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Edit & Delete Actions - Authorized Only */}
        {isAuthorized && (
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditPerson(person.key)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>تعديل الاسم والبيانات</span>
              </button>

              {person.key !== registry.rootKey && (
                <button
                  onClick={() => setConfirmDelete(!confirmDelete)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {confirmDelete && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2 animate-in fade-in">
                <p className="font-semibold">
                  هل أنت متأكد من حذف «{person.name}»؟
                  {totalDescendants > 0 && ` سيختفي معه ${totalDescendants} من ذريته.`}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={() => {
                      onDeletePerson(person.key);
                      setConfirmDelete(false);
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded"
                  >
                    نعم، احذف
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Spouse Modal */}
      {isSpouseModalOpen && isAuthorized && (
        <AddEditSpouseModal
          isOpen={isSpouseModalOpen}
          onClose={() => {
            setIsSpouseModalOpen(false);
            setSpouseToEdit(null);
          }}
          person={person}
          spouseToEdit={spouseToEdit}
          registry={registry}
          onSubmit={(spouse) => {
            if (onSaveSpouse) {
              onSaveSpouse(person.key, spouse);
            }
            setIsSpouseModalOpen(false);
            setSpouseToEdit(null);
          }}
        />
      )}

      {/* Add / Edit Mother Modal */}
      {isMotherModalOpen && isAuthorized && (
        <AddEditMotherModal
          isOpen={isMotherModalOpen}
          onClose={() => setIsMotherModalOpen(false)}
          person={person}
          motherToEdit={person.mother}
          registry={registry}
          onSubmit={(mother) => {
            if (onSaveMother) {
              onSaveMother(person.key, mother);
            }
            setIsMotherModalOpen(false);
          }}
          onDelete={() => {
            if (onDeleteMother) {
              onDeleteMother(person.key);
            }
            setIsMotherModalOpen(false);
          }}
        />
      )}

      {/* Enlarged Photo Lightbox Modal - Strictly for viewing and zooming */}
      <PersonPhotoLightboxModal
        isOpen={isPhotoLightboxOpen}
        onClose={() => setIsPhotoLightboxOpen(false)}
        photoUrl={person.photo}
        personName={person.name}
        personKey={person.key}
        generation={person.generation}
        branchName={person.branchName}
        lineageTitle={formatLineageString(person.key, registry.people)}
      />
    </div>
  );
};
