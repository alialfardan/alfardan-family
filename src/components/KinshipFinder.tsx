import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { searchFamilyMembers, BRANCH_COLORS, getArabicInitial, getQuadLineageName } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import { analyzeKinship, KinshipResult } from '../data/kinshipAnalyzer';
import {
  Users,
  Search,
  ArrowRightLeft,
  Sparkles,
  GitMerge,
  ChevronDown,
  X,
  ExternalLink,
  Copy,
  Check,
  Award,
  Calendar,
  Compass,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Heart,
  Layers,
  BookOpen,
  Volume2,
  VolumeX
} from 'lucide-react';

interface KinshipFinderProps {
  registry: FamilyTreeProcessed;
  onSelectPerson?: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onSwitchToTree?: (key?: string) => void;
}

export const KinshipFinder: React.FC<KinshipFinderProps> = ({
  registry,
  onSelectPerson,
  onSwitchToTree
}) => {
  // Key A (Subject - الطرف الأول)
  const [keyA, setKeyA] = useState<string>('');
  // Key B (Reference - الطرف الثاني)
  const [keyB, setKeyB] = useState<string>('');

  // Search input queries
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');

  // Dropdown open states
  const [isOpenA, setIsOpenA] = useState(false);
  const [isOpenB, setIsOpenB] = useState(false);

  // Copy toast state & voice read state
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isSpeakingKinship, setIsSpeakingKinship] = useState(false);

  // Active perspective tab: 'all' | 'paternal' | 'maternal' | 'inlaw'
  const [activePerspective, setActivePerspective] = useState<'all' | 'paternal' | 'maternal' | 'inlaw'>('all');

  const containerRefA = useRef<HTMLDivElement>(null);
  const containerRefB = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
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

  // Autocomplete results for Party 1
  const resultsA = useMemo(() => {
    if (!queryA.trim()) return [];
    return searchFamilyMembers(queryA, registry.people, 40);
  }, [queryA, registry]);

  // Autocomplete results for Party 2
  const resultsB = useMemo(() => {
    if (!queryB.trim()) return [];
    return searchFamilyMembers(queryB, registry.people, 40);
  }, [queryB, registry]);

  // Compute Kinship
  const kinshipResult: KinshipResult | null = useMemo(() => {
    if (!keyA || !keyB) return null;
    return analyzeKinship(keyA, keyB, registry.people);
  }, [keyA, keyB, registry]);

  const personA = keyA ? registry.people.get(keyA) : null;
  const personB = keyB ? registry.people.get(keyB) : null;

  // Swap parties
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

  const handleNavigate = (key: string) => {
    if (onSelectPerson) {
      onSelectPerson(key, { reveal: true, center: true });
    }
    if (onSwitchToTree) {
      onSwitchToTree(key);
    }
  };

  const handleCopyKinshipSummary = () => {
    if (!kinshipResult || !personA || !personB) return;
    let text = `صلة النسب والقرابة: «${personA.name}» هو «${kinshipResult.relationshipTitle}» لـ «${personB.name}».\n`;
    text += `• النسب من جهة الأب (العصبة): ${kinshipResult.narrativeExplanation} (الجد المشترك: ${kinshipResult.commonAncestor?.name || 'غير محدد'}).\n`;
    if (kinshipResult.maternalKinship.hasMaternalRelation) {
      text += `• النسب من جهة الأم (الأخوال): ${kinshipResult.maternalKinship.maternalExplanation}\n`;
    }
    if (kinshipResult.inLawKinship.hasInLawRelation) {
      text += `• صلة المصاهرة ونسب الزوجة: ${kinshipResult.inLawKinship.spousalExplanation || kinshipResult.inLawKinship.spousalTitle}\n`;
    }
    text += `(شجرة عائلة الفردان الكرزكاني)`;

    try {
      navigator.clipboard.writeText(text);
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
    let spoken = `صلة النسب والقرابة: ${personA.name} هو ${kinshipResult.relationshipTitle} لـ ${personB.name}. ${kinshipResult.narrativeExplanation}`;
    if (kinshipResult.maternalKinship.hasMaternalRelation) {
      spoken += ` ومن جهة الأم والأخوال: ${kinshipResult.maternalKinship.maternalExplanation}`;
    }
    if (kinshipResult.inLawKinship.hasInLawRelation) {
      spoken += ` ومن جهة المصاهرة: ${kinshipResult.inLawKinship.spousalExplanation || kinshipResult.inLawKinship.spousalTitle}.`;
    }

    const utterance = new SpeechSynthesisUtterance(spoken.replace(/[«»"•]/g, ' '));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.96;
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

  // Quick preset suggestions
  const handlePreset = (aKey: string, bKey: string) => {
    setKeyA(aKey);
    setKeyB(bKey);
    setQueryA('');
    setQueryB('');
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
          {/* Party 1 (الطرف الأول: الشخص المراد معرفة نسبه) */}
          <div className="lg:col-span-5 space-y-2" ref={containerRefA}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
                <span>الطرف الأول (المراد معرفة نسبه):</span>
              </label>
              {personA && (
                <button
                  onClick={() => {
                    setKeyA('');
                    setQueryA('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {personA ? (
              // Selected Person A Card
              <div className="p-3.5 bg-emerald-50/70 border-2 border-emerald-600/40 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden">
                    <MemberAvatar
                      src={personA.photo}
                      personKey={personA.key}
                      name={personA.name}
                      gender={personA.gender}
                      imgClassName="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold font-['Alexandria'] text-emerald-950 truncate">
                      {personA.name}
                    </h4>
                    <p className="text-xs font-semibold text-emerald-900 truncate mt-0.5">
                      {getQuadLineageName(personA.key, registry.people, 4)}
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      الجيل {personA.generation} · {personA.branchName || 'فرع العائلة'}
                    </p>
                    {personA.mother && (
                      <p className="text-[10px] text-rose-800 truncate mt-0.5">
                        الوالدة: {personA.mother.name} ({personA.mother.isFromFamily ? 'آل فردان' : personA.mother.familyOrigin || 'خارج العائلة'})
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setKeyA('');
                    setQueryA('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  تغيير
                </button>
              </div>
            ) : (
              // Search Input A
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
                    placeholder="ابحث بالاسم أو الأحرف الأولى للطرف الأول..."
                    className="w-full pr-10 pl-8 py-2.5 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
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

                {/* Dropdown A */}
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
                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
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

          {/* Swap Button (التبديل بين الطرفين) */}
          <div className="lg:col-span-1 flex items-center justify-center pt-2 lg:pt-5">
            <button
              onClick={handleSwap}
              disabled={!keyA && !keyB}
              className="p-3 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 disabled:opacity-40 disabled:pointer-events-none rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 group"
              title="تبديل الطرفين"
            >
              <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              <span className="lg:hidden text-xs font-bold">تبديل الطرفين</span>
            </button>
          </div>

          {/* Party 2 (الطرف الثاني: الشخص المقارن به) */}
          <div className="lg:col-span-5 space-y-2" ref={containerRefB}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>الطرف الثاني (المقارن به):</span>
              </label>
              {personB && (
                <button
                  onClick={() => {
                    setKeyB('');
                    setQueryB('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {personB ? (
              // Selected Person B Card
              <div className="p-3.5 bg-amber-50/70 border-2 border-amber-600/40 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden">
                    <MemberAvatar
                      src={personB.photo}
                      personKey={personB.key}
                      name={personB.name}
                      gender={personB.gender}
                      imgClassName="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold font-['Alexandria'] text-amber-950 truncate">
                      {personB.name}
                    </h4>
                    <p className="text-xs font-semibold text-amber-950 truncate mt-0.5">
                      {getQuadLineageName(personB.key, registry.people, 4)}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      الجيل {personB.generation} · {personB.branchName || 'فرع العائلة'}
                    </p>
                    {personB.mother && (
                      <p className="text-[10px] text-rose-800 truncate mt-0.5">
                        الوالدة: {personB.mother.name} ({personB.mother.isFromFamily ? 'آل فردان' : personB.mother.familyOrigin || 'خارج العائلة'})
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setKeyB('');
                    setQueryB('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                >
                  تغيير
                </button>
              </div>
            ) : (
              // Search Input B
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
                    placeholder="ابحث بالاسم أو الأحرف الأولى للطرف الثاني..."
                    className="w-full pr-10 pl-8 py-2.5 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
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

                {/* Dropdown B */}
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
                                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 truncate">
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

      {/* Results Area (النتيجة في خانة أسفل تشرح نسبه) */}
      <div className="p-5 sm:p-7">
        {!personA || !personB ? (
          // Empty Prompt
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-2xl mx-auto flex items-center justify-center">
              <GitMerge className="w-7 h-7 text-emerald-700" />
            </div>
            <h4 className="text-base font-bold font-['Alexandria'] text-slate-800">
              يرجى اختيار الشخصين أعلاه لعرض نتيجة التحليل
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              اختر اسماً في الخانة الأولى (المراد معرفة نسبه) واسماً في الخانة الثانية لمعرفة درجة القرابة وتفاصيل عمود النسب من جهة الأب، ونسب الأم، وصلة المصاهرة.
            </p>
          </div>
        ) : kinshipResult ? (
          // Full Detailed Kinship Report
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Headline Card (Comprehensive Kinship Verdict) */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 border-2 border-emerald-600/40 rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-800 text-white rounded-full text-xs font-bold shadow-2xs">
                      خلاصة صلة القرابة الشاملة
                    </span>
                    {kinshipResult.isSameBranch ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[11px] font-semibold">
                        من نفس الفرع الأبوي ({kinshipResult.branchNameA})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-semibold">
                        فرعان أبويان مختلفان
                      </span>
                    )}
                    {kinshipResult.maternalKinship.hasMaternalRelation && (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-900 rounded-full text-[11px] font-semibold flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                        <span>قرابة أرحام (أخوال)</span>
                      </span>
                    )}
                    {kinshipResult.inLawKinship.hasInLawRelation && (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>صلة مصاهرة</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black font-['Alexandria'] text-slate-900 leading-tight">
                    <span className="text-emerald-800 font-bold">{personA.name}</span>
                    <span className="text-slate-500 font-normal text-base sm:text-lg mx-2">هو</span>
                    <span className="text-amber-700 underline decoration-amber-400 decoration-2 underline-offset-4">
                      {kinshipResult.relationshipTitle}
                    </span>
                    <span className="text-slate-500 font-normal text-base sm:text-lg mx-2">لـ</span>
                    <span className="text-emerald-800 font-bold">{personB.name}</span>
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pt-1">
                    {kinshipResult.narrativeExplanation}
                  </p>
                </div>

                {/* Listen & Copy Summary Buttons */}
                <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSpeakKinshipSummary}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer ${
                      isSpeakingKinship
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                    title="استماع لتقرير صلة القرابة بالصوت العربي الفصيح"
                  >
                    {isSpeakingKinship ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>إيقاف الصوت</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>استماع بالصوت 🔊</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyKinshipSummary}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="نسخ تقرير صلة القرابة الكامل"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>نسخ الخلاصة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tabs between Perspectives */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActivePerspective('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePerspective === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>عرض شامل لكل الجهات</span>
              </button>

              <button
                onClick={() => setActivePerspective('paternal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePerspective === 'paternal'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>النسب من جهة الأب (العصبة)</span>
              </button>

              <button
                onClick={() => setActivePerspective('maternal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePerspective === 'maternal'
                    ? 'bg-rose-800 text-white shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>النسب من جهة الأم (الأخوال)</span>
                {kinshipResult.maternalKinship.hasMaternalRelation && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              <button
                onClick={() => setActivePerspective('inlaw')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePerspective === 'inlaw'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>صلة المصاهرة ونسب الزوجة</span>
                {kinshipResult.inLawKinship.hasInLawRelation && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 1. PATERNAL KINSHIP SECTION (النسب من جهة الأب) */}
            {/* ========================================================================= */}
            {(activePerspective === 'all' || activePerspective === 'paternal') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-r-4 border-emerald-800 pr-3">
                  <Users className="w-5 h-5 text-emerald-800" />
                  <h4 className="text-base font-extrabold font-['Alexandria'] text-slate-900">
                    أولاً: النسب من جهة الأب (العصبة والعمومة)
                  </h4>
                </div>

                {/* Common Ancestor Highlight Card */}
                {kinshipResult.commonAncestor && (
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-amber-950" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                          الجد الأبوي المشترك الأقرب (نقطة التقاء النسب)
                        </span>
                        <h4 className="text-base font-bold font-['Alexandria'] text-slate-900 mt-0.5">
                          {kinshipResult.commonAncestor.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          الجيل {kinshipResult.commonAncestor.generation} · يلتقي عنده عمود نسب الآباء للطرفين
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigate(kinshipResult.commonAncestor!.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>عرض الجد في الشجرة</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Visual Lineage Chain (عمود النسب الصاعد والهابط) */}
                {kinshipResult.fullLineageChain.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <GitMerge className="w-4 h-4 text-emerald-700" />
                        <span>مسار عمود النسب الأبوي التتابعي بين الطرفين</span>
                      </h5>
                      <span className="text-[11px] text-slate-400">
                        اضغط على أي اسم للانتقال إليه
                      </span>
                    </div>

                    {/* Horizontal Flow Chart */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-x-auto touch-pan-y overscroll-x-contain">
                      <div className="flex items-center gap-2 min-w-max py-2 px-1">
                        {/* Node A */}
                        <button
                          onClick={() => handleNavigate(personA.key)}
                          className="p-3 bg-emerald-800 text-white rounded-2xl text-right shadow-sm hover:bg-emerald-900 transition-all cursor-pointer flex items-center gap-2.5"
                        >
                          <div>
                            <span className="text-[9px] block text-emerald-200 font-bold">الطرف الأول</span>
                            <span className="text-xs font-bold font-['Alexandria']">{personA.name}</span>
                            <span className="text-[10px] block text-emerald-300">الجيل {personA.generation}</span>
                          </div>
                        </button>

                        {/* Upward chain to LCA */}
                        {kinshipResult.pathFromAToAncestor.slice(1, -1).map((ancestor, i) => (
                          <React.Fragment key={`pathA-${ancestor.key}-${i}`}>
                            <span className="text-emerald-700 font-bold text-sm px-1">⟵</span>
                            <button
                              onClick={() => handleNavigate(ancestor.key)}
                              className="p-2.5 bg-white border border-emerald-300/80 hover:border-emerald-500 text-slate-800 rounded-xl text-right shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            >
                              <span className="text-[9px] block text-slate-400">والد</span>
                              <span className="text-xs font-bold">{ancestor.name}</span>
                            </button>
                          </React.Fragment>
                        ))}

                        {/* Lowest Common Ancestor (Centered / Highlighted) */}
                        {kinshipResult.commonAncestor && kinshipResult.personA.key !== kinshipResult.commonAncestor.key && kinshipResult.personB.key !== kinshipResult.commonAncestor.key && (
                          <>
                            <span className="text-amber-600 font-bold text-base px-1">⟵</span>
                            <button
                              onClick={() => handleNavigate(kinshipResult.commonAncestor!.key)}
                              className="p-3.5 bg-amber-500 text-slate-950 font-bold rounded-2xl text-right shadow-md hover:bg-amber-400 transition-all cursor-pointer border-2 border-amber-600"
                            >
                              <span className="text-[9px] block text-amber-950/80 font-bold">الجد المشترك</span>
                              <span className="text-xs font-extrabold font-['Alexandria']">{kinshipResult.commonAncestor.name}</span>
                              <span className="text-[10px] block text-amber-950/70">الجيل {kinshipResult.commonAncestor.generation}</span>
                            </button>
                            <span className="text-amber-600 font-bold text-base px-1">⟶</span>
                          </>
                        )}

                        {/* Downward chain from LCA to B */}
                        {kinshipResult.pathFromBToAncestor.slice(1, -1).reverse().map((ancestor, i) => (
                          <React.Fragment key={`pathB-${ancestor.key}-${i}`}>
                            <button
                              onClick={() => handleNavigate(ancestor.key)}
                              className="p-2.5 bg-white border border-amber-300/80 hover:border-amber-500 text-slate-800 rounded-xl text-right shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            >
                              <span className="text-[9px] block text-slate-400">سلف</span>
                              <span className="text-xs font-bold">{ancestor.name}</span>
                            </button>
                            <span className="text-amber-700 font-bold text-sm px-1">⟶</span>
                          </React.Fragment>
                        ))}

                        {/* Node B */}
                        <button
                          onClick={() => handleNavigate(personB.key)}
                          className="p-3 bg-amber-700 text-white rounded-2xl text-right shadow-sm hover:bg-amber-800 transition-all cursor-pointer flex items-center gap-2.5"
                        >
                          <div>
                            <span className="text-[9px] block text-amber-200 font-bold">الطرف الثاني</span>
                            <span className="text-xs font-bold font-['Alexandria']">{personB.name}</span>
                            <span className="text-[10px] block text-amber-300">الجيل {personB.generation}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Paternal Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] text-slate-500 block font-medium">فارق الأجيال</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {kinshipResult.generationDiff === 0
                        ? 'في نفس الجيل (أقران)'
                        : kinshipResult.generationDiff > 0
                        ? `الطرف الأول أصغر بـ ${kinshipResult.generationDiff} ${kinshipResult.generationDiff === 1 ? 'جيل' : 'أجيال'}`
                        : `الطرف الأول أكبر بـ ${Math.abs(kinshipResult.generationDiff)} ${Math.abs(kinshipResult.generationDiff) === 1 ? 'جيل' : 'أجيال'}`}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] text-slate-500 block font-medium">خط النسب الأبوي والفرع</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {kinshipResult.isSameBranch
                        ? `كلاهما من ${kinshipResult.branchNameA}`
                        : `${kinshipResult.branchNameA} ↔ ${kinshipResult.branchNameB}`}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] text-slate-500 block font-medium">المسافة إلى الجد الأبوي</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {kinshipResult.distanceA >= 0
                        ? `${kinshipResult.distanceA} أجيال (أ) · ${kinshipResult.distanceB} أجيال (ب)`
                        : 'لا يوجد'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. MATERNAL KINSHIP SECTION (النسب من جهة الأم) */}
            {/* ========================================================================= */}
            {(activePerspective === 'all' || activePerspective === 'maternal') && (
              <div className="space-y-4 pt-4 border-t border-slate-200/90">
                <div className="flex items-center gap-2 border-r-4 border-rose-600 pr-3">
                  <Heart className="w-5 h-5 text-rose-600 fill-rose-100" />
                  <h4 className="text-base font-extrabold font-['Alexandria'] text-slate-900">
                    ثانياً: النسب من جهة الأم (الأخوال والأرحام)
                  </h4>
                </div>

                {/* Mothers comparison cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Mother A Card */}
                  <div className="p-4 bg-rose-50/50 border border-rose-200/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                        <span>والدة الطرف الأول:</span>
                        <span className="font-extrabold text-slate-900">{personA.name}</span>
                      </span>
                      {kinshipResult.maternalKinship.personAMother?.isFromFamily ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-bold">
                          من آل فردان
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {kinshipResult.maternalKinship.personAMother?.familyOrigin || 'خارج العائلة'}
                        </span>
                      )}
                    </div>

                    {kinshipResult.maternalKinship.personAMother ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold font-['Alexandria'] text-slate-900">
                            {kinshipResult.maternalKinship.personAMother.name}
                          </h5>
                          {kinshipResult.maternalKinship.motherPersonA && (
                            <button
                              onClick={() => handleNavigate(kinshipResult.maternalKinship.motherPersonA!.key)}
                              className="text-xs text-rose-700 hover:text-rose-950 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                              title="عرض بطاقة الوالدة في الشجرة"
                            >
                              <span>(عرض في الشجرة)</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {kinshipResult.maternalKinship.motherPersonA?.parentKey && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            الجد لأم: «{registry.people.get(kinshipResult.maternalKinship.motherPersonA.parentKey)?.name}»
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        لم يتم توثيق اسم الوالدة في بطاقة الفرد بعد.
                      </p>
                    )}
                  </div>

                  {/* Mother B Card */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                        <span>والدة الطرف الثاني:</span>
                        <span className="font-extrabold text-slate-900">{personB.name}</span>
                      </span>
                      {kinshipResult.maternalKinship.personBMother?.isFromFamily ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-bold">
                          من آل فردان
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {kinshipResult.maternalKinship.personBMother?.familyOrigin || 'خارج العائلة'}
                        </span>
                      )}
                    </div>

                    {kinshipResult.maternalKinship.personBMother ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold font-['Alexandria'] text-slate-900">
                            {kinshipResult.maternalKinship.personBMother.name}
                          </h5>
                          {kinshipResult.maternalKinship.motherPersonB && (
                            <button
                              onClick={() => handleNavigate(kinshipResult.maternalKinship.motherPersonB!.key)}
                              className="text-xs text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                              title="عرض بطاقة الوالدة في الشجرة"
                            >
                              <span>(عرض في الشجرة)</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {kinshipResult.maternalKinship.motherPersonB?.parentKey && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            الجد لأم: «{registry.people.get(kinshipResult.maternalKinship.motherPersonB.parentKey)?.name}»
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        لم يتم توثيق اسم الوالدة في بطاقة الفرد بعد.
                      </p>
                    )}
                  </div>
                </div>

                {/* Maternal Kinship Result Analysis */}
                {kinshipResult.maternalKinship.hasMaternalRelation ? (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 border-2 border-rose-300 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="px-2.5 py-0.5 bg-rose-700 text-white rounded-full text-[11px] font-bold">
                          صلة القرابة من جهة الأم
                        </span>
                        <h4 className="text-base font-bold font-['Alexandria'] text-rose-950 pt-1">
                          {kinshipResult.maternalKinship.maternalTitle}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                          {kinshipResult.maternalKinship.maternalExplanation}
                        </p>
                      </div>

                      {kinshipResult.maternalKinship.maternalCommonAncestor && (
                        <button
                          onClick={() => handleNavigate(kinshipResult.maternalKinship.maternalCommonAncestor!.key)}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                        >
                          <span>عرض الجد لأم</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">
                        تحليل النسب من جهة الأمهات:
                      </p>
                      <p className="mt-0.5">
                        {kinshipResult.maternalKinship.personAMother && kinshipResult.maternalKinship.personBMother
                          ? `لم يُرصد التقاء مباشر لعمود نسب والدة «${personA.name}» مع والدة «${personB.name}» في المشجر، والارتباط الثابت بينهما هو النسب والعمومة الأبوية المبينة أعلاه.`
                          : 'يمكن توثيق أسماء الأمهات عبر بطاقة كل فرد (خانة تعديل الوالدة) ليقوم النظام تلقائياً بربط وتحليل صلة الأخوال والأرحام بدقة.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. IN-LAW & SPOUSAL SECTION (المصاهرة ونسب الزوجة) */}
            {/* ========================================================================= */}
            {(activePerspective === 'all' || activePerspective === 'inlaw') && (
              <div className="space-y-4 pt-4 border-t border-slate-200/90">
                <div className="flex items-center gap-2 border-r-4 border-amber-600 pr-3">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h4 className="text-base font-extrabold font-['Alexandria'] text-slate-900">
                    ثالثاً: صلة المصاهرة ونسب الزوجة (الأصهار والعدلاء)
                  </h4>
                </div>

                {/* In-Law Result Box if relation exists */}
                {kinshipResult.inLawKinship.hasInLawRelation ? (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border-2 border-amber-300 rounded-2xl shadow-xs space-y-3">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 bg-amber-700 text-white rounded-full text-[11px] font-bold">
                        صلة المصاهرة المباشرة
                      </span>
                      <h4 className="text-base font-bold font-['Alexandria'] text-amber-950 pt-1">
                        {kinshipResult.inLawKinship.spousalTitle}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {kinshipResult.inLawKinship.spousalExplanation}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Spouses List for Party 1 & Party 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Party 1 Spouses */}
                  <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      زوجات الطرف الأول ({personA.name}):
                    </span>
                    {(personA.spouses || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        لم يتم تسجيل زوجات في بطاقة الفرد.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {personA.spouses!.map(sp => {
                          const wPerson = sp.personKey ? registry.people.get(sp.personKey) : null;
                          return (
                            <div
                              key={`kin-spA-${sp.id}`}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {wPerson ? (
                                    <button
                                      onClick={() => handleNavigate(wPerson.key)}
                                      className="font-bold text-xs text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>{sp.name}</span>
                                      <ExternalLink className="w-3 h-3 text-emerald-600" />
                                    </button>
                                  ) : (
                                    <span className="font-bold text-xs text-slate-900">{sp.name}</span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200">
                                    {sp.isFromFamily ? 'آل فردان' : sp.familyOrigin || 'خارج العائلة'}
                                  </span>
                                </div>
                                {wPerson?.parentKey && (
                                  <p className="text-[10px] text-slate-500">
                                    ابنة «{registry.people.get(wPerson.parentKey)?.name}»
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Party 2 Spouses */}
                  <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      زوجات الطرف الثاني ({personB.name}):
                    </span>
                    {(personB.spouses || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        لم يتم تسجيل زوجات في بطاقة الفرد.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {personB.spouses!.map(sp => {
                          const wPerson = sp.personKey ? registry.people.get(sp.personKey) : null;
                          return (
                            <div
                              key={`kin-spB-${sp.id}`}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {wPerson ? (
                                    <button
                                      onClick={() => handleNavigate(wPerson.key)}
                                      className="font-bold text-xs text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>{sp.name}</span>
                                      <ExternalLink className="w-3 h-3 text-amber-600" />
                                    </button>
                                  ) : (
                                    <span className="font-bold text-xs text-slate-900">{sp.name}</span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-900 font-semibold border border-amber-200">
                                    {sp.isFromFamily ? 'آل فردان' : sp.familyOrigin || 'خارج العائلة'}
                                  </span>
                                </div>
                                {wPerson?.parentKey && (
                                  <p className="text-[10px] text-slate-500">
                                    ابنة «{registry.people.get(wPerson.parentKey)?.name}»
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {!kinshipResult.inLawKinship.hasInLawRelation && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                    لا توجد صلة مصاهرة أو زوجية مسجلة تربط الطرفين بصورة مباشرة في القيود الحالية.
                  </div>
                )}
              </div>
            )}

            {/* Bottom Direct Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleNavigate(personA.key)}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  الانتقال إلى {personA.name} في الشجرة
                </button>
                <button
                  onClick={() => handleNavigate(personB.key)}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  الانتقال إلى {personB.name} في الشجرة
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
                <span>معرفة نسبة {personB.name} إلى {personA.name} (تبديل ⇄)</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
