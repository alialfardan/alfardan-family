import React, { useState, useMemo } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { BRANCH_COLORS, getArabicInitial, getQuadLineageName, normalizeArabic, standardizeArabicSpelling } from '../data/treeManager';
import {
  BarChart3,
  Users,
  Award,
  Layers,
  Sparkles,
  RotateCcw,
  Clock,
  History,
  FileDown,
  Upload,
  CheckCircle2,
  GitBranch,
  Lock,
  ShieldCheck,
  UserPlus,
  Trash2,
  Search,
  X,
  ExternalLink,
  ChevronLeft,
  Table,
  Heart,
  User,
  TrendingUp,
  Flame,
  Hash,
  Crown,
  Filter
} from 'lucide-react';

/**
 * Extract clean Arabic first name, filtering out honorary and religious titles,
 * while accurately preserving composite/compound theophoric and traditional names
 * (e.g., عبد الله, عبد الحسين, محمد علي, فاطمة الزهراء, نور الهدى...).
 */
export function extractFirstName(rawName: string): string {
  if (!rawName) return '';
  let clean = standardizeArabicSpelling(rawName.replace(/[ًٌٍَُِّْـ]/g, '').trim());

  // Strip prefixes
  const prefixRegex = /^(ملا|الشيخ|الحاج|الحاجة|المرحوم|المرحومة|الشهيد|الشهيدة|السيد|السيدة|الدكتور|الدكتورة|د\.|المهندس|المهندسة|الأستاذ|الأستاذة|الرضيع|الرضيعة|رضيع|فقيد الشباب|فقيدة الصبا|الشاب|الشابة)\s+/i;
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  }

  // Unify compound Abd names without space into consistent format
  clean = clean
    .replace(/^عبد\s+الله\b/, 'عبدالله')
    .replace(/^عبدالحسين\b/, 'عبد الحسين')
    .replace(/^عبدالعزيز\b/, 'عبد العزيز')
    .replace(/^عبدالكريم\b/, 'عبد الكريم')
    .replace(/^عبدالمحسن\b/, 'عبد المحسن')
    .replace(/^عبدالنبي\b/, 'عبد النبي')
    .replace(/^عبدالجليل\b/, 'عبد الجليل')
    .replace(/^عبدالهادي\b/, 'عبد الهادي')
    .replace(/^عبدالأمير\b/, 'عبد الأمير')
    .replace(/^عبدالرحيم\b/, 'عبد الرحيم')
    .replace(/^عبدالحليم\b/, 'عبد الحليم')
    .replace(/^عبدالحميد\b/, 'عبد الحميد')
    .replace(/^عبدالواحد\b/, 'عبد الواحد')
    .replace(/^عبدالرؤوف\b/, 'عبد الرؤوف')
    .replace(/^عبدالرسول\b/, 'عبد الرسول')
    .replace(/^عبدالخالق\b/, 'عبد الخالق')
    .replace(/^عبدالإله\b/, 'عبد الإله')
    .replace(/^عبدالحق\b/, 'عبد الحق')
    .replace(/^عبدعلي\b/, 'عبد علي');

  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return clean;

  // Theophoric / composite names starting with 'عبد'
  if (parts[0] === 'عبد' && parts[1]) {
    return parts[0] + ' ' + parts[1];
  }
  // Names starting with 'أم' or 'ام'
  if ((parts[0] === 'أم' || parts[0] === 'ام') && parts[1]) {
    return 'أم ' + parts[1];
  }
  // Double names starting with 'محمد'
  if (parts[0] === 'محمد' && parts[1] && ['علي', 'رضا', 'باقر', 'حسن', 'حسين', 'جواد', 'صادق', 'مهدي', 'طه', 'هادي'].includes(parts[1])) {
    return parts[0] + ' ' + parts[1];
  }
  // Compound female names
  if (parts[0] === 'فاطمة' && parts[1] === 'الزهراء') {
    return 'فاطمة الزهراء';
  }
  if (parts[0] === 'نور' && parts[1] === 'الهدى') {
    return 'نور الهدى';
  }

  return standardizeArabicSpelling(parts[0]);
}

interface AboutAndAnalyticsViewProps {
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onRestorePerson: (key: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenInteractiveTree?: () => void;
  isAuthorized?: boolean;
  onOpenAuthModal?: () => void;
  onOpenSearchResults?: (query: string) => void;
}

export const AboutAndAnalyticsView: React.FC<AboutAndAnalyticsViewProps> = ({
  registry,
  onSelectPerson,
  onRestorePerson,
  onExportBackup,
  onImportBackup,
  onOpenInteractiveTree,
  isAuthorized = false,
  onOpenAuthModal,
  onOpenSearchResults,
}) => {
  // Admin Portal View: 'none' | 'deleted' | 'newly_added'
  const [activeAdminPortal, setActiveAdminPortal] = useState<'none' | 'deleted' | 'newly_added'>('none');
  const [adminPortalSearch, setAdminPortalSearch] = useState('');

  // Grand Ancestral Trunks
  const mohammadTrunkKeys = ['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'o4'];
  const mohammadTrunkPeople = mohammadTrunkKeys
    .map(k => registry.people.get(k))
    .filter((p): p is ProcessedPerson => !!p);

  const hussainTrunkKeys = ['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'o15'];
  const hussainTrunkPeople = hussainTrunkKeys
    .map(k => registry.people.get(k))
    .filter((p): p is ProcessedPerson => !!p);

  const trunkKeys = ['ot0', 'ot1', 'ot2', 'ot3', 'oF', 'o13'];
  const trunkPeople = trunkKeys
    .map(k => registry.people.get(k))
    .filter((p): p is ProcessedPerson => !!p);

  // All recently added members
  const allNewMembers: ProcessedPerson[] = useMemo(() => {
    return Array.from(registry.people.values())
      .filter((p: ProcessedPerson) => p.isNew && !p.deleted)
      .sort((a: ProcessedPerson, b: ProcessedPerson) => (b.at || 0) - (a.at || 0));
  }, [registry.people]);

  // All deleted members
  const deletedMembers: ProcessedPerson[] = useMemo(() => {
    return Array.from(registry.people.values()).filter((p: ProcessedPerson) => p.deleted);
  }, [registry.people]);

  // Compute generation distribution
  const genCounts: Record<number, number> = {};
  registry.people.forEach((p: ProcessedPerson) => {
    if (p.deleted || p.generation === 0) return;
    genCounts[p.generation] = (genCounts[p.generation] || 0) + 1;
  });

  const maxBranchCount = Math.max(...registry.stats.branchesStats.map((b: { count: number }) => b.count), 1);

  // ----------------------------------------------------
  // Name Statistics & Analytics (Most Frequent & Unique)
  // ----------------------------------------------------
  const [frequentNamesFilter, setFrequentNamesFilter] = useState<'all' | 'm' | 'f'>('all');
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const [uniqueNamesFilter, setUniqueNamesFilter] = useState<'all' | 'm' | 'f'>('all');
  const [uniqueNamesSearch, setUniqueNamesSearch] = useState('');

  const { topNames, uniqueNames, nameStatsSummary } = useMemo(() => {
    const map = new Map<string, { displayName: string; maleCount: number; femaleCount: number; people: ProcessedPerson[] }>();

    registry.people.forEach((p) => {
      if (p.deleted) return;
      const fn = extractFirstName(p.name);
      if (!fn) return;
      const normKey = normalizeArabic(fn);
      if (!normKey) return;

      if (!map.has(normKey)) {
        map.set(normKey, { displayName: fn, maleCount: 0, femaleCount: 0, people: [] });
      }
      const entry = map.get(normKey)!;
      entry.people.push(p);
      if (p.gender === 'f') {
        entry.femaleCount++;
      } else {
        entry.maleCount++;
      }
    });

    const allStats = Array.from(map.values()).map((data) => {
      const totalCount = data.maleCount + data.femaleCount;
      const primaryGender: 'm' | 'f' | 'both' =
        data.maleCount > 0 && data.femaleCount > 0
          ? 'both'
          : data.femaleCount > 0
          ? 'f'
          : 'm';
      return {
        name: data.displayName,
        totalCount,
        maleCount: data.maleCount,
        femaleCount: data.femaleCount,
        primaryGender,
        people: data.people
      };
    });

    // Top names sorted by total count desc
    const sorted = [...allStats].sort((a, b) => b.totalCount - a.totalCount);

    // Unique names (appeared exactly once across family history)
    const unique = allStats
      .filter((item) => item.totalCount === 1)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    const summary = {
      totalDistinctNames: allStats.length,
      totalUniqueCount: unique.length,
      maleUniqueCount: unique.filter((u) => u.maleCount === 1).length,
      femaleUniqueCount: unique.filter((u) => u.femaleCount === 1).length,
      topFrequentCount: sorted.filter((s) => s.totalCount > 1).length
    };

    return { topNames: sorted, uniqueNames: unique, nameStatsSummary: summary };
  }, [registry.people]);

  // Filtered Frequent Names
  const displayedFrequentNames = useMemo(() => {
    let list = topNames.filter((n) => n.totalCount > 1);

    if (frequentNamesFilter === 'm') {
      list = list.filter((n) => n.maleCount > 0).sort((a, b) => b.maleCount - a.maleCount);
    } else if (frequentNamesFilter === 'f') {
      list = list.filter((n) => n.femaleCount > 0).sort((a, b) => b.femaleCount - a.femaleCount);
    }

    return list;
  }, [topNames, frequentNamesFilter]);

  // Filtered Unique Names
  const displayedUniqueNames = useMemo(() => {
    let list = uniqueNames;

    if (uniqueNamesFilter === 'm') {
      list = list.filter((u) => u.maleCount === 1);
    } else if (uniqueNamesFilter === 'f') {
      list = list.filter((u) => u.femaleCount === 1);
    }

    if (uniqueNamesSearch.trim()) {
      const q = normalizeArabic(uniqueNamesSearch.trim().toLowerCase());
      list = list.filter((u) => normalizeArabic(u.name.toLowerCase()).includes(q));
    }

    return list;
  }, [uniqueNames, uniqueNamesFilter, uniqueNamesSearch]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10 font-['Readex_Pro',sans-serif]">
      {/* Top Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>تاريخ العائلة وإحصائيات الذرية</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-slate-900">
          إحصائيات شجرة عائلة الفردان
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          نظرة شاملة على أرقام الشجرة المباركة، وتوزيع أفرادها عبر {registry.stats.totalGenerations} جيلاً ابتداءً من الجد الأكبر الشيخ علي الكرزكاني، وتفرع ذرية عبد الحسين بن يوسف بن الشيخ علي إلى الفردان (والد الجدين محمد وحسين وذريتهما) وأيوب (والد فردان الذي يتفرع منه عبدالله وذريته).
        </p>

        {onOpenInteractiveTree && (
          <div className="pt-2">
            <button
              onClick={onOpenInteractiveTree}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
            >
              <GitBranch className="w-4 h-4 text-emerald-300" />
              <span>استعراض الشجرة التفاعلية بالكامل</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center">
          <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <span className="block text-2xl font-bold font-['Alexandria'] text-slate-900">
            {registry.stats.totalCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">إجمالي الأفراد المسجلين</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center">
          <Layers className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <span className="block text-2xl font-bold font-['Alexandria'] text-slate-900">
            {registry.stats.totalGenerations}
          </span>
          <span className="text-xs text-slate-500 font-medium">أجيال موثقة</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center">
          <Sparkles className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <span className="block text-2xl font-bold font-['Alexandria'] text-slate-900">
            {registry.stats.addedCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">أفراد أُضيفوا حديثاً</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center">
          <Award className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <span className="block text-2xl font-bold font-['Alexandria'] text-slate-900">
            {registry.stats.photosCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">صور عائلية مؤرشفة</span>
        </div>
      </div>

      {/* General Demographics Summary Table (جدول إحصائيات الأفراد العامة) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs">
              <Table className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-['Alexandria'] text-slate-900">
                جدول الإحصاء العام للأسرة
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                إحصائيات عامة وموجزة تعتمد على بطاقة معلومات الأفراد (النوع والحالة) وتتحدّث لحظياً مع كل بطاقة
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-slate-500" />
            <span>المجموع الكلي: <strong className="text-slate-900 tabular-nums">{registry.stats.totalCount}</strong> فرداً</span>
          </div>
        </div>

        {/* 4 Colored Summary Quick Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* الرجال - الأزرق */}
          <div className="bg-blue-50/90 border-2 border-blue-200/90 hover:border-blue-400 rounded-2xl p-4 transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                اللون الأزرق
              </span>
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <span className="block text-xs font-bold text-blue-900">عدد الرجال</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-['Alexandria'] text-blue-700 tabular-nums">
                {registry.stats.maleCount}
              </span>
              <span className="text-xs font-bold text-blue-600 tabular-nums">
                {Math.round((registry.stats.maleCount / (registry.stats.totalCount || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-blue-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((registry.stats.maleCount / (registry.stats.totalCount || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* النساء - الوردي */}
          <div className="bg-pink-50/90 border-2 border-pink-200/90 hover:border-pink-400 rounded-2xl p-4 transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-500 text-white rounded-lg text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                اللون الوردي
              </span>
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <span className="block text-xs font-bold text-pink-900">عدد النساء</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-['Alexandria'] text-pink-600 tabular-nums">
                {registry.stats.femaleCount}
              </span>
              <span className="text-xs font-bold text-pink-600 tabular-nums">
                {Math.round((registry.stats.femaleCount / (registry.stats.totalCount || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-pink-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((registry.stats.femaleCount / (registry.stats.totalCount || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* الأحياء - الأخضر */}
          <div className="bg-emerald-50/90 border-2 border-emerald-200/90 hover:border-emerald-400 rounded-2xl p-4 transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                اللون الأخضر
              </span>
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="block text-xs font-bold text-emerald-900">عدد الأحياء</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-['Alexandria'] text-emerald-700 tabular-nums">
                {registry.stats.livingCount}
              </span>
              <span className="text-xs font-bold text-emerald-600 tabular-nums">
                {Math.round((registry.stats.livingCount / (registry.stats.totalCount || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-emerald-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((registry.stats.livingCount / (registry.stats.totalCount || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* الأموات - الأسود */}
          <div className="bg-slate-900 border-2 border-black hover:border-slate-700 text-white rounded-2xl p-4 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black border border-slate-700 text-white rounded-lg text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                اللون الأسود
              </span>
              <History className="w-5 h-5 text-slate-400" />
            </div>
            <span className="block text-xs font-bold text-slate-200">عدد الأموات (رحمهم الله)</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-['Alexandria'] text-white tabular-nums">
                {registry.stats.deceasedCount}
              </span>
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                {Math.round((registry.stats.deceasedCount / (registry.stats.totalCount || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.round((registry.stats.deceasedCount / (registry.stats.totalCount || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* The Formal Table (الجدول الرسمي) */}
        <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold font-['Alexandria']">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">الفئة الإحصائية</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">اللون المعتمد</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">العدد</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">النسبة المئوية</th>
                  <th className="py-3.5 px-4 font-extrabold hidden md:table-cell">معيار بطاقة المعلومات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. الرجال */}
                <tr className="bg-blue-50/50 hover:bg-blue-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-blue-900">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                      <span>عدد الرجال</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-xs font-bold">
                      الأزرق
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-black font-['Alexandria'] text-blue-800 text-base sm:text-lg tabular-nums">
                    {registry.stats.maleCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-700 tabular-nums">
                    {Math.round((registry.stats.maleCount / (registry.stats.totalCount || 1)) * 100)}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell text-xs">
                    استناداً للنوع: ذكر (m) في بطاقة الفرد
                  </td>
                </tr>

                {/* 2. النساء */}
                <tr className="bg-pink-50/50 hover:bg-pink-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-pink-900">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                      <span>عدد النساء</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-pink-100 text-pink-800 border border-pink-300 rounded-full text-xs font-bold">
                      الوردي
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-black font-['Alexandria'] text-pink-700 text-base sm:text-lg tabular-nums">
                    {registry.stats.femaleCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-pink-600 tabular-nums">
                    {Math.round((registry.stats.femaleCount / (registry.stats.totalCount || 1)) * 100)}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell text-xs">
                    استناداً للنوع: أنثى (f) في بطاقة الفرد
                  </td>
                </tr>

                {/* 3. الأحياء */}
                <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                      <span>عدد الأحياء</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold">
                      الأخضر
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-black font-['Alexandria'] text-emerald-800 text-base sm:text-lg tabular-nums">
                    {registry.stats.livingCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700 tabular-nums">
                    {Math.round((registry.stats.livingCount / (registry.stats.totalCount || 1)) * 100)}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell text-xs">
                    استناداً للحالة: على قيد الحياة (أطال الله في أعمارهم)
                  </td>
                </tr>

                {/* 4. الأموات */}
                <tr className="bg-slate-900 text-white hover:bg-slate-950 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                      <span>عدد الأموات</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-black text-white border border-slate-700 rounded-full text-xs font-bold">
                      الأسود
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-black font-['Alexandria'] text-white text-base sm:text-lg tabular-nums">
                    {registry.stats.deceasedCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-300 tabular-nums">
                    {Math.round((registry.stats.deceasedCount / (registry.stats.totalCount || 1)) * 100)}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 hidden md:table-cell text-xs">
                    استناداً للحالة: متوفى (رحمهم الله تعالى)
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-800 font-bold">
                <tr>
                  <td className="py-3 px-4">
                    المجموع الكلي المعتمد للأفراد
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-slate-500 font-medium">
                    (جميع المسجلين)
                  </td>
                  <td className="py-3 px-4 text-center font-black font-['Alexandria'] text-slate-900 text-base tabular-nums">
                    {registry.stats.totalCount}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900 tabular-nums">
                    100%
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 hidden md:table-cell">
                    مجرد إحصائيات عامة تتحدث فورياً عبر كل المنصات
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Explanatory footer note */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="leading-relaxed">
            <strong>ملاحظة المزامنة الفورية:</strong> يتم احتساب هذه الإحصائيات مباشرة من بطاقات أفراد العائلة (النوع وحالة الحياة)، وتتحدّث لحظياً وتلقائياً عند إضافة أي فرد جديد أو تعديل معلومات بطاقته، وتُرفع وتتزامن في جميع المنصات ومستودع GitHub مباشرة.
          </p>
        </div>
      </div>

      {/* Grand Ancestral Chain */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold font-['Alexandria'] text-slate-900">
            سلسلة الأجداد المؤسسين (عمود النسب)
          </h3>
        </div>

        {/* Lineage 1: Mohammad bin Al-Fardan */}
        <div className="space-y-2.5 bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-4">
          <p className="text-xs font-bold text-emerald-900">
            عمود نسب ذرية الجد محمد (محمد بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {mohammadTrunkPeople.map((person, idx) => (
              <React.Fragment key={`m-trunk-${person.key}`}>
                <button
                  onClick={() => onSelectPerson(person.key, { reveal: true, center: true })}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-amber-50 hover:from-emerald-100 hover:to-amber-100 border border-emerald-300/80 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-transform hover:scale-105"
                >
                  {person.name}
                </button>
                {idx < mohammadTrunkPeople.length - 1 && (
                  <span className="text-slate-400 font-bold text-xs">← بن ←</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Lineage 2: Hussain bin Al-Fardan */}
        <div className="space-y-2.5 bg-purple-50/40 border border-purple-200/70 rounded-2xl p-4">
          <p className="text-xs font-bold text-purple-900">
            عمود نسب ذرية الجد حسين (حسين بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hussainTrunkPeople.map((person, idx) => (
              <React.Fragment key={`h-trunk-${person.key}`}>
                <button
                  onClick={() => onSelectPerson(person.key, { reveal: true, center: true })}
                  className="px-4 py-2 bg-gradient-to-r from-purple-50 to-amber-50 hover:from-purple-100 hover:to-amber-100 border border-purple-300/80 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-transform hover:scale-105"
                >
                  {person.name}
                </button>
                {idx < hussainTrunkPeople.length - 1 && (
                  <span className="text-slate-400 font-bold text-xs">← بن ←</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Lineage 3: Abdullah bin Fardan bin Ayoub */}
        <div className="space-y-2.5 bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-900">
            عمود نسب ذرية الجد عبدالله بن فردان بن أيوب (عبدالله بن فردان بن أيوب بن عبد الحسين بن يوسف بن الشيخ علي):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {trunkPeople.map((person, idx) => (
              <React.Fragment key={`trunk-${person.key}`}>
                <button
                  onClick={() => onSelectPerson(person.key, { reveal: true, center: true })}
                  className="px-4 py-2 bg-gradient-to-r from-amber-50 to-emerald-50 hover:from-amber-100 hover:to-emerald-100 border border-amber-200/80 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-transform hover:scale-105"
                >
                  {person.name}
                </button>
                {idx < trunkPeople.length - 1 && (
                  <span className="text-slate-400 font-bold text-xs">← بن ←</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Branches Distribution Bar Chart */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold font-['Alexandria'] text-slate-900">
              توزيع أفراد العائلة حسب الفروع
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">مجموع الذرية لكل فرع</span>
        </div>

        <div className="space-y-4">
          {registry.stats.branchesStats.map((branch: { key: string; name: string; count: number; color: string }) => {
            const percentage = Math.round((branch.count / registry.stats.totalCount) * 100);
            const barWidth = Math.max(6, Math.round((branch.count / maxBranchCount) * 100));

            return (
              <div key={`stat-${branch.key}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectPerson(branch.key, { reveal: true, center: true })}
                    className="font-bold text-slate-800 hover:text-emerald-700 transition-colors"
                  >
                    {branch.name}
                  </button>
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <span className="font-bold text-slate-800 tabular-nums">{branch.count} فرداً</span>
                    <span>({percentage}%)</span>
                  </div>
                </div>

                <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: branch.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generation Breakdown Grid */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-bold font-['Alexandria'] text-slate-900">
          توزيع الأفراد حسب تعاقب الأجيال
        </h3>
        <p className="text-xs text-slate-500">
          يوضح عدد أفراد العائلة في كل جيل مسجل من الجيل الأول إلى الجيل الحالي:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {Object.entries(genCounts).map(([gen, count]) => (
            <div key={`gen-card-${gen}`} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-500">الجيل {gen}</span>
              <span className="block text-xl font-bold font-['Alexandria'] text-emerald-800 mt-1">
                {count}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">أفراد</span>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: الأسماء الأكثر تكراراً في العائلة                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                <Flame className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-['Alexandria'] text-slate-900">
                الأسماء الأكثر تكراراً في العائلة
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              تحليل وتوزيع الأسماء الأولى الأكثر تسمية للأبناء والبنات عبر أجيال ذرية عائلة الفردان
            </p>
          </div>

          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start sm:self-center">
            <button
              onClick={() => setFrequentNamesFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                frequentNamesFilter === 'all'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({nameStatsSummary.topFrequentCount})
            </button>
            <button
              onClick={() => setFrequentNamesFilter('m')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                frequentNamesFilter === 'm'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>رجال 👨</span>
              <span className="text-[10px] opacity-80">
                ({topNames.filter((n) => n.maleCount > 0 && n.totalCount > 1).length})
              </span>
            </button>
            <button
              onClick={() => setFrequentNamesFilter('f')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                frequentNamesFilter === 'f'
                  ? 'bg-pink-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>نساء 👩</span>
              <span className="text-[10px] opacity-80">
                ({topNames.filter((n) => n.femaleCount > 0 && n.totalCount > 1).length})
              </span>
            </button>
          </div>
        </div>

        {/* Top 3 Podium Highlights */}
        {displayedFrequentNames.length >= 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {displayedFrequentNames.slice(0, 3).map((item, idx) => {
              const medals = [
                {
                  label: 'المركز الأول',
                  badge: '🥇 الأول',
                  gradient: 'from-amber-500/20 via-amber-500/5 to-white',
                  border: 'border-amber-300',
                  badgeBg: 'bg-amber-400 text-slate-950',
                  textColor: 'text-amber-900'
                },
                {
                  label: 'المركز الثاني',
                  badge: '🥈 الثاني',
                  gradient: 'from-slate-300/30 via-slate-100/10 to-white',
                  border: 'border-slate-300',
                  badgeBg: 'bg-slate-300 text-slate-900',
                  textColor: 'text-slate-800'
                },
                {
                  label: 'المركز الثالث',
                  badge: '🥉 الثالث',
                  gradient: 'from-amber-700/15 via-amber-700/5 to-white',
                  border: 'border-amber-600/30',
                  badgeBg: 'bg-amber-700/80 text-white',
                  textColor: 'text-amber-950'
                }
              ];
              const m = medals[idx];
              const relevantCount =
                frequentNamesFilter === 'm'
                  ? item.maleCount
                  : frequentNamesFilter === 'f'
                  ? item.femaleCount
                  : item.totalCount;

              return (
                <div
                  key={`top-podium-${item.name}`}
                  className={`bg-gradient-to-b ${m.gradient} border ${m.border} rounded-2xl p-4 text-center relative overflow-hidden shadow-2xs hover:shadow-md transition-all`}
                >
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${m.badgeBg} mb-2 shadow-2xs`}>
                    {m.badge}
                  </span>
                  <div className={`text-2xl font-bold font-['Alexandria'] ${m.textColor}`}>
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 font-medium">
                    تكرر <span className="font-bold text-slate-900 tabular-nums">{relevantCount}</span> مرة
                  </div>
                  {onOpenSearchResults && (
                    <button
                      onClick={() => onOpenSearchResults(item.name)}
                      className="mt-2.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>استعراض الأفراد</span>
                      <Search className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Visual List with Progress Bars */}
        <div className="space-y-3 pt-2">
          {displayedFrequentNames
            .slice(0, showAllFrequent ? displayedFrequentNames.length : 12)
            .map((item, index) => {
              const maxCount =
                frequentNamesFilter === 'm'
                  ? displayedFrequentNames[0]?.maleCount || 1
                  : frequentNamesFilter === 'f'
                  ? displayedFrequentNames[0]?.femaleCount || 1
                  : displayedFrequentNames[0]?.totalCount || 1;

              const relevantCount =
                frequentNamesFilter === 'm'
                  ? item.maleCount
                  : frequentNamesFilter === 'f'
                  ? item.femaleCount
                  : item.totalCount;

              const barPercentage = Math.max(8, Math.round((relevantCount / maxCount) * 100));
              const totalFamilyPercent = ((relevantCount / registry.stats.totalCount) * 100).toFixed(1);

              return (
                <div
                  key={`name-stat-${item.name}`}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-2xs">
                        {index + 1}
                      </span>
                      <span className="font-bold font-['Alexandria'] text-sm sm:text-base text-slate-900 truncate">
                        {item.name}
                      </span>
                      {/* Gender Badge */}
                      {item.primaryGender === 'both' ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                          مشترك ({item.maleCount} 👨 / {item.femaleCount} 👩)
                        </span>
                      ) : item.primaryGender === 'f' ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700">
                          نساء 👩
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          رجال 👨
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {relevantCount} <span className="text-[11px] font-normal text-slate-500">فرداً</span>
                      </span>
                      <span className="text-[10px] text-slate-400">({totalFamilyPercent}%)</span>

                      {onOpenSearchResults && (
                        <button
                          onClick={() => onOpenSearchResults(item.name)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title={`البحث عن جميع الحاملين لاسم ${item.name}`}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-200/80">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-600 to-amber-500"
                      style={{ width: `${barPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {displayedFrequentNames.length > 12 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setShowAllFrequent(!showAllFrequent)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {showAllFrequent
                ? 'إظهار أقل ▲'
                : `عرض كافة الأسماء المتكررة (${displayedFrequentNames.length}) ▼`}
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: الأسماء الفريدة والنادرة (الاسم الوحيد في العائلة)         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/30 border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-200/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-800 flex items-center justify-center shadow-2xs border border-amber-300/50">
                <Sparkles className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-['Alexandria'] text-slate-900">
                أسماء نادرة وفريدة (غير مكررة في العائلة)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              أسماء كريمة وردت <strong>مرة واحدة فقط</strong> في تاريخ الشجرة المباركة، ولم تتكرر لأي فرد آخر في ذرية العائلة
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3 py-1.5 rounded-xl bg-amber-100/80 text-amber-900 border border-amber-300/60 text-xs font-bold shadow-2xs">
              ✨ {uniqueNames.length} اسماً فريداً
            </span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setUniqueNamesFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                uniqueNamesFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({uniqueNames.length})
            </button>
            <button
              onClick={() => setUniqueNamesFilter('m')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                uniqueNamesFilter === 'm'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>رجال 👨</span>
              <span className="text-[10px] opacity-80">({nameStatsSummary.maleUniqueCount})</span>
            </button>
            <button
              onClick={() => setUniqueNamesFilter('f')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                uniqueNamesFilter === 'f'
                  ? 'bg-pink-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>نساء 👩</span>
              <span className="text-[10px] opacity-80">({nameStatsSummary.femaleUniqueCount})</span>
            </button>
          </div>

          {/* Quick Search in Unique Names */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={uniqueNamesSearch}
              onChange={(e) => setUniqueNamesSearch(e.target.value)}
              placeholder="ابحث في الأسماء الفريدة..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {uniqueNamesSearch && (
              <button
                onClick={() => setUniqueNamesSearch('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Unique Names Chips Grid */}
        {displayedUniqueNames.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
            {displayedUniqueNames.map((item) => {
              const person = item.people[0];
              const isFemale = item.femaleCount === 1;

              return (
                <button
                  key={`unique-chip-${item.name}`}
                  onClick={() => {
                    if (person) {
                      onSelectPerson(person.key, { reveal: true, center: true });
                    }
                  }}
                  className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer active:scale-95 group flex flex-col justify-between ${
                    isFemale
                      ? 'bg-pink-50/70 border-pink-200/80 hover:bg-pink-100 hover:border-pink-300'
                      : 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300'
                  }`}
                  title={person ? `اضغط لعرض «${person.name}» في الشجرة مباشرة` : item.name}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold font-['Alexandria'] text-xs sm:text-sm text-slate-900 group-hover:text-emerald-900 truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] opacity-70 flex-shrink-0">
                      {isFemale ? '👩' : '👨'}
                    </span>
                  </div>

                  {person && (
                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60">
                      <span>الجيل {person.generation || '-'}</span>
                      <ChevronLeft className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
            <p>لا توجد أسماء فريدة مطابقة لبحثك «{uniqueNamesSearch}».</p>
            <button
              onClick={() => {
                setUniqueNamesSearch('');
                setUniqueNamesFilter('all');
              }}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              إعادة ضبط الفلتر
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-amber-200/40">
          <span>💡 اضغط على أي اسم نادر للانتقال المباشر لبطاقته في شجرة العائلة</span>
          <span className="font-bold tabular-nums">المعروض: {displayedUniqueNames.length} اسماً</span>
        </div>
      </div>

      {/* ADMIN-ONLY EXCLUSIVE PORTALS SECTION (Request 6) */}
      {isAuthorized ? (
        <div className="space-y-6">
          {/* Admin Header Section */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 border border-emerald-500/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-300 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>بوابات الإشراف الخاصة بالمشرف المصرح له</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-white">
                  سجلات إدارة الشجرة والمحذوفات والإضافات
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  هذه الخيارات متاحة فقط للمشرف، وتتيح لك استعراض ومراجعة الأسماء المضافة حديثاً مع الانتقال المباشر لموقعها في الشجرة، واستعراض الأسماء المحذوفة مع إمكانية استرجاعها.
                </p>
              </div>

              {/* Quick Backup Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={onExportBackup}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="تصدير نسخة احتياطية من الشجرة"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تصدير نسخة (JSON)</span>
                </button>

                <label className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>استيراد نسخة</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* The Two Dedicated Admin Portals Buttons (المدخل الأول والمدخل الثاني) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Entrance 1: Deleted Members Portal (المدخل للأسماء المحذوفة) */}
              <button
                onClick={() => {
                  setActiveAdminPortal(activeAdminPortal === 'deleted' ? 'none' : 'deleted');
                  setAdminPortalSearch('');
                }}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer text-right group ${
                  activeAdminPortal === 'deleted'
                    ? 'bg-rose-950/70 border-rose-500 shadow-lg ring-2 ring-rose-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-rose-400/60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    activeAdminPortal === 'deleted'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-500/20 text-rose-300 group-hover:bg-rose-600 group-hover:text-white'
                  }`}>
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      المدخل الأول (للمشرف فقط)
                    </span>
                    <h4 className="text-base sm:text-lg font-bold font-['Alexandria'] text-white">
                      سجل الأسماء المحذوفة
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      مراجعة الأسماء المستبعدة واسترجاعها إلى الشجرة
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    deletedMembers.length > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {deletedMembers.length} محذوفاً
                  </span>
                  <span className="text-[11px] text-rose-300 font-bold group-hover:underline">
                    {activeAdminPortal === 'deleted' ? 'إغلاق البوابة ▲' : 'فتح البوابة ▼'}
                  </span>
                </div>
              </button>

              {/* Entrance 2: Recently Added Members Portal (المدخل للأسماء المضافة حديثاً) */}
              <button
                onClick={() => {
                  setActiveAdminPortal(activeAdminPortal === 'newly_added' ? 'none' : 'newly_added');
                  setAdminPortalSearch('');
                }}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer text-right group ${
                  activeAdminPortal === 'newly_added'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-lg ring-2 ring-emerald-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-400/60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    activeAdminPortal === 'newly_added'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                  }`}>
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      المدخل الثاني (للمشرف فقط)
                    </span>
                    <h4 className="text-base sm:text-lg font-bold font-['Alexandria'] text-white">
                      سجل الأسماء المضافة حديثاً
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      قائمة الأفراد الجدد مع روابط تحديد موقعهم في الشجرة
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
                    {allNewMembers.length} فرداً جديداً
                  </span>
                  <span className="text-[11px] text-emerald-300 font-bold group-hover:underline">
                    {activeAdminPortal === 'newly_added' ? 'إغلاق البوابة ▲' : 'فتح البوابة ▼'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ACTIVE PORTAL 1: DELETED MEMBERS CONTENT */}
          {activeAdminPortal === 'deleted' && (
            <div className="bg-white border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3 gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 text-rose-800">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-['Alexandria'] text-slate-900">
                      قائمة وسجل الأسماء المحذوفة ({deletedMembers.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      يمكنك استرجاع أي فرد محذوف مع ذريته إلى مكانه الأصلي في الشجرة بضغطة زر واحدة.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveAdminPortal('none')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search filter for deleted */}
              {deletedMembers.length > 5 && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={adminPortalSearch}
                    onChange={(e) => setAdminPortalSearch(e.target.value)}
                    placeholder="ابحث في الأسماء المحذوفة..."
                    className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              )}

              {deletedMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  لا توجد أي أسماء محذوفة حالياً في سجل الشجرة.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pt-1">
                  {deletedMembers
                    .filter(m => {
                      if (!adminPortalSearch.trim()) return true;
                      return normalizeArabic(m.name).includes(normalizeArabic(adminPortalSearch.trim()));
                    })
                    .map((item: ProcessedPerson) => {
                      const parent = item.parentKey ? registry.people.get(item.parentKey) : null;
                      return (
                        <div
                          key={`del-portal-${item.key}`}
                          className="flex items-center justify-between p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl text-xs gap-3 hover:bg-rose-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {getArabicInitial(item.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate block">
                                {item.gender === 'f' ? 'أنثى' : 'ذكر'} · {parent ? `ابن/ابنة: ${parent.name}` : 'بلا أب محدد'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => onRestorePerson(item.key)}
                            className="px-3.5 py-1.5 bg-white hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-emerald-600 rounded-xl font-bold transition-all shadow-2xs flex-shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="استرجاع هذا الاسم وذريته إلى الشجرة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استرجاع إلى الشجرة</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE PORTAL 2: NEWLY ADDED MEMBERS CONTENT WITH INTERACTIVE TREE JUMP */}
          {activeAdminPortal === 'newly_added' && (
            <div className="bg-white border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3 gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-['Alexandria'] text-slate-900">
                      قائمة وسجل الأسماء المضافة حديثاً ({allNewMembers.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      اضغط على زر الشجرة بجانب أي اسم للانتقال المباشر وتحديد موقعه بدقة في الشجرة التفاعلية.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveAdminPortal('none')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search filter for newly added */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={adminPortalSearch}
                  onChange={(e) => setAdminPortalSearch(e.target.value)}
                  placeholder="ابحث في الأسماء المضافة حديثاً باسم الشخص أو الأب أو الجد..."
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {allNewMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  لا توجد أي أسماء مضافة حديثاً حالياً.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pt-1">
                  {allNewMembers
                    .filter(m => {
                      if (!adminPortalSearch.trim()) return true;
                      const q = normalizeArabic(adminPortalSearch.trim());
                      const quad = normalizeArabic(getQuadLineageName(m.key, registry.people, 4));
                      return normalizeArabic(m.name).includes(q) || quad.includes(q);
                    })
                    .map((item: ProcessedPerson) => {
                      const branchInfo = BRANCH_COLORS[item.branch] || BRANCH_COLORS.b0;
                      const parent = item.parentKey ? registry.people.get(item.parentKey) : null;
                      const quadName = getQuadLineageName(item.key, registry.people, 4);

                      return (
                        <div
                          key={`new-portal-${item.key}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-300 rounded-2xl text-xs gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs overflow-hidden relative"
                              style={{
                                backgroundColor: branchInfo.bg,
                                color: branchInfo.accent,
                                border: `1.5px solid ${branchInfo.border}`
                              }}
                            >
                              <span className="font-['Alexandria']">{getArabicInitial(item.name)}</span>
                              {item.photo && (
                                <img
                                  src={item.photo}
                                  alt={item.name}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {item.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {item.gender === 'f' ? 'أنثى' : 'ذكر'} · الجيل {item.generation}
                                </span>
                                {item.branchName && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{ backgroundColor: branchInfo.bg, color: branchInfo.accent }}
                                  >
                                    {item.branchName}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                <span className="text-slate-400">النسب: </span>
                                {quadName}
                              </p>

                              {item.mother && (
                                <p className="text-[10px] text-rose-700 truncate mt-0.5">
                                  الأم: {item.mother.name}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Direct Link to Interactive Tree (الرابط إلى الشجرة التفاعلية) */}
                          <div className="flex items-center gap-2 justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                            <button
                              onClick={() => {
                                onSelectPerson(item.key, { reveal: true, center: true });
                              }}
                              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="تحديد موقع هذا الفرد في الشجرة التفاعلية مباشرة"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-amber-300" />
                              <span>تحديد موقعه في الشجرة التفاعلية 🌲 ←</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Visitor Information & Admin Gateway */
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold font-['Alexandria'] text-slate-900">
                بوابة إدارة الشجرة والمصرح لهم
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                الموقع متاح لكافة الزوار والمهتمين للاستعراض والتصفح المباشر فقط. أدوات التحكم (إضافة أفراد، صور، ملاحظات، أو تعديل) مخصصة للمشرفين والمصرح لهم.
              </p>
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-md active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>تسجيل دخول المشرف</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
