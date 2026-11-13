import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { searchFamilyMembers, BRANCH_COLORS, getArabicInitial, getQuadLineageName } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import {
  analyzeKinship,
  KinshipResult,
  formatPersonDisplayName,
  formatFemaleInfoDisplayName
} from '../data/kinshipAnalyzer';
import {
  Users,
  Search,
  ArrowRightLeft,
  Sparkles,
  GitMerge,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Copy,
  Check,
  Award,
  Compass,
  Heart,
  Volume2,
  VolumeX,
  Lock,
  GitBranch
} from 'lucide-react';

interface KinshipFinderProps {
  registry: FamilyTreeProcessed;
  onSelectPerson?: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onSwitchToTree?: (key?: string) => void;
  isPrivacyRestricted?: boolean;
  onUnlockFamilyMode?: () => void;
}

type PerspectiveTab = 'paternal' | 'maternal' | 'cross' | 'inlaw' | null;

export const KinshipFinder: React.FC<KinshipFinderProps> = ({
  registry,
  onSelectPerson,
  onSwitchToTree,
  isPrivacyRestricted = false,
  onUnlockFamilyMode
}) => {
  const [keyA, setKeyA] = useState<string>('');
  const [keyB, setKeyB] = useState<string>('');

  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');

  const [isOpenA, setIsOpenA] = useState(false);
  const [isOpenB, setIsOpenB] = useState(false);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isSpeakingKinship, setIsSpeakingKinship] = useState(false);

  // All 4 sections closed by default
  const [activePerspective, setActivePerspective] = useState<PerspectiveTab>(null);

  const containerRefA = useRef<HTMLDivElement>(null);
  const containerRefB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRefA.current && !containerRefA.current.contains(event.target as Node)) {
        setIsOpenA(false);
      }
      if (containerRefB.current && !containerRefB.current.contains(event.target as Node)) {
        setIsOpenB(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActivePerspective(null);
  }, [keyA, keyB]);

  const resultsA = useMemo(() => {
    if (!queryA.trim()) return [];
    return searchFamilyMembers(queryA, registry.people, 40, { excludeFemales: isPrivacyRestricted });
  }, [queryA, registry, isPrivacyRestricted]);

  const resultsB = useMemo(() => {
    if (!queryB.trim()) return [];
    return searchFamilyMembers(queryB, registry.people, 40, { excludeFemales: isPrivacyRestricted });
  }, [queryB, registry, isPrivacyRestricted]);

  const kinshipResult: KinshipResult | null = useMemo(() => {
    if (!keyA || !keyB) return null;
    return analyzeKinship(keyA, keyB, registry.people, isPrivacyRestricted);
  }, [keyA, keyB, registry, isPrivacyRestricted]);

  const personA = keyA ? registry.people.get(keyA) : null;
  const personB = keyB ? registry.people.get(keyB) : null;

  const togglePerspective = (tab: Exclude<PerspectiveTab, null>) => {
    setActivePerspective(prev => (prev === tab ? null : tab));
  };

  const handleSwap = () => {
    const tempKey = keyA;
    setKeyA(keyB);
    setKeyB(tempKey);
    setQueryA('');
    setQueryB('');
  };

  const handleSelectA = (person: ProcessedPerson) => {
    setKeyA(person.key);
    setQueryA('');
    setIsOpenA(false);
  };

  const handleSelectB = (person: ProcessedPerson) => {
    setKeyB(person.key);
    setQueryB('');
    setIsOpenB(false);
  };

  const handleNavigate = (key?: string) => {
    if (!key) return;
    if (onSelectPerson) {
      onSelectPerson(key, { reveal: true, center: true });
    }
    if (onSwitchToTree) {
      onSwitchToTree(key);
    }
  };

  const handleCopyKinshipSummary = () => {
    if (!kinshipResult || !personA || !personB) return;
    const lines: string[] = [];
    lines.push(`صلة النسب والقرابة: «${kinshipResult.personADisplayName}» هو «${kinshipResult.relationshipTitle}» لـ «${kinshipResult.personBDisplayName}».`);
    lines.push(`• الجد المشترك: ${kinshipResult.paternalAnalysis.commonAncestorConciseLine}`);
    if (kinshipResult.paternalAnalysis.branchingPointConciseLine) {
      lines.push(`• نقطة التفرع: ${kinshipResult.paternalAnalysis.branchingPointConciseLine}`);
    }
    if (kinshipResult.maternalKinship.hasMaternalRelation) {
      lines.push(`• نسب الأمهات: ${kinshipResult.maternalKinship.maternalConciseSummary}`);
    }
    if (kinshipResult.crossAndGrandmothersKinship.hasCrossOrGrandmotherRelation) {
      lines.push(`• التقاطع والجدات: ${kinshipResult.crossAndGrandmothersKinship.summaryExplanation}`);
    }
    if (kinshipResult.inLawKinship.hasInLawRelation) {
      lines.push(`• المصاهرة: ${kinshipResult.inLawKinship.spousalExplanation}`);
    }
    lines.push(`(شجرة عائلة الفردان الكرزكاني)`);

    try {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2400);
    } catch (_) {}
  };

  const handleSpeakKinshipSummary = () => {
    if (!kinshipResult || !personA || !personB) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeakingKinship) {
      window.speechSynthesis.cancel();
      setIsSpeakingKinship(false);
      return;
    }

    window.speechSynthesis.cancel();
    let spoken = `صلة النسب والقرابة: ${kinshipResult.personADisplayName} هو ${kinshipResult.relationshipTitle} لـ ${kinshipResult.personBDisplayName}. ${kinshipResult.narrativeExplanation}`;
    if (kinshipResult.paternalAnalysis.branchingPointConciseLine) {
      spoken += ` ${kinshipResult.paternalAnalysis.branchingPointConciseLine}`;
    }
    if (kinshipResult.maternalKinship.hasMaternalRelation) {
      spoken += ` ومن جهة الأمهات: ${kinshipResult.maternalKinship.maternalConciseSummary}`;
    }
    if (kinshipResult.inLawKinship.hasInLawRelation) {
      spoken += ` ومن جهة المصاهرة: ${kinshipResult.inLawKinship.spousalExplanation}`;
    }

    const utterance = new SpeechSynthesisUtterance(spoken.replace(/[«»"•⬅⟶⟵]/g, ' '));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
      utterance.lang = arabicVoice.lang;
    }
    utterance.onstart = () => setIsSpeakingKinship(true);
    utterance.onend = () => setIsSpeakingKinship(false);
    utterance.onerror = () => setIsSpeakingKinship(false);
    setIsSpeakingKinship(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePreset = (aKey: string, bKey: string) => {
    setKeyA(aKey);
    setKeyB(bKey);
    setQueryA('');
    setQueryB('');
  };

  const crossLinksList = useMemo(() => {
    if (!kinshipResult) return [];
    const list = [];
    if (kinshipResult.crossAndGrandmothersKinship.paternalAToMaternalB) {
      list.push(kinshipResult.crossAndGrandmothersKinship.paternalAToMaternalB);
    }
    if (kinshipResult.crossAndGrandmothersKinship.maternalAToPaternalB) {
      list.push(kinshipResult.crossAndGrandmothersKinship.maternalAToPaternalB);
    }
    list.push(...kinshipResult.crossAndGrandmothersKinship.grandmotherLinks);
    return list;
  }, [kinshipResult]);

  /**
   * Renders a large, high-contrast dual badge bar above an explanation card:
   * [🟢 Badge Party 1 (Emerald)]  ⬅ / 🤝  [🟠 Badge Party 2 (Amber)]
   */
  const renderDualPartyBadges = (
    partyABadgeText: string,
    connector: '⬅' | '🤝' = '⬅',
    partyBBadgeText: string
  ) => (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2 border-b border-slate-100">
      <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800 text-white font-naskh text-base sm:text-lg font-bold shadow-xs">
        <span className="text-sm">🟢</span>
        <span>{partyABadgeText}</span>
      </span>

      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-lg sm:text-xl select-none">
        {connector}
      </span>

      <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 text-white font-naskh text-base sm:text-lg font-bold shadow-xs">
        <span className="text-sm">🟠</span>
        <span>{partyBBadgeText}</span>
      </span>
    </div>
  );

  /**
   * Highlights occurrences of «nameA» in emerald and «nameB» in amber inside explanation sentences
   * so elderly readers can visually connect each name to its colored badge immediately.
   */
  const renderHighlightedText = (text: string) => {
    if (!kinshipResult || !text) return text;
    const nameA = kinshipResult.personADisplayName;
    const nameB = kinshipResult.personBDisplayName;

    const tokenA = `«${nameA}»`;
    const tokenB = `«${nameB}»`;

    if (nameA === nameB) {
      return <span>{text}</span>;
    }

    const parts = text.split(/(«[^»]+»)/g);
    return parts.map((part, idx) => {
      if (part === tokenA) {
        return (
          <span
            key={idx}
            className="inline-block px-2 py-0.5 mx-0.5 rounded-lg bg-emerald-100 text-emerald-950 font-extrabold border border-emerald-300"
          >
            {nameA}
          </span>
        );
      }
      if (part === tokenB) {
        return (
          <span
            key={idx}
            className="inline-block px-2 py-0.5 mx-0.5 rounded-lg bg-amber-100 text-amber-950 font-extrabold border border-amber-300"
          >
            {nameB}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <section
      aria-label="خانة معرفة النسب بين الأفراد"
      className="bg-white rounded-3xl border-2 border-emerald-700/20 shadow-xl overflow-hidden font-['Readex_Pro',sans-serif] transition-all my-8"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-900 p-6 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 border border-amber-300/30 text-amber-300 rounded-full text-xs font-bold">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>كاشف صلة النسب والقرابة بين الأفراد</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold font-['Alexandria'] text-white">
            معرفة النسب والقرابة بالتحليل والتفصيل (الأب، الأم، والمصاهرة)
          </h3>

          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
            اختر أي شخصين لمعرفة عمود النسب من جهة الأب (العصبة والعمومة)، ونسب الأم (الأخوال والأرحام)، وصلة المصاهرة ونسب الزوجة إن وُجدت.
          </p>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
            <span className="text-emerald-300 font-semibold">أمثلة سريعة للاختبار:</span>
            <button
              onClick={() => handlePreset('oF', 'ot0')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              فردان ↔ الشيخ علي
            </button>
            <button
              onClick={() => handlePreset('o4', 'o15')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              محمد بن الفردان ↔ حسين بن الفردان
            </button>
            <button
              onClick={() => handlePreset('o4', 'o13')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              محمد بن الفردان ↔ عبدالله بن فردان
            </button>
            <button
              onClick={() => handlePreset('o17', 'o4')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              محفوظ بن محسن ↔ محمد بن الفردان
            </button>
          </div>
        </div>
      </div>

      {/* Two Inputs & Swap Controls Area */}
      <div className="p-5 sm:p-7 bg-[#fcfdfa] border-b border-slate-200/90 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
          {/* Party 1 */}
          <div className="lg:col-span-5 space-y-2" ref={containerRefA}>
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] flex items-center justify-center font-bold">
                  🟢
                </span>
                <span>الشخص المراد معرفة نسبه:</span>
              </label>
              {personA && (
                <button
                  onClick={() => {
                    setKeyA('');
                    setQueryA('');
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {personA ? (
              <div className="p-3.5 bg-emerald-50/80 border-2 border-emerald-600/50 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden">
                    <MemberAvatar
                      src={personA.photo}
                      personKey={personA.key}
                      name={personA.name}
                      gender={personA.gender}
                      imgClassName="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-naskh text-lg sm:text-xl font-bold text-emerald-950 truncate">
                      {formatPersonDisplayName(personA, registry.people, isPrivacyRestricted)}
                    </h4>
                    <p className="font-naskh text-sm font-semibold text-emerald-900 truncate">
                      {getQuadLineageName(personA.key, registry.people, 4)}
                    </p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      الجيل {personA.generation} · {personA.branchName || 'فرع العائلة'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setKeyA('');
                    setQueryA('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={queryA}
                    onChange={e => {
                      setQueryA(e.target.value);
                      setIsOpenA(true);
                    }}
                    onFocus={() => setIsOpenA(true)}
                    placeholder="ابحث بالاسم في الخانة الأولى..."
                    className="w-full pr-10 pl-8 py-2.5 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
                  />
                  {queryA && (
                    <button
                      onClick={() => {
                        setQueryA('');
                        setIsOpenA(false);
                      }}
                      className="absolute left-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isOpenA && queryA.trim().length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-64 overflow-y-auto z-40 p-1 divide-y divide-slate-100 animate-in fade-in">
                    {resultsA.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        لا توجد أسماء مطابقة لـ "{queryA}"
                      </div>
                    ) : (
                      resultsA.map(person => {
                        const branch = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
                        const quadName = getQuadLineageName(person.key, registry.people, 4);

                        return (
                          <button
                            key={`selA-${person.key}`}
                            onClick={() => handleSelectA(person)}
                            className="w-full text-right p-2.5 hover:bg-emerald-50/80 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                                style={{ backgroundColor: branch.bg, color: branch.accent }}
                              >
                                {getArabicInitial(person.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-naskh text-sm font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                  {quadName || person.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  <span className="font-semibold text-emerald-700">{person.gender === 'f' ? 'أنثى' : 'ذكر'}</span>
                                  <span> · الجيل {person.generation}</span>
                                  {person.branchName ? ` · ${person.branchName}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                              الجيل {person.generation}
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

          {/* Swap Button */}
          <div className="lg:col-span-1 flex items-center justify-center pt-2 lg:pt-5">
            <button
              onClick={handleSwap}
              disabled={!keyA && !keyB}
              className="p-3 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 disabled:opacity-40 disabled:pointer-events-none rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 group"
              title="تبديل الاسمين"
            >
              <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              <span className="lg:hidden text-xs font-bold">تبديل الاسمين</span>
            </button>
          </div>

          {/* Party 2 */}
          <div className="lg:col-span-5 space-y-2" ref={containerRefB}>
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                  🟠
                </span>
                <span>الشخص المقارن به:</span>
              </label>
              {personB && (
                <button
                  onClick={() => {
                    setKeyB('');
                    setQueryB('');
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {personB ? (
              <div className="p-3.5 bg-amber-50/80 border-2 border-amber-600/50 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden">
                    <MemberAvatar
                      src={personB.photo}
                      personKey={personB.key}
                      name={personB.name}
                      gender={personB.gender}
                      imgClassName="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-naskh text-lg sm:text-xl font-bold text-amber-950 truncate">
                      {formatPersonDisplayName(personB, registry.people, isPrivacyRestricted)}
                    </h4>
                    <p className="font-naskh text-sm font-semibold text-amber-950 truncate">
                      {getQuadLineageName(personB.key, registry.people, 4)}
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      الجيل {personB.generation} · {personB.branchName || 'فرع العائلة'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setKeyB('');
                    setQueryB('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={queryB}
                    onChange={e => {
                      setQueryB(e.target.value);
                      setIsOpenB(true);
                    }}
                    onFocus={() => setIsOpenB(true)}
                    placeholder="ابحث بالاسم في الخانة الثانية..."
                    className="w-full pr-10 pl-8 py-2.5 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
                  />
                  {queryB && (
                    <button
                      onClick={() => {
                        setQueryB('');
                        setIsOpenB(false);
                      }}
                      className="absolute left-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isOpenB && queryB.trim().length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-64 overflow-y-auto z-40 p-1 divide-y divide-slate-100 animate-in fade-in">
                    {resultsB.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        لا توجد أسماء مطابقة لـ "{queryB}"
                      </div>
                    ) : (
                      resultsB.map(person => {
                        const branch = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
                        const quadName = getQuadLineageName(person.key, registry.people, 4);

                        return (
                          <button
                            key={`selB-${person.key}`}
                            onClick={() => handleSelectB(person)}
                            className="w-full text-right p-2.5 hover:bg-amber-50/80 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                                style={{ backgroundColor: branch.bg, color: branch.accent }}
                              >
                                {getArabicInitial(person.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-naskh text-sm font-bold text-slate-900 group-hover:text-amber-900 truncate">
                                  {quadName || person.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  <span className="font-semibold text-amber-700">{person.gender === 'f' ? 'أنثى' : 'ذكر'}</span>
                                  <span> · الجيل {person.generation}</span>
                                  {person.branchName ? ` · ${person.branchName}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                              الجيل {person.generation}
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
        </div>
      </div>

      {/* Results Area */}
      <div className="p-5 sm:p-7">
        {!personA || !personB ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-2xl mx-auto flex items-center justify-center">
              <GitMerge className="w-7 h-7 text-emerald-700" />
            </div>
            <h4 className="text-base sm:text-lg font-bold font-['Alexandria'] text-slate-800">
              يرجى اختيار الشخصين أعلاه لعرض نتيجة التحليل
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              اختر اسماً في الخانة الأولى واسماً في الخانة الثانية لمعرفة درجة القرابة وتفاصيل عمود النسب من جهة الأب، ونسب الأم، وصلة المصاهرة.
            </p>
          </div>
        ) : kinshipResult ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ========================================================================= */}
            {/* 1. DEFAULT PRIMARY CARD (البطاقة الأساسية العلوية مع العناوين البارزة وخط النسخ) */}
            {/* ========================================================================= */}
            <div className="bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/50 border-2 border-emerald-700/40 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
              {/* Top Section Header Bar: 🟢 النسب من جهة الأب (الأعمام والعصبة) + Action Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-emerald-700/20 pb-4">
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-sm border border-emerald-600/40">
                  <span className="text-lg">🟢</span>
                  <Users className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span className="font-naskh text-lg sm:text-xl font-bold tracking-wide">
                    النسب من جهة الأب (الأعمام والعصبة)
                  </span>
                </div>

                {/* Listen & Copy Summary Buttons */}
                <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSpeakKinshipSummary}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer ${
                      isSpeakingKinship
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                    title="استماع لتقرير صلة القرابة بالصوت العربي الفصيح"
                  >
                    {isSpeakingKinship ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>إيقاف الصوت</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>استماع بالصوت 🔊</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyKinshipSummary}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="نسخ خلاصة صلة القرابة"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>نسخ الخلاصة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Paternal Kinship Headline & Explanation in Clear Naskh Font */}
              <div className="space-y-3">
                <h3 className="font-naskh text-2xl sm:text-4xl font-bold text-slate-900">
                  <span className="inline-block px-3 py-0.5 rounded-xl bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-bold">
                    {kinshipResult.personADisplayName}
                  </span>
                  <span className="text-slate-600 font-normal text-xl sm:text-2xl mx-2.5">هو</span>
                  <span className="text-amber-800 underline decoration-amber-400 decoration-2 underline-offset-8 font-extrabold">
                    {kinshipResult.relationshipTitle}
                  </span>
                  <span className="text-slate-600 font-normal text-xl sm:text-2xl mx-2.5">لـ</span>
                  <span className="inline-block px-3 py-0.5 rounded-xl bg-amber-100/90 text-amber-950 border border-amber-300 font-bold">
                    {kinshipResult.personBDisplayName}
                  </span>
                </h3>

                <p className="font-naskh text-lg sm:text-xl text-slate-800 font-semibold">
                  {renderHighlightedText(kinshipResult.narrativeExplanation)}
                </p>
              </div>

              {/* Compact Visual Paternal Path */}
              {kinshipResult.fullLineageChain.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-naskh text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-1.5">
                      <GitMerge className="w-4 h-4 text-emerald-700" />
                      <span>
                        مسار عمود النسب الأبوي بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}»:
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">اضغط على أي اسم للانتقال إليه</span>
                  </div>

                  <div className="p-4 bg-white/95 border border-emerald-200 rounded-2xl overflow-x-auto touch-pan-y overscroll-x-contain shadow-2xs">
                    <div className="flex items-center gap-2 min-w-max py-1 px-1">
                      {/* Node A */}
                      <button
                        onClick={() => handleNavigate(personA.key)}
                        className="p-3.5 bg-emerald-800 text-white rounded-2xl text-right shadow-sm hover:bg-emerald-900 transition-all cursor-pointer"
                      >
                        <span className="text-[11px] block text-emerald-200 font-bold">🟢 {kinshipResult.personADisplayName}</span>
                        <span className="font-naskh text-base sm:text-lg font-bold block">
                          {kinshipResult.personADisplayName}
                        </span>
                        <span className="text-[11px] block text-emerald-300">الجيل {personA.generation}</span>
                      </button>

                      {/* Upward chain to LCA */}
                      {kinshipResult.pathFromAToAncestor.slice(1, -1).map((ancestor, i) => (
                        <React.Fragment key={`main-pathA-${ancestor.key}-${i}`}>
                          <span className="text-emerald-700 font-bold text-base px-0.5">⟵</span>
                          <button
                            onClick={() => handleNavigate(ancestor.key)}
                            className="p-3 bg-emerald-50/60 border border-emerald-300 hover:border-emerald-600 text-slate-900 rounded-xl text-right shadow-2xs transition-all cursor-pointer"
                          >
                            <span className="text-[11px] block text-emerald-800 font-semibold">
                              {i === 0 ? `والد ${kinshipResult.personADisplayName}` : `جد ${kinshipResult.personADisplayName}`}
                            </span>
                            <span className="font-naskh text-base sm:text-lg font-bold block">
                              {formatPersonDisplayName(ancestor, registry.people, isPrivacyRestricted)}
                            </span>
                          </button>
                        </React.Fragment>
                      ))}

                      {/* Lowest Common Ancestor */}
                      {kinshipResult.commonAncestor &&
                        kinshipResult.personA.key !== kinshipResult.commonAncestor.key &&
                        kinshipResult.personB.key !== kinshipResult.commonAncestor.key && (
                          <>
                            <span className="text-amber-600 font-bold text-lg px-0.5">⟵</span>
                            <button
                              onClick={() => handleNavigate(kinshipResult.commonAncestor!.key)}
                              className="p-3.5 bg-amber-500 text-slate-950 font-bold rounded-2xl text-right shadow-md hover:bg-amber-400 transition-all cursor-pointer border-2 border-amber-600"
                            >
                              <span className="text-[11px] block text-amber-950/90 font-bold">⭐ الجد المشترك</span>
                              <span className="font-naskh text-base sm:text-xl font-extrabold block">
                                {formatPersonDisplayName(kinshipResult.commonAncestor, registry.people, isPrivacyRestricted)}
                              </span>
                              <span className="text-[11px] block text-amber-950/80">
                                الجيل {kinshipResult.commonAncestor.generation}
                              </span>
                            </button>
                            <span className="text-amber-600 font-bold text-lg px-0.5">⟶</span>
                          </>
                        )}

                      {/* Downward chain from LCA to B */}
                      {kinshipResult.pathFromBToAncestor
                        .slice(1, -1)
                        .reverse()
                        .map((ancestor, i, arr) => (
                          <React.Fragment key={`main-pathB-${ancestor.key}-${i}`}>
                            <button
                              onClick={() => handleNavigate(ancestor.key)}
                              className="p-3 bg-amber-50/60 border border-amber-300 hover:border-amber-600 text-slate-900 rounded-xl text-right shadow-2xs transition-all cursor-pointer"
                            >
                              <span className="text-[11px] block text-amber-900 font-semibold">
                                {i === arr.length - 1 ? `والد ${kinshipResult.personBDisplayName}` : `جد ${kinshipResult.personBDisplayName}`}
                              </span>
                              <span className="font-naskh text-base sm:text-lg font-bold block">
                                {formatPersonDisplayName(ancestor, registry.people, isPrivacyRestricted)}
                              </span>
                            </button>
                            <span className="text-amber-700 font-bold text-base px-0.5">⟶</span>
                          </React.Fragment>
                        ))}

                      {/* Node B */}
                      <button
                        onClick={() => handleNavigate(personB.key)}
                        className="p-3.5 bg-amber-700 text-white rounded-2xl text-right shadow-sm hover:bg-amber-800 transition-all cursor-pointer"
                      >
                        <span className="text-[11px] block text-amber-200 font-bold">🟠 {kinshipResult.personBDisplayName}</span>
                        <span className="font-naskh text-base sm:text-lg font-bold block">
                          {kinshipResult.personBDisplayName}
                        </span>
                        <span className="text-[11px] block text-amber-300">الجيل {personB.generation}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Prominent Maternal Section inside Primary Card: 🔴 النسب من جهة الأم (الأخوال والأرحام) */}
              {(kinshipResult.maternalKinship.personAMother || kinshipResult.maternalKinship.personBMother) && (
                <div className="p-5 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/50 border-2 border-rose-300 rounded-3xl shadow-xs space-y-4">
                  {/* Prominent Header Banner for Maternal Section */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 pb-3.5">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-rose-700 to-rose-900 text-white rounded-2xl shadow-xs">
                      <span className="text-lg">🔴</span>
                      <Heart className="w-5 h-5 text-rose-200 fill-rose-200 flex-shrink-0" />
                      <span className="font-naskh text-lg sm:text-xl font-bold tracking-wide">
                        النسب من جهة الأم (الأخوال والأرحام)
                      </span>
                    </div>

                    {kinshipResult.maternalKinship.maternalCommonAncestor &&
                      (!isPrivacyRestricted || kinshipResult.maternalKinship.maternalCommonAncestor.gender !== 'f') && (
                        <button
                          onClick={() => handleNavigate(kinshipResult.maternalKinship.maternalCommonAncestor!.key)}
                          className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>
                            الجد المشترك للأمهات:{' '}
                            {formatPersonDisplayName(
                              kinshipResult.maternalKinship.maternalCommonAncestor,
                              registry.people,
                              isPrivacyRestricted
                            )}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>

                  {/* Organized & Spread-Out Maternal Details in Clear Naskh Font */}
                  <div className="space-y-3">
                    <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                      {renderHighlightedText(kinshipResult.maternalKinship.maternalConciseSummary)}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                        <span className="font-naskh text-sm sm:text-base font-bold text-emerald-900 block">
                          🟢 والدة {kinshipResult.personADisplayName}:
                        </span>
                        <span className="font-naskh text-base sm:text-lg font-bold text-slate-900 block mt-0.5">
                          {kinshipResult.maternalKinship.motherADisplayName}
                          {kinshipResult.maternalKinship.motherAConcise && (
                            <span className="text-sm sm:text-base font-semibold text-slate-600 mr-1.5">
                              ({kinshipResult.maternalKinship.motherAConcise.shortLineage})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl">
                        <span className="font-naskh text-sm sm:text-base font-bold text-amber-900 block">
                          🟠 والدة {kinshipResult.personBDisplayName}:
                        </span>
                        <span className="font-naskh text-base sm:text-lg font-bold text-slate-900 block mt-0.5">
                          {kinshipResult.maternalKinship.motherBDisplayName}
                          {kinshipResult.maternalKinship.motherBConcise && (
                            <span className="text-sm sm:text-base font-semibold text-slate-600 mr-1.5">
                              ({kinshipResult.maternalKinship.motherBConcise.shortLineage})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 2. FOUR COLLAPSIBLE BUTTONS (أزرار أطراف النسب الأربعة - مغلقة افتراضياً) */}
            {/* ========================================================================= */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                  اضغط على أي طرف لعرض تفاصيل النسب القيمة والمختصرة:
                </h4>
                {activePerspective !== null && (
                  <button
                    onClick={() => setActivePerspective(null)}
                    className="text-xs sm:text-sm font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    إغلاق القسم المفتوح ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Button 1: 🟢 نسب الآباء والعمومة (أب ⬅ أب) */}
                <button
                  type="button"
                  onClick={() => togglePerspective('paternal')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    activePerspective === 'paternal'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-[1.01]'
                      : 'bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">🟢</span>
                    <div className="min-w-0">
                      <span className="font-naskh text-base sm:text-lg font-bold block">
                        نسب الآباء والعمومة
                      </span>
                      <span
                        className={`font-naskh text-xs sm:text-sm font-bold block mt-0.5 ${
                          activePerspective === 'paternal' ? 'text-emerald-200' : 'text-emerald-800'
                        }`}
                      >
                        (أب {kinshipResult.personADisplayName} ⬅ أب {kinshipResult.personBDisplayName})
                      </span>
                    </div>
                  </div>
                  {activePerspective === 'paternal' ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0 opacity-70" />
                  )}
                </button>

                {/* Button 2: 🔴 نسب الأمهات والأخوال (أم ⬅ أم) */}
                <button
                  type="button"
                  onClick={() => togglePerspective('maternal')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    activePerspective === 'maternal'
                      ? 'bg-rose-800 text-white border-rose-900 shadow-md scale-[1.01]'
                      : 'bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">🔴</span>
                    <div className="min-w-0">
                      <span className="font-naskh text-base sm:text-lg font-bold block">
                        نسب الأمهات والأخوال
                      </span>
                      <span
                        className={`font-naskh text-xs sm:text-sm font-bold block mt-0.5 ${
                          activePerspective === 'maternal' ? 'text-rose-200' : 'text-rose-800'
                        }`}
                      >
                        (أم {kinshipResult.personADisplayName} ⬅ أم {kinshipResult.personBDisplayName})
                      </span>
                    </div>
                  </div>
                  {activePerspective === 'maternal' ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0 opacity-70" />
                  )}
                </button>

                {/* Button 3: 🟣 تقاطع الأب والأم والجدات */}
                <button
                  type="button"
                  onClick={() => togglePerspective('cross')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    activePerspective === 'cross'
                      ? 'bg-purple-800 text-white border-purple-900 shadow-md scale-[1.01]'
                      : 'bg-purple-50/70 hover:bg-purple-100/80 text-purple-950 border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">🟣</span>
                    <div className="min-w-0">
                      <span className="font-naskh text-base sm:text-lg font-bold block">
                        تقاطع الأب والأم والجدات
                      </span>
                      <span
                        className={`font-naskh text-xs sm:text-sm font-bold block mt-0.5 ${
                          activePerspective === 'cross' ? 'text-purple-200' : 'text-purple-800'
                        }`}
                      >
                        {crossLinksList.length > 0 ? `(${crossLinksList.length} صلة مكتشفة)` : '(الجدات والتقاطعات)'}
                      </span>
                    </div>
                  </div>
                  {activePerspective === 'cross' ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0 opacity-70" />
                  )}
                </button>

                {/* Button 4: 🟡 المصاهرة والزواج */}
                <button
                  type="button"
                  onClick={() => togglePerspective('inlaw')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    activePerspective === 'inlaw'
                      ? 'bg-amber-700 text-white border-amber-800 shadow-md scale-[1.01]'
                      : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">🟡</span>
                    <div className="min-w-0">
                      <span className="font-naskh text-base sm:text-lg font-bold block">
                        المصاهرة والزواج
                      </span>
                      <span
                        className={`font-naskh text-xs sm:text-sm font-bold block mt-0.5 ${
                          activePerspective === 'inlaw' ? 'text-amber-100' : 'text-amber-900'
                        }`}
                      >
                        {kinshipResult.inLawKinship.hasInLawRelation ? '• توجد مصاهرة' : '(الأزواج والأصهار)'}
                      </span>
                    </div>
                  </div>
                  {activePerspective === 'inlaw' ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0 opacity-70" />
                  )}
                </button>
              </div>

              {/* Privacy Mode Notice inside opened non-paternal tabs */}
              {isPrivacyRestricted && activePerspective && activePerspective !== 'paternal' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-naskh text-base text-amber-950">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      تظهر الأسماء النسائية بصيغة <b>«كريمة [اسم والدها]»</b> للزوار، وتظهر كاملة عند تفعيل زر <b>«أنا من العائلة 🔒»</b>.
                    </span>
                  </div>
                  {onUnlockFamilyMode && (
                    <button
                      type="button"
                      onClick={onUnlockFamilyMode}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer flex-shrink-0"
                    >
                      تفعيل أنا من العائلة 🔒
                    </button>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* CONTENT 1: 🟢 داخل زر (نسب الآباء والعمومة) */}
              {/* ========================================================================= */}
              {activePerspective === 'paternal' && (
                <div className="bg-emerald-50/40 border-2 border-emerald-600/30 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-800" />
                      <h5 className="font-naskh text-xl sm:text-2xl font-bold text-emerald-950">
                        تفاصيل نسب الآباء والعمومة بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}»
                      </h5>
                    </div>
                    <button
                      onClick={() => setActivePerspective(null)}
                      className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  {/* Bullet Cards with Dual Colored Badges */}
                  <div className="space-y-4">
                    {/* 1. الجد الجامع المشترك */}
                    <div className="p-5 bg-white border border-emerald-200 rounded-2xl shadow-2xs space-y-3">
                      {renderDualPartyBadges(
                        kinshipResult.paternalAnalysis.partyABadge,
                        '⬅',
                        kinshipResult.paternalAnalysis.partyBBadge
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="space-y-1">
                          <span className="font-naskh text-sm sm:text-base font-bold text-emerald-800 block">
                            • الجد الجامع المشترك:
                          </span>
                          <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                            {renderHighlightedText(kinshipResult.paternalAnalysis.commonAncestorConciseLine)}
                          </p>
                        </div>
                        {kinshipResult.commonAncestor && (
                          <button
                            onClick={() => handleNavigate(kinshipResult.commonAncestor!.key)}
                            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                          >
                            <span>عرض الجد في الشجرة</span>
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. نقطة التفرع الأخوي (أبناء الجد المشترك) */}
                    {kinshipResult.paternalAnalysis.branchingPointConciseLine && (
                      <div className="p-5 bg-white border border-emerald-200 rounded-2xl shadow-2xs space-y-2.5">
                        {kinshipResult.paternalAnalysis.branchingPoint &&
                          renderDualPartyBadges(
                            `فرع ${kinshipResult.personADisplayName} (${kinshipResult.paternalAnalysis.branchingPoint.sonADisplayName})`,
                            '🤝',
                            `فرع ${kinshipResult.personBDisplayName} (${kinshipResult.paternalAnalysis.branchingPoint.sonBDisplayName})`
                          )}
                        <span className="font-naskh text-sm sm:text-base font-bold text-emerald-800 block pt-1">
                          • نقطة التفرع الأخوي (أبناء الجد المشترك):
                        </span>
                        <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                          {renderHighlightedText(kinshipResult.paternalAnalysis.branchingPointConciseLine)}
                        </p>
                      </div>
                    )}

                    {/* 3. سلسلة النسب الأبوي للطرفين */}
                    {kinshipResult.paternalAnalysis.visualPath.nodes.length > 0 && (
                      <div className="p-5 bg-white border border-emerald-200 rounded-2xl shadow-2xs space-y-3">
                        <span className="font-naskh text-base sm:text-lg font-bold text-emerald-900 block">
                          • سلسلة النسب الأبوي بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}» حتى الجد المشترك:
                        </span>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {kinshipResult.paternalAnalysis.visualPath.nodes.map((node, idx) => {
                            const highlightIdx = kinshipResult.paternalAnalysis.visualPath.nodes.findIndex(n => n.isHighlight);
                            const arrow = highlightIdx === -1 || idx <= highlightIdx ? '⟵' : '⟶';
                            return (
                              <React.Fragment key={`pat-bullet-node-${idx}`}>
                                {idx > 0 && (
                                  <span className="text-emerald-700 font-black text-lg px-0.5">{arrow}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => node.key && handleNavigate(node.key)}
                                  className={`px-3.5 py-2.5 rounded-xl text-right border transition-all cursor-pointer ${
                                    node.isHighlight
                                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-xs'
                                      : node.isEndpointA
                                      ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                                      : node.isEndpointB
                                      ? 'bg-amber-700 text-white border-amber-800 font-bold'
                                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-900 border-slate-200 font-semibold'
                                  }`}
                                >
                                  <span className="text-[11px] block opacity-85">{node.roleLabel}</span>
                                  <span className="font-naskh text-base sm:text-lg font-bold block">
                                    {node.displayName}
                                  </span>
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* CONTENT 2: 🔴 داخل زر (نسب الأمهات والأخوال) */}
              {/* ========================================================================= */}
              {activePerspective === 'maternal' && (
                <div className="bg-rose-50/40 border-2 border-rose-600/30 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-600 fill-rose-200" />
                      <h5 className="font-naskh text-xl sm:text-2xl font-bold text-rose-950">
                        تفاصيل نسب الأمهات والأخوال (أم {kinshipResult.personADisplayName} ⬅ أم {kinshipResult.personBDisplayName})
                      </h5>
                    </div>
                    <button
                      onClick={() => setActivePerspective(null)}
                      className="text-xs sm:text-sm font-bold text-rose-800 hover:text-rose-950 cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  {/* Bullet Cards for Mothers */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. والدة الشخص الأول باللون الأخضر الزمردي */}
                      <div className="p-5 bg-white border-2 border-emerald-300 rounded-2xl shadow-2xs space-y-2.5">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-800 text-white font-naskh text-base sm:text-lg font-bold">
                          <span>🟢</span>
                          <span>والدة {kinshipResult.personADisplayName}</span>
                        </span>
                        {kinshipResult.maternalKinship.motherAConcise ? (
                          <div className="space-y-1.5 font-naskh text-lg sm:text-xl text-slate-900 pt-1">
                            <p className="font-bold">
                              {kinshipResult.maternalKinship.motherAConcise.nameDisplay}{' '}
                              <span className="text-base sm:text-lg font-semibold text-slate-600">
                                ({kinshipResult.maternalKinship.motherAConcise.shortLineage})
                              </span>
                            </p>
                            <p className="text-base sm:text-lg text-slate-700">
                              <span className="font-bold text-emerald-900">الجدة أم الأم:</span>{' '}
                              {kinshipResult.maternalKinship.motherAConcise.grandmotherName}
                            </p>
                          </div>
                        ) : (
                          <p className="font-naskh text-base text-slate-400">غير مسجلة في بطاقة الفرد بعد.</p>
                        )}
                      </div>

                      {/* 2. والدة الشخص الثاني باللون الكهرماني/الذهبي */}
                      <div className="p-5 bg-white border-2 border-amber-300 rounded-2xl shadow-2xs space-y-2.5">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-naskh text-base sm:text-lg font-bold">
                          <span>🟠</span>
                          <span>والدة {kinshipResult.personBDisplayName}</span>
                        </span>
                        {kinshipResult.maternalKinship.motherBConcise ? (
                          <div className="space-y-1.5 font-naskh text-lg sm:text-xl text-slate-900 pt-1">
                            <p className="font-bold">
                              {kinshipResult.maternalKinship.motherBConcise.nameDisplay}{' '}
                              <span className="text-base sm:text-lg font-semibold text-slate-600">
                                ({kinshipResult.maternalKinship.motherBConcise.shortLineage})
                              </span>
                            </p>
                            <p className="text-base sm:text-lg text-slate-700">
                              <span className="font-bold text-amber-900">الجدة أم الأم:</span>{' '}
                              {kinshipResult.maternalKinship.motherBConcise.grandmotherName}
                            </p>
                          </div>
                        ) : (
                          <p className="font-naskh text-base text-slate-400">غير مسجلة في بطاقة الفرد بعد.</p>
                        )}
                      </div>
                    </div>

                    {/* 3. خلاصة قرابة الأمهات مع الشارة المزدوجة الملونة */}
                    <div className="p-5 bg-white border border-rose-200 rounded-2xl shadow-2xs space-y-3">
                      {renderDualPartyBadges(
                        kinshipResult.maternalKinship.partyABadge,
                        '⬅',
                        kinshipResult.maternalKinship.partyBBadge
                      )}
                      <span className="font-naskh text-sm sm:text-base font-bold text-rose-800 block pt-1">
                        • خلاصة قرابة الأمهات:
                      </span>
                      <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                        {renderHighlightedText(kinshipResult.maternalKinship.maternalConciseSummary)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* CONTENT 3: 🟣 داخل زر (تقاطع الأب والأم والجدات) */}
              {/* ========================================================================= */}
              {activePerspective === 'cross' && (
                <div className="bg-purple-50/40 border-2 border-purple-600/30 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-purple-800" />
                      <h5 className="font-naskh text-xl sm:text-2xl font-bold text-purple-950">
                        تفاصيل تقاطع الأب والأم والجدات بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}»
                      </h5>
                    </div>
                    <button
                      onClick={() => setActivePerspective(null)}
                      className="text-xs sm:text-sm font-bold text-purple-800 hover:text-purple-950 cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  {/* Independent Single-Line Bullet Cards with Prominent Dual Colored Badges */}
                  {crossLinksList.length > 0 ? (
                    <div className="space-y-3.5">
                      {crossLinksList.map(link => (
                        <div
                          key={link.id}
                          className="p-5 bg-white border border-purple-200 rounded-2xl shadow-2xs space-y-3"
                        >
                          {/* Prominent Dual Party Badges Bar */}
                          {renderDualPartyBadges(link.partyABadge, link.connector, link.partyBBadge)}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                              {renderHighlightedText(link.conciseBullet)}
                            </p>

                            {link.commonAncestor && (!isPrivacyRestricted || link.commonAncestor.gender !== 'f') && (
                              <button
                                onClick={() => handleNavigate(link.commonAncestor!.key)}
                                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                              >
                                <span>عرض في الشجرة</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 bg-white border border-purple-200 rounded-2xl font-naskh text-lg sm:text-xl font-bold text-slate-700">
                      • {renderHighlightedText(kinshipResult.crossAndGrandmothersKinship.summaryExplanation)}
                    </div>
                  )}

                  {/* Concise Summary of Direct Grandmothers with Real Names & Distinct Colors */}
                  {(kinshipResult.crossAndGrandmothersKinship.grandmothersA.length > 0 ||
                    kinshipResult.crossAndGrandmothersKinship.grandmothersB.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl space-y-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-800 text-white font-naskh text-base font-bold">
                          <span>🟢</span>
                          <span>جدات {kinshipResult.personADisplayName}</span>
                        </span>
                        {kinshipResult.crossAndGrandmothersKinship.grandmothersA.slice(0, 3).map(gm => (
                          <p key={gm.id} className="font-naskh text-base sm:text-lg text-slate-800">
                            • <span className="font-bold text-emerald-950">{gm.roleLabel}:</span> {gm.lineageSummary}
                          </p>
                        ))}
                      </div>
                      <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl space-y-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-600 text-white font-naskh text-base font-bold">
                          <span>🟠</span>
                          <span>جدات {kinshipResult.personBDisplayName}</span>
                        </span>
                        {kinshipResult.crossAndGrandmothersKinship.grandmothersB.slice(0, 3).map(gm => (
                          <p key={gm.id} className="font-naskh text-base sm:text-lg text-slate-800">
                            • <span className="font-bold text-amber-950">{gm.roleLabel}:</span> {gm.lineageSummary}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* CONTENT 4: 🟡 داخل زر (المصاهرة والزواج) */}
              {/* ========================================================================= */}
              {activePerspective === 'inlaw' && (
                <div className="bg-amber-50/40 border-2 border-amber-600/30 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-700" />
                      <h5 className="font-naskh text-xl sm:text-2xl font-bold text-amber-950">
                        تفاصيل المصاهرة والزواج بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}»
                      </h5>
                    </div>
                    <button
                      onClick={() => setActivePerspective(null)}
                      className="text-xs sm:text-sm font-bold text-amber-900 hover:text-amber-950 cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  {/* Direct Concise Bullets for In-Law / Marriage Relations with Dual Colored Badges */}
                  {kinshipResult.inLawKinship.bulletCards.length > 0 ? (
                    <div className="space-y-3.5">
                      {kinshipResult.inLawKinship.bulletCards.map(card => (
                        <div
                          key={card.id}
                          className="p-5 bg-white border border-amber-300 rounded-2xl shadow-2xs space-y-3"
                        >
                          {renderDualPartyBadges(card.partyABadge, card.connector, card.partyBBadge)}
                          <p className="font-naskh text-lg sm:text-xl font-bold text-slate-900 pt-1">
                            {renderHighlightedText(card.text)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 bg-white border border-amber-200 rounded-2xl font-naskh text-lg sm:text-xl font-bold text-slate-700">
                      • لا توجد صلة مصاهرة مباشرة مسجلة بين «{kinshipResult.personADisplayName}» و«{kinshipResult.personBDisplayName}» أو فروعهما المباشرة.
                    </div>
                  )}

                  {/* Concise Spouses Cards for Person A & Person B with Real Names */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white border-2 border-emerald-200 rounded-2xl space-y-2.5">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-800 text-white font-naskh text-base sm:text-lg font-bold">
                        <span>🟢</span>
                        <span>زوجات / أزواج {kinshipResult.personADisplayName}</span>
                      </span>
                      {(personA.spouses || []).length === 0 ? (
                        <p className="font-naskh text-base text-slate-400">غير مسجل.</p>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          {personA.spouses!.map(sp => {
                            const wPerson = sp.personKey ? registry.people.get(sp.personKey) || null : null;
                            const spDisp = formatFemaleInfoDisplayName(sp, wPerson, registry.people, isPrivacyRestricted);
                            return (
                              <p key={`spA-${sp.id}`} className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                                - {spDisp}{' '}
                                <span className="text-sm sm:text-base font-semibold text-slate-500">
                                  ({sp.isFromFamily ? 'من آل فردان' : sp.familyOrigin || 'خارج العائلة'})
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-white border-2 border-amber-200 rounded-2xl space-y-2.5">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-naskh text-base sm:text-lg font-bold">
                        <span>🟠</span>
                        <span>زوجات / أزواج {kinshipResult.personBDisplayName}</span>
                      </span>
                      {(personB.spouses || []).length === 0 ? (
                        <p className="font-naskh text-base text-slate-400">غير مسجل.</p>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          {personB.spouses!.map(sp => {
                            const wPerson = sp.personKey ? registry.people.get(sp.personKey) || null : null;
                            const spDisp = formatFemaleInfoDisplayName(sp, wPerson, registry.people, isPrivacyRestricted);
                            return (
                              <p key={`spB-${sp.id}`} className="font-naskh text-lg sm:text-xl font-bold text-slate-900">
                                - {spDisp}{' '}
                                <span className="text-sm sm:text-base font-semibold text-slate-500">
                                  ({sp.isFromFamily ? 'من آل فردان' : sp.familyOrigin || 'خارج العائلة'})
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Direct Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleNavigate(personA.key)}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  الانتقال إلى {kinshipResult.personADisplayName} في الشجرة
                </button>
                <button
                  onClick={() => handleNavigate(personB.key)}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  الانتقال إلى {kinshipResult.personBDisplayName} في الشجرة
                </button>
                <button
                  onClick={() => {
                    const container = document.getElementById('home-scroll-view');
                    if (container) {
                      container.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <span>الصعود لأعلى الصفحة ↑</span>
                </button>
              </div>

              <button
                onClick={handleSwap}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer py-1"
              >
                <span>
                  معرفة نسبة {kinshipResult.personBDisplayName} إلى {kinshipResult.personADisplayName} (تبديل ⇄)
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
