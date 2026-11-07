import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { BRANCH_COLORS, getArabicInitial, getLineageChain, formatLineageString, normalizeArabic, getQuadLineageName } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowUp,
  User,
  Users,
  Search,
  Plus,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  Home,
  Copy,
  Check,
  Edit3,
  FileText,
  Share2,
  Compass,
  X,
  Phone,
  MessageCircle,
  Mail,
  Trash2
} from 'lucide-react';
import { KinshipFinder } from './KinshipFinder';
import { SmartVoiceAdvisor } from './SmartVoiceAdvisor';

interface FamilyExplorerViewProps {
  registry: FamilyTreeProcessed;
  currentPersonKey: string;
  onNavigateToPerson: (key: string) => void;
  onOpenAddModal: (parentKey: string) => void;
  onOpenEditModal: (personKey: string) => void;
  onDeletePerson?: (personKey: string) => void;
  onOpenCertificate: (personKey: string) => void;
  onSwitchToFullTree: (key?: string) => void;
  onOpenSearchResults?: (query: string) => void;
  onSelectPerson?: (key: string) => void;
  isAuthorized?: boolean;
  onOpenContact?: () => void;
}

const PROTECTED_TRUNK_KEYS = new Set(['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF']);

export const FamilyExplorerView: React.FC<FamilyExplorerViewProps> = ({
  registry,
  currentPersonKey,
  onNavigateToPerson,
  onOpenAddModal,
  onOpenEditModal,
  onDeletePerson,
  onOpenCertificate,
  onSwitchToFullTree,
  onOpenSearchResults,
  onSelectPerson,
  isAuthorized = false,
  onOpenContact,
}) => {
  // Navigation mode: 'home' or 'person'
  const [isHome, setIsHome] = useState<boolean>(() => currentPersonKey === 'home');
  const [copied, setCopied] = useState(false);
  // Hero Search State
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [isHeroSearchOpen, setIsHeroSearchOpen] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (heroSearchRef.current && !heroSearchRef.current.contains(event.target as Node)) {
        setIsHeroSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const heroSearchResults = useMemo(() => {
    const q = normalizeArabic(heroSearchQuery.trim());
    if (!q) return [];
    const results: ProcessedPerson[] = [];
    for (const p of registry.people.values()) {
      if (p.deleted) continue;
      const quad = normalizeArabic(getQuadLineageName(p.key, registry.people, 4));
      const normName = normalizeArabic(p.name);
      if (normName.includes(q) || quad.includes(q)) {
        results.push(p);
        if (results.length >= 10) break;
      }
    }
    return results;
  }, [heroSearchQuery, registry.people]);

  // Active person
  const personKeyToUse = currentPersonKey === 'home' ? registry.fardanKey : currentPersonKey;
  const currentPerson = registry.people.get(personKeyToUse) || registry.people.get(registry.fardanKey)!;

  // Patriarchs / Founders
  const fardan = registry.people.get(registry.fardanKey);
  const sheikhAli = registry.people.get(registry.rootKey);

  // Scroll to Top state & helper
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = document.getElementById('home-scroll-view');
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop > 260) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById('home-scroll-view');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // When clicking on grandfather / person:
  const handleOpenPerson = (key: string) => {
    setIsHome(false);
    onNavigateToPerson(key);
    scrollToTop();
  };

  const handleGoHome = () => {
    setIsHome(true);
    scrollToTop();
  };

  // Lineage Breadcrumb for current person
  const lineageChain = useMemo(() => {
    if (!currentPerson) return [];
    return getLineageChain(currentPerson.key, registry.people).reverse();
  }, [currentPerson, registry]);

  // Current person's children
  const children = useMemo(() => {
    if (!currentPerson) return [];
    return currentPerson.childrenKeys
      .map(k => registry.people.get(k))
      .filter((c): c is ProcessedPerson => !!c && !c.deleted);
  }, [currentPerson, registry]);

  const sons = useMemo(() => children.filter(c => c.gender === 'm'), [children]);
  const daughters = useMemo(() => children.filter(c => c.gender === 'f'), [children]);

  // Parent of current person for the "Back" button
  const parent = currentPerson?.parentKey ? registry.people.get(currentPerson.parentKey) : null;

  const branchInfo = currentPerson ? (BRANCH_COLORS[currentPerson.branch] || BRANCH_COLORS.b0) : BRANCH_COLORS.b0;

  const handleCopyLineage = () => {
    if (!currentPerson) return;
    const text = formatLineageString(currentPerson.key, registry.people);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If in Home Mode: Show the Family Logo, Grandfather portal, and Major Branches
  if (isHome) {
    return (
      <div className="min-h-full bg-gradient-to-b from-[#f8f9f6] via-[#f4f6f1] to-[#eef2ec] text-slate-800 font-['Readex_Pro',sans-serif] pb-24">
        {/* Hero Section with Official Logo */}
        <div className="relative pt-8 pb-10 px-4 text-center z-30">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Logo with Golden Glow */}
            <div className="relative inline-block mx-auto group">
              <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-1">
                  <img
                    src="/fardan-logo.jpg"
                    alt="شعار عائلة الفردان"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-amber-700 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                الوثيقة المعتمدة
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-slate-900 tracking-tight pt-2">
              شجرة عائلة الفردان
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
              موثقة ومحققة عبر الأجيال ابتداءً من الجد الأكبر <strong>الشيخ علي</strong>
            </p>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-500">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full font-semibold shadow-2xs">
                {registry.stats.totalCount} فرداً مسجلاً
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full font-semibold shadow-2xs">
                {registry.stats.totalGenerations} أجيال متعاقبة
              </span>
            </div>

            {/* Prominent Search Bar directly under title */}
            <div ref={heroSearchRef} className="pt-3 max-w-xl mx-auto w-full relative z-50 text-right">
              <div className="relative shadow-md hover:shadow-lg rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-600/15 transition-all">
                <Search className="w-5 h-5 absolute right-4 top-3.5 text-emerald-700 pointer-events-none" />
                <input
                  type="text"
                  value={heroSearchQuery}
                  onChange={e => {
                    setHeroSearchQuery(e.target.value);
                    setIsHeroSearchOpen(true);
                  }}
                  onFocus={() => setIsHeroSearchOpen(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && heroSearchQuery.trim() && onOpenSearchResults) {
                      setIsHeroSearchOpen(false);
                      onOpenSearchResults(heroSearchQuery.trim());
                    }
                  }}
                  placeholder="ابحث عن أي فرد في شجرة العائلة بالاسم أو اللقب أو النسب..."
                  className="w-full pr-12 pl-10 py-3.5 bg-transparent rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {heroSearchQuery && (
                  <button
                    onClick={() => {
                      setHeroSearchQuery('');
                      setIsHeroSearchOpen(false);
                    }}
                    className="absolute left-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isHeroSearchOpen && heroSearchQuery.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto z-[999] p-2 animate-in fade-in ring-1 ring-black/10">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      نتائج البحث المطابقة ({heroSearchResults.length})
                    </span>
                    {onOpenSearchResults && (
                      <button
                        onClick={() => {
                          setIsHeroSearchOpen(false);
                          onOpenSearchResults(heroSearchQuery.trim());
                        }}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>عرض كافة النتائج في إطار منفرد ⇱</span>
                      </button>
                    )}
                  </div>

                  {heroSearchResults.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-500">
                      لا توجد أسماء مطابقة لـ «{heroSearchQuery}»
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {heroSearchResults.map((result: ProcessedPerson) => {
                        const branchInfo = BRANCH_COLORS[result.branch] || BRANCH_COLORS.b0;
                        const quadName = getQuadLineageName(result.key, registry.people, 4);

                        return (
                          <button
                            key={`hero-search-${result.key}`}
                            onClick={() => {
                              setIsHeroSearchOpen(false);
                              if (onSelectPerson) {
                                onSelectPerson(result.key);
                              } else {
                                onSwitchToFullTree(result.key);
                              }
                            }}
                            className="w-full flex items-center justify-between p-2.5 hover:bg-emerald-50 rounded-xl transition-colors text-right cursor-pointer group gap-2.5 border border-transparent hover:border-emerald-200"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs overflow-hidden relative"
                                style={{
                                  backgroundColor: branchInfo.bg,
                                  color: branchInfo.accent,
                                  border: result.photo ? '1.5px solid #059669' : `1px solid ${branchInfo.border}`
                                }}
                              >
                                <MemberAvatar
                                  src={result.photo}
                                  personKey={result.key}
                                  name={result.name}
                                  gender={result.gender}
                                  imgClassName="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-900 transition-colors">
                                    {result.name}
                                  </span>
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{ backgroundColor: branchInfo.badge, color: branchInfo.text }}
                                  >
                                    الجيل {result.generation} · {result.branchName}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {quadName}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 group-hover:bg-emerald-200 px-3 py-1.5 rounded-xl flex-shrink-0 border border-emerald-300/80 shadow-2xs">
                              تحديد موقعه في الشجرة 🌲 ←
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick jump buttons to Smart Voice Advisor & Kinship Finder */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  const el = document.getElementById('smart-voice-advisor-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-2xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>المستشار الصوتي الذكي للأنساب 🎤🔊 ↓</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('kinship-finder-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/90 rounded-2xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>كاشف صلة النسب والقرابة بين الأفراد ↓</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grandfather Portal Card & Smart Voice Advisor */}
        <div className="max-w-3xl mx-auto px-4 space-y-8 relative z-10">
          {/* Smart Voice Genealogy Advisor directly under the main search box */}
          <SmartVoiceAdvisor
            registry={registry}
            onSelectPerson={(key) => handleOpenPerson(key)}
            onSwitchToTree={onSwitchToFullTree}
          />

          {/* Founding Ancestors Portal */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-amber-500/40 hover:border-amber-500 transition-all text-center space-y-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>عمود النسب والجد الأكبر الجامع</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-['Alexandria'] text-slate-900">
                ذرية الجد الأكبر الشيخ علي الكرزكاني
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xl mx-auto">
                يتفرع من <strong>عبد الحسين بن يوسف بن الشيخ علي</strong> كلٌ من: <strong>الجد الفردان</strong> (والد الجدين محمد وحسين وذريتهما) و<strong>الجد أيوب</strong> (والد الجد فردان الذي يتفرع منه عبدالله وذريته)
              </p>
            </div>

            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              اختر أحد الفرعين التأسيسيين أو ادخل إلى عمود النسب الكامل لاستعراض جميع الآباء والأبناء جيلاً بعد جيل.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                onClick={() => handleOpenPerson('am_mvzm8u6pyafp')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-800 to-slate-900 hover:from-emerald-900 hover:to-black text-white text-sm font-bold rounded-2xl shadow-xl transition-all transform active:scale-98 cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>ذرية الجد الفردان (فرعا محمد وحسين)</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleOpenPerson(registry.fardanKey)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-700 to-slate-900 hover:from-amber-800 hover:to-black text-white text-sm font-bold rounded-2xl shadow-xl transition-all transform active:scale-98 cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-300" />
                <span>ذرية فردان بن أيوب (فرع عبدالله)</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Access to Main Branches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-bold font-['Alexandria'] text-slate-900">
                فروع العائلة الرئيسية
              </h3>
              <span className="text-xs text-slate-500">اختر الفرع للتصفح المباشر</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {registry.heads.map(head => {
                const branchInfo = BRANCH_COLORS[head.branch] || BRANCH_COLORS.b0;
                const branchStat = registry.stats.branchesStats.find(b => b.key === head.key);
                const count = branchStat ? branchStat.count : 0;
                const headLineageText =
                  head.key === 'o4' || head.key === 'o15' || head.parentKey === 'am_mvzm8u6pyafp'
                    ? `${head.name} بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي`
                    : `${head.name} بن فردان بن أيوب بن عبد الحسين بن يوسف بن الشيخ علي`;

                return (
                  <button
                    key={`head-card-${head.key}`}
                    onClick={() => handleOpenPerson(head.key)}
                    className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-600 rounded-2xl shadow-sm hover:shadow-md transition-all text-right group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: branchInfo.bg,
                          color: branchInfo.accent,
                          border: `1.5px solid ${branchInfo.border}`
                        }}
                      >
                        <MemberAvatar
                          src={head.photo}
                          personKey={head.key}
                          name={head.name}
                          gender={head.gender}
                          imgClassName="w-full h-full object-cover rounded-2xl"
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-base font-['Alexandria'] group-hover:text-emerald-700 transition-colors">
                          ذرية {head.name}
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-semibold truncate mt-0.5">
                          {headLineageText}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {head.childrenKeys.length} أبناء مباشرين · {count} من الذرية
                        </p>
                      </div>
                    </div>

                    <div className="p-2 text-slate-400 group-hover:text-emerald-700 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Silsilat Al-Ajdad (Founders) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold font-['Alexandria'] text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>سلسلة الأجداد التأسيسية</span>
            </h3>
            <p className="text-xs text-slate-500">
              تسلسل الآباء والأجداد من الجد المؤسس الشيخ علي الكرزكاني وتفرع ذرية عبد الحسين إلى الفردان وأيوب:
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                sheikhAli,
                registry.people.get('ot1'),
                registry.people.get('ot2'),
                registry.people.get('am_mvzm8u6pyafp'),
                registry.people.get('ot3'),
                fardan
              ].filter(Boolean).map((anc) => (
                <button
                  key={`anc-${anc!.key}`}
                  onClick={() => handleOpenPerson(anc!.key)}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <span>{anc!.name}</span>
                  <span className="text-[10px] text-slate-400">({anc!.childrenKeys.length} أبناء)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kinship / Relationship Analyzer (في أسفل الصفحة الرئيسية) */}
          <div id="kinship-finder-section">
            <KinshipFinder
              registry={registry}
              onSelectPerson={(key) => handleOpenPerson(key)}
              onSwitchToTree={onSwitchToFullTree}
            />
          </div>

          {/* Contact, Team & Verification Section at the bottom of the Home Page */}
          <div className="pt-6 border-t border-slate-200/80">
            <div className="bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/50 border-2 border-emerald-700/20 rounded-3xl p-5 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-center sm:text-right">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-emerald-100">
                  <Phone className="w-7 h-7 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-base sm:text-lg font-bold font-['Alexandria'] text-slate-900">
                      صفحة التواصل وفريق العمل
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      معتمد
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-lg leading-relaxed">
                    قنوات التواصل (الواتساب والبريد الإلكتروني)، القائمون على العمل، وخاتم التحقيق: «تم بعون الله وفضله التحقيق بدقة المعلومات بواسطة الأستاذ / عبدالله عبدالكريم حسين الفردان».
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenContact}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-900 hover:to-black text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex-shrink-0 border border-emerald-500/30"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                <span>فتح صفحة التواصل والتوثيق ✉️</span>
              </button>
            </div>
          </div>
        </div>

        {/* Floating Scroll-to-Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 left-5 sm:left-8 z-40 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-900/95 hover:bg-emerald-950 text-white rounded-full shadow-2xl backdrop-blur-md border border-emerald-600/60 active:scale-95 transition-all text-xs font-bold animate-in fade-in cursor-pointer"
            title="العودة السريعة إلى أعلى الصفحة"
          >
            <ArrowUp className="w-4 h-4 text-emerald-300" />
            <span>العودة للأعلى ↑</span>
          </button>
        )}
      </div>
    );
  }

  // Person & Children View (When browsing a father/mother and their children)
  return (
    <div className="min-h-full bg-[#f8f9f6] text-slate-800 font-['Readex_Pro',sans-serif] pb-24">
      {/* Top Sticky Breadcrumbs & Back Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Back Button */}
          {parent ? (
            <button
              onClick={() => handleOpenPerson(parent.key)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
              title={`العودة إلى ${parent.name}`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع إلى {parent.name}</span>
            </button>
          ) : (
            <button
              onClick={handleGoHome}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
            >
              <Home className="w-4 h-4 text-emerald-700" />
              <span>الرئيسية</span>
            </button>
          )}

          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs text-slate-500 py-1">
            <button
              onClick={handleGoHome}
              className="hover:text-emerald-700 font-medium whitespace-nowrap"
            >
              الرئيسية
            </button>

            {lineageChain.map((item, idx) => (
              <React.Fragment key={`crumb-${item.key}`}>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                {idx === lineageChain.length - 1 ? (
                  <span className="font-bold text-slate-900 whitespace-nowrap bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg">
                    {item.name}
                  </span>
                ) : (
                  <button
                    onClick={() => handleOpenPerson(item.key)}
                    className="hover:text-emerald-700 whitespace-nowrap font-medium"
                  >
                    {item.name}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Switch to Canvas Tree Button */}
          <button
            onClick={() => onSwitchToFullTree(currentPerson.key)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
            title="عرض في الشجرة التفاعلية الكاملة"
          >
            <span>الشجرة الكاملة</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Current Person Header Card */}
        <div
          className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-md transition-all space-y-4"
          style={{
            borderRight: `6px solid ${branchInfo.accent}`
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile Avatar / Photo */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-md overflow-hidden"
                style={{
                  backgroundColor: branchInfo.bg,
                  color: branchInfo.accent,
                  border: `2px solid ${branchInfo.border}`
                }}
              >
                <MemberAvatar
                  src={currentPerson.photo}
                  personKey={currentPerson.key}
                  name={currentPerson.name}
                  gender={currentPerson.gender}
                  imgClassName="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: branchInfo.badge, color: branchInfo.text }}
                  >
                    {currentPerson.branchName || 'سلسلة الأجداد'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                    الجيل {currentPerson.generation}
                  </span>
                  {currentPerson.year && (
                    <span className="text-xs text-slate-500 font-medium">
                      (ولد {currentPerson.year}م)
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Alexandria'] text-slate-900 mt-1">
                  {currentPerson.title && (
                    <span className="text-emerald-700 font-semibold ml-1.5 text-xl">
                      {currentPerson.title}
                    </span>
                  )}
                  {currentPerson.name}
                </h2>

                {parent && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {currentPerson.gender === 'f' ? 'ابنة' : 'ابن'}{' '}
                    <button
                      onClick={() => handleOpenPerson(parent.key)}
                      className="font-bold text-slate-700 hover:text-emerald-700 underline"
                    >
                      {parent.name}
                    </button>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
              {isAuthorized && (
                <button
                  onClick={() => onOpenAddModal(currentPerson.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ابن / ابنة</span>
                </button>
              )}

              <button
                onClick={() => onOpenCertificate(currentPerson.key)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                title="إصدار وثيقة النسب"
              >
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">وثيقة النسب</span>
              </button>

              {isAuthorized && (
                <>
                  <button
                    onClick={() => onOpenEditModal(currentPerson.key)}
                    className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="تعديل الاسم والبيانات"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل</span>
                  </button>
                  {onDeletePerson && !PROTECTED_TRUNK_KEYS.has(currentPerson.key) && (
                    <button
                      onClick={() => onDeletePerson(currentPerson.key)}
                      className="flex items-center gap-1.5 px-3 py-2 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="إلغاء وحذف هذا الاسم من الشجرة"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>إلغاء الاسم</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Full Nasab Banner */}
          <div className="bg-gradient-to-r from-amber-50/60 to-emerald-50/40 border border-amber-200/60 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed text-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-amber-900 block text-xs mb-1">النسب المتصل:</span>
              <p className="text-slate-900">
                {formatLineageString(currentPerson.key, registry.people)}
              </p>
            </div>

            <button
              onClick={handleCopyLineage}
              className="p-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 shadow-2xs flex-shrink-0 transition-colors"
              title="نسخ النسب"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {currentPerson.note && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed italic">
              «{currentPerson.note}»
            </p>
          )}
        </div>

        {/* Section Header: Children (الأولاد والبنات) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold font-['Alexandria'] text-slate-900">
                أبناء وبنات {currentPerson.name} ({children.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                اضغط على أي فرد للدخول إلى قسم أبنائه وذريته
              </p>
            </div>

            {isAuthorized && (
              <button
                onClick={() => onOpenAddModal(currentPerson.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            )}
          </div>

          {/* Sons List (الذكور) */}
          {sons.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>الأبناء الذكور ({sons.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sons.map(son => {
                  const sonBranch = BRANCH_COLORS[son.branch] || BRANCH_COLORS.b0;
                  const hasChildren = son.childrenKeys.length > 0;

                  return (
                    <div
                      key={`son-${son.key}`}
                      onClick={() => handleOpenPerson(son.key)}
                      className="group bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-500 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform"
                          style={{
                            backgroundColor: sonBranch.bg,
                            color: sonBranch.accent,
                            border: `1.5px solid ${sonBranch.border}`
                          }}
                        >
                          <MemberAvatar
                            src={son.photo}
                            personKey={son.key}
                            name={son.name}
                            gender={son.gender}
                            imgClassName="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-slate-900 text-sm font-['Alexandria'] group-hover:text-emerald-800 transition-colors truncate">
                              {son.title ? `${son.title} ` : ''}
                              {son.name}
                            </h5>
                            {son.isNew && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-medium">
                                جديد
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5">
                            {hasChildren ? (
                              <span className="font-semibold text-emerald-700">
                                لديه {son.childrenKeys.length} من الأبناء (اضغط للاستعراض)
                              </span>
                            ) : (
                              <span className="text-slate-400">لا يوجد أبناء مسجلون حالياً</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isAuthorized && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditModal(son.key);
                              }}
                              className="p-2 text-slate-500 hover:text-emerald-800 hover:bg-emerald-100/80 rounded-xl transition-colors cursor-pointer"
                              title={`تعديل بيانات ${son.name}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {onDeletePerson && !PROTECTED_TRUNK_KEYS.has(son.key) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeletePerson(son.key);
                                }}
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-colors cursor-pointer"
                                title={`إلغاء وحذف ${son.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <div className="p-2 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-[-3px] transition-all">
                          <ChevronLeft className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daughters List (الإناث) */}
          {daughters.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>البنات ({daughters.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {daughters.map(dau => {
                  const hasChildren = dau.childrenKeys.length > 0;

                  return (
                    <div
                      key={`dau-${dau.key}`}
                      onClick={() => handleOpenPerson(dau.key)}
                      className="group bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-400 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden bg-rose-50 text-rose-700 border border-rose-200 group-hover:scale-105 transition-transform">
                          <MemberAvatar
                            src={dau.photo}
                            personKey={dau.key}
                            name={dau.name}
                            gender={dau.gender}
                            imgClassName="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <h5 className="font-bold text-slate-900 text-sm font-['Alexandria'] group-hover:text-rose-900 transition-colors truncate">
                            {dau.name}
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {hasChildren ? (
                              <span className="font-semibold text-rose-700">
                                {dau.childrenKeys.length} من الذرية (اضغط للاستعراض)
                              </span>
                            ) : (
                              <span className="text-slate-400">ابنة {currentPerson.name}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isAuthorized && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditModal(dau.key);
                              }}
                              className="p-2 text-slate-500 hover:text-rose-800 hover:bg-rose-100/80 rounded-xl transition-colors cursor-pointer"
                              title={`تعديل بيانات ${dau.name}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {onDeletePerson && !PROTECTED_TRUNK_KEYS.has(dau.key) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeletePerson(dau.key);
                                }}
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-colors cursor-pointer"
                                title={`إلغاء وحذف ${dau.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <div className="p-2 text-slate-400 group-hover:text-rose-700 group-hover:translate-x-[-3px] transition-all">
                          <ChevronLeft className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state if no children registered */}
          {children.length === 0 && (
            <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-300 rounded-3xl space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                لا يوجد أبناء مسجلون لـ {currentPerson.name} حتى الآن
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                يمكنك توثيق الأبناء والبنات وإضافتهم إلى هذه الشجرة المباركة بسهولة.
              </p>
              <button
                onClick={() => onOpenAddModal(currentPerson.key)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ابن أو ابنة الآن</span>
              </button>
            </div>
          )}

          {/* Kinship / Relationship Analyzer at bottom of Person View */}
          <div className="pt-4 border-t border-slate-200/80">
            <KinshipFinder
              registry={registry}
              onSelectPerson={(key) => handleOpenPerson(key)}
              onSwitchToTree={onSwitchToFullTree}
            />
          </div>

          {/* Contact, Team & Verification Section at the bottom */}
          <div className="pt-4 border-t border-slate-200/80">
            <div className="bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/50 border-2 border-emerald-700/20 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-right">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-emerald-100">
                  <Phone className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold font-['Alexandria'] text-slate-900">
                    صفحة التواصل وفريق العمل والتحقيق
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    «تم بعون الله وفضله التحقيق بدقة المعلومات بواسطة الأستاذ / عبدالله عبدالكريم حسين الفردان»
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenContact}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                <span>فتح صفحة التواصل ✉️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 left-5 sm:left-8 z-40 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-900/95 hover:bg-emerald-950 text-white rounded-full shadow-2xl backdrop-blur-md border border-emerald-600/60 active:scale-95 transition-all text-xs font-bold animate-in fade-in cursor-pointer"
          title="العودة السريعة إلى أعلى الصفحة"
        >
          <ArrowUp className="w-4 h-4 text-emerald-300" />
          <span>العودة للأعلى ↑</span>
        </button>
      )}
    </div>
  );
};
