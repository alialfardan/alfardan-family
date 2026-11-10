import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { searchFamilyMembers, getQuadLineageName, getArabicInitial, BRANCH_COLORS } from '../data/treeManager';
import {
  askGenealogyAdvisor,
  buildPersonDeepProfile,
  formatDeepProfileResponse,
  AdvisorResponse
} from '../data/voiceGenealogyAdvisor';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Search,
  UserPlus,
  X,
  Copy,
  Check,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

interface SmartVoiceAdvisorProps {
  registry: FamilyTreeProcessed;
  onSelectPerson?: (key: string) => void;
  onSwitchToTree?: (key?: string) => void;
  isPrivacyRestricted?: boolean;
}

const MAX_LISTEN_SECONDS = 30;

export const SmartVoiceAdvisor: React.FC<SmartVoiceAdvisorProps> = ({
  registry,
  onSelectPerson,
  onSwitchToTree,
  isPrivacyRestricted = false
}) => {
  const [question, setQuestion] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(MAX_LISTEN_SECONDS);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

  // Optional quick person selectors to assist or disambiguate names
  const [showQuickPicker, setShowQuickPicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [selectedPersonA, setSelectedPersonA] = useState<ProcessedPerson | null>(null);
  const [selectedPersonB, setSelectedPersonB] = useState<ProcessedPerson | null>(null);

  // Advisor Answer State
  const [response, setResponse] = useState<AdvisorResponse | null>(null);

  // Continuous 30-second SpeechRecognition refs
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const listenSessionStartRef = useRef<number>(0);
  const maxListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedFinalRef = useRef<string>('');
  const latestInterimRef = useRef<string>('');

  // Clear all timers and stop recognition safely
  const cleanupRecognitionTimers = () => {
    if (maxListenTimerRef.current) {
      clearTimeout(maxListenTimerRef.current);
      maxListenTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Clean up SpeechRecognition and SpeechSynthesis on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      cleanupRecognitionTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Preload voices on mount for mobile/desktop browsers
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Speak text in fluent Arabic using browser SpeechSynthesis
  const speakArabicText = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('متصفحك الحالي لا يدعم ميزة القراءة الصوتية (SpeechSynthesis).');
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const cleanText = textToSpeak
        .replace(/[«»"•*—]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.96;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const arabicVoice =
        voices.find(
          v =>
            v.lang.toLowerCase().startsWith('ar') &&
            (v.name.includes('Majed') ||
              v.name.includes('Tarik') ||
              v.name.includes('Maged') ||
              v.name.includes('Hoda') ||
              v.name.includes('Natural') ||
              v.name.includes('Google'))
        ) || voices.find(v => v.lang.toLowerCase().startsWith('ar'));

      if (arabicVoice) {
        utterance.voice = arabicVoice;
        utterance.lang = arabicVoice.lang;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Stop listening cleanly and optionally submit the captured transcript
  const stopListeningSession = (autoSubmit: boolean = true) => {
    shouldKeepListeningRef.current = false;
    cleanupRecognitionTimers();
    setIsListening(false);
    setRemainingSeconds(MAX_LISTEN_SECONDS);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const fullCapturedText = `${accumulatedFinalRef.current} ${latestInterimRef.current}`
      .replace(/\s+/g, ' ')
      .trim();

    if (fullCapturedText) {
      setQuestion(fullCapturedText);
      if (autoSubmit) {
        handleRunQuery(fullCapturedText, undefined, undefined, false);
      }
    }
  };

  // Run the genealogical query
  const handleRunQuery = (
    customQuery?: string,
    pAKey?: string,
    pBKey?: string,
    stopMicFirst: boolean = true
  ) => {
    if (stopMicFirst && shouldKeepListeningRef.current) {
      shouldKeepListeningRef.current = false;
      cleanupRecognitionTimers();
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }

    setSpeechError(null);
    stopSpeaking();

    const qToUse = customQuery !== undefined ? customQuery : question;
    const keyA = pAKey !== undefined ? pAKey : selectedPersonA?.key;
    const keyB = pBKey !== undefined ? pBKey : selectedPersonB?.key;

    if (!qToUse.trim() && !keyA) {
      setSpeechError('يرجى كتابة سؤالك أو التحدث عبر المايكروفون أو اختيار اسم الفرد أولاً.');
      return;
    }

    const result = askGenealogyAdvisor(qToUse, registry, keyA, keyB, isPrivacyRestricted);
    setResponse(result);

    if (autoSpeak && result.spokenText) {
      setTimeout(() => {
        speakArabicText(result.spokenText);
      }, 150);
    }
  };

  // Start / Stop Continuous 30-Second Microphone Voice Recognition (Web Speech API)
  const toggleVoiceRecognition = () => {
    setSpeechError(null);

    if (isListening || shouldKeepListeningRef.current) {
      stopListeningSession(true);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechError(
        'متصفحك الحالي لا يدعم الإدخال الصوتي المباشر (Web Speech API). يمكنك استخدام متصفح Chrome أو Safari أو كتابة سؤالك نصياً.'
      );
      return;
    }

    try {
      stopSpeaking();
      cleanupRecognitionTimers();

      // Seed accumulated transcript with any text already in the input box if user is continuing
      accumulatedFinalRef.current = '';
      latestInterimRef.current = '';
      shouldKeepListeningRef.current = true;
      listenSessionStartRef.current = Date.now();
      setRemainingSeconds(MAX_LISTEN_SECONDS);
      setIsListening(true);

      const createAndStartRecognition = () => {
        if (!shouldKeepListeningRef.current) return;

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'ar-BH'; // Arabic (Bahrain / Gulf & Classical Arabic)
        recognition.continuous = true; // Keep listening across pauses
        recognition.interimResults = true; // Live real-time word-by-word transcription
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (shouldKeepListeningRef.current) {
            setIsListening(true);
            setSpeechError(null);
          }
        };

        recognition.onresult = (event: any) => {
          let sessionFinalChunk = '';
          let sessionInterimChunk = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              sessionFinalChunk += ' ' + transcriptPiece;
            } else {
              sessionInterimChunk += transcriptPiece;
            }
          }

          if (sessionFinalChunk.trim()) {
            accumulatedFinalRef.current = `${accumulatedFinalRef.current} ${sessionFinalChunk}`
              .replace(/\s+/g, ' ')
              .trim();
          }
          latestInterimRef.current = sessionInterimChunk.trim();

          const liveDisplay = `${accumulatedFinalRef.current} ${latestInterimRef.current}`
            .replace(/\s+/g, ' ')
            .trim();

          if (liveDisplay) {
            setQuestion(liveDisplay);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            shouldKeepListeningRef.current = false;
            cleanupRecognitionTimers();
            setIsListening(false);
            setSpeechError('يرجى السماح للمتصفح باستخدام المايكروفون لتفعيل البحث الصوتي.');
          } else if (event.error === 'audio-capture') {
            shouldKeepListeningRef.current = false;
            cleanupRecognitionTimers();
            setIsListening(false);
            setSpeechError('لم يتم العثور على مايكروفون متصل بالجهاز.');
          }
          // Ignore 'no-speech' or transient network pauses during the 30-second window so it keeps listening seamlessly
        };

        recognition.onend = () => {
          const elapsedMs = Date.now() - listenSessionStartRef.current;
          // If the browser closed recognition during a brief silence before 30 seconds are up, restart immediately!
          if (shouldKeepListeningRef.current && elapsedMs < MAX_LISTEN_SECONDS * 1000) {
            try {
              setTimeout(() => {
                if (shouldKeepListeningRef.current) {
                  createAndStartRecognition();
                }
              }, 120);
              return;
            } catch (_) {}
          }

          // Otherwise, finalize the 30-second listening session
          if (shouldKeepListeningRef.current) {
            stopListeningSession(true);
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (_) {}
      };

      createAndStartRecognition();

      // Countdown interval (updates every second)
      countdownIntervalRef.current = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - listenSessionStartRef.current) / 1000);
        const left = Math.max(0, MAX_LISTEN_SECONDS - elapsedSec);
        setRemainingSeconds(left);
        if (left <= 0) {
          stopListeningSession(true);
        }
      }, 500);

      // Hard 30-second max timer
      maxListenTimerRef.current = setTimeout(() => {
        if (shouldKeepListeningRef.current) {
          stopListeningSession(true);
        }
      }, MAX_LISTEN_SECONDS * 1000);
    } catch (err) {
      shouldKeepListeningRef.current = false;
      cleanupRecognitionTimers();
      setIsListening(false);
      setSpeechError('تعذر تشغيل المايكروفون في هذا المتصفح.');
    }
  };

  // Switch analysis to one of the alternative candidate individuals
  const handleSelectAlternativePerson = (person: ProcessedPerson) => {
    stopSpeaking();
    const profile = buildPersonDeepProfile(person.key, registry.people);
    if (profile) {
      const updated = formatDeepProfileResponse(
        `تحليل نسب وقرابات ${getQuadLineageName(person.key, registry.people, 4)}`,
        profile,
        registry.people,
        response?.alternativeCandidates?.filter(c => c.key !== person.key) || [],
        isPrivacyRestricted
      );
      setResponse(updated);
      if (autoSpeak) {
        speakArabicText(updated.spokenText);
      }
    }
  };

  // Autocomplete results for the helper person picker
  const pickerResults = useMemo(() => {
    if (!pickerSearch.trim()) return [];
    return searchFamilyMembers(pickerSearch, registry.people, 12, { excludeFemales: isPrivacyRestricted });
  }, [pickerSearch, registry.people, isPrivacyRestricted]);

  const handleCopyResponse = () => {
    if (!response) return;
    const text = [
      `🎙️ ${response.title}`,
      ...response.sections.map(s => `\n${s.heading}:\n${s.content}`),
      `\n(المستشار الذكي للأنساب - شجرة عائلة الفردان الكرزكاني)`
    ].join('\n');
    try {
      navigator.clipboard.writeText(text);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2400);
    } catch (_) {}
  };

  const presetQuestions = [
    {
      label: 'ما صلة القرابة بين محمد بن الفردان و حسين بن الفردان؟',
      query: 'ما صلة القرابة بين محمد بن الفردان و حسين بن الفردان؟',
      keyA: 'o4',
      keyB: 'o15'
    },
    {
      label: 'ما صلة القرابة بين محمد بن الفردان و عبدالله بن فردان؟',
      query: 'ما صلة القرابة بين محمد بن الفردان و عبدالله بن فردان؟',
      keyA: 'o4',
      keyB: 'o13'
    },
    {
      label: 'ما هو نسب وأعمام وأخوال وجدات محفوظ بن محسن؟',
      query: 'ما هو نسب وأعمام وأخوال وجدات محفوظ بن محسن؟',
      keyA: 'o17',
      keyB: undefined
    },
    {
      label: 'تتبع الأصول والتفرعات من الجد الأكبر الشيخ علي',
      query: 'حدثني عن أصول وفروع شجرة عائلة الفردان من الجد الأكبر الشيخ علي',
      keyA: undefined,
      keyB: undefined
    }
  ];

  const toneStyles: Record<string, { bg: string; border: string; title: string; badgeBg: string; badgeText: string }> = {
    emerald: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      title: 'text-emerald-950',
      badgeBg: 'bg-emerald-800',
      badgeText: 'text-white'
    },
    rose: {
      bg: 'bg-rose-50/60',
      border: 'border-rose-200',
      title: 'text-rose-950',
      badgeBg: 'bg-rose-700',
      badgeText: 'text-white'
    },
    amber: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      title: 'text-amber-950',
      badgeBg: 'bg-amber-700',
      badgeText: 'text-white'
    },
    indigo: {
      bg: 'bg-indigo-50/60',
      border: 'border-indigo-200',
      title: 'text-indigo-950',
      badgeBg: 'bg-indigo-700',
      badgeText: 'text-white'
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      title: 'text-slate-900',
      badgeBg: 'bg-slate-700',
      badgeText: 'text-white'
    }
  };

  return (
    <section
      id="smart-voice-advisor-section"
      aria-label="المستشار الصوتي الذكي للأنساب"
      className="bg-white rounded-3xl border-2 border-amber-500/40 shadow-xl overflow-hidden font-['Readex_Pro',sans-serif] transition-all"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-44 h-44 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-300 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>المستشار الصوتي الذكي للأنساب 🎤🔊</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold font-['Alexandria'] text-white">
              اسأل بصوتك أو كتابةً عن الأنساب والجدات والأعمام والأخوال والمصاهرات
            </h3>

            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              يحلل المستشار الذكي قاعدة بيانات الشجرة الكاملة ({registry.stats.totalCount} اسماً) ليجيبك باللغة العربية الفصحى الواضحة مع استماع صوتي مستمر حتى 30 ثانية.
            </p>
          </div>

          {/* Auto-read toggle */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setAutoSpeak(prev => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                autoSpeak
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                  : 'bg-white/10 text-emerald-100 border-white/20 hover:bg-white/20'
              }`}
              title="تفعيل أو إيقاف القراءة الصوتية التلقائية فور ظهور الإجابة"
            >
              <Volume2 className="w-4 h-4" />
              <span>{autoSpeak ? 'القراءة التلقائية: مفعّلة' : 'تفعيل القراءة التلقائية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Input & Voice Controls */}
      <div className="p-5 sm:p-7 bg-gradient-to-b from-[#fcfdfa] to-white space-y-5">
        {/* Free-text Question Box + Microphone + Submit */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label
              htmlFor="voice-advisor-input"
              className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5"
            >
              <span>اطرح سؤالك بحرية أو اضغط على زر المايكروفون للتحدث (استماع مستمر حتى 30 ثانية):</span>
            </label>

            <button
              type="button"
              onClick={() => setShowQuickPicker(prev => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showQuickPicker ? 'إخفاء أداة اختيار الأسماء' : 'تحديد أسماء دقيقة من الشجرة (اختياري)'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                id="voice-advisor-input"
                type="text"
                value={question}
                onChange={e => {
                  setQuestion(e.target.value);
                  accumulatedFinalRef.current = e.target.value;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleRunQuery();
                  }
                }}
                placeholder="مثال: ما صلة القرابة بين فلان وفلان؟ أو: من هم أخوال وأعمام وجدات فلان؟"
                className={`w-full pr-4 pl-10 py-3.5 rounded-2xl border-2 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                  isListening
                    ? 'border-rose-500 bg-rose-50/40 ring-4 ring-rose-500/20 shadow-inner'
                    : 'border-slate-200 bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-600/15'
                }`}
              />
              {question && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestion('');
                    accumulatedFinalRef.current = '';
                    latestInterimRef.current = '';
                    setSpeechError(null);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                  title="مسح السؤال"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Microphone Button (Continuous 30s SpeechRecognition with Pulse Animation) */}
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`relative inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex-shrink-0 overflow-hidden ${
                isListening
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-lg shadow-rose-500/30 ring-4 ring-rose-500/40 animate-pulse'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-amber-300 shadow-sm'
              }`}
              title={
                isListening
                  ? 'النظام يستمع الآن... اضغط هنا عند الانتهاء من طرح سؤالك'
                  : 'البحث الصوتي المستمر باللغة العربية (حتى 30 ثانية)'
              }
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
                  </span>
                  <MicOff className="w-4 h-4 text-white" />
                  <span>يستمع الآن ({remainingSeconds}ث) · اضغط للإنهاء</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-amber-700" />
                  <span>تحدث بالصوت 🎤</span>
                </>
              )}
            </button>

            {/* Submit / Ask Button */}
            <button
              type="button"
              onClick={() => handleRunQuery()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-800 to-slate-900 hover:from-emerald-900 hover:to-black text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4 text-amber-300" />
              <span>طرح السؤال</span>
            </button>
          </div>

          {/* Active Continuous Listening Banner with Animated Pulse & Progress Bar */}
          {isListening && (
            <div className="p-3.5 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 rounded-2xl space-y-2.5 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-rose-900">
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                  </span>
                  <span>النظام يستمع الآن... تحدث براحتك (لا ينقطع عند التوقف القصير)</span>
                </div>

                {/* Animated Sound Wave Bars + Remaining Time */}
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-1 h-4" aria-hidden="true">
                    <span className="w-1 bg-rose-600 rounded-full h-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full h-4 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 bg-rose-600 rounded-full h-3 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full h-4 animate-bounce" style={{ animationDelay: '450ms' }} />
                    <span className="w-1 bg-rose-600 rounded-full h-2.5 animate-bounce" style={{ animationDelay: '600ms' }} />
                  </div>
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[11px] font-bold">
                    الوقت المتبقي: {remainingSeconds} ثانية
                  </span>
                </div>
              </div>

              {/* Progress Bar for 30s Listening Window */}
              <div className="w-full h-1.5 bg-rose-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-500"
                  style={{ width: `${Math.max(4, (remainingSeconds / MAX_LISTEN_SECONDS) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error / Info Notice */}
          {speechError && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900">
              <span>{speechError}</span>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Optional Quick Person Picker for 100% precision */}
        {showQuickPicker && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                اختر فرداً أو فردين من الشجرة لتحليل النسب أو صلة القرابة بدقة تامة:
              </span>
              {(selectedPersonA || selectedPersonB) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPersonA(null);
                    setSelectedPersonB(null);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  إعادة تعيين الاختيار
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedPersonA ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold">
                  <span>الطرف الأول: {getQuadLineageName(selectedPersonA.key, registry.people, 4)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPersonA(null)}
                    className="text-emerald-700 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">لم يتم تحديد الطرف الأول بعد</span>
              )}

              {selectedPersonB && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold">
                  <span>الطرف الثاني: {getQuadLineageName(selectedPersonB.key, registry.people, 4)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPersonB(null)}
                    className="text-amber-700 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="ابحث هنا عن اسم الفرد لإضافته كطرف أول أو طرف ثانٍ..."
                className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {pickerResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pt-1">
                {pickerResults.map(p => {
                  const quad = getQuadLineageName(p.key, registry.people, 4);
                  return (
                    <div
                      key={`voice-picker-${p.key}`}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="truncate pl-2">
                        <div className="font-bold text-slate-900 truncate">{quad}</div>
                        <div className="text-[10px] text-slate-500">
                          الجيل {p.generation} · {p.branchName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPersonA(p);
                            setPickerSearch('');
                            const nextQ = selectedPersonB
                              ? `ما صلة القرابة بين ${quad} و ${getQuadLineageName(selectedPersonB.key, registry.people, 4)}؟`
                              : `ما هو نسب وأعمام وأخوال وجدات ${quad}؟`;
                            setQuestion(nextQ);
                            handleRunQuery(nextQ, p.key, selectedPersonB?.key);
                          }}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          طرف ١
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPersonB(p);
                            setPickerSearch('');
                            if (selectedPersonA) {
                              const nextQ = `ما صلة القرابة بين ${getQuadLineageName(selectedPersonA.key, registry.people, 4)} و ${quad}؟`;
                              setQuestion(nextQ);
                              handleRunQuery(nextQ, selectedPersonA.key, p.key);
                            }
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          طرف ٢
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Example Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 ml-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>أسئلة مقترحة للتجربة:</span>
          </span>
          {presetQuestions.map((preset, idx) => (
            <button
              key={`preset-q-${idx}`}
              type="button"
              onClick={() => {
                setSelectedPersonA(preset.keyA ? registry.people.get(preset.keyA) || null : null);
                setSelectedPersonB(preset.keyB ? registry.people.get(preset.keyB) || null : null);
                setQuestion(preset.query);
                handleRunQuery(preset.query, preset.keyA, preset.keyB);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Answer Display Area */}
        {response && (
          <div className="mt-4 pt-5 border-t border-slate-200 space-y-4 animate-in fade-in">
            {/* Answer Header Bar with Prominent Listen (🔊) Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>إجابة المستشار الذكي للأنساب (بالعربية الفصحى)</span>
                </div>
                <h4 className="text-base sm:text-lg font-extrabold font-['Alexandria'] text-white">
                  {response.title}
                </h4>
              </div>

              {/* Audio Read Aloud & Copy Controls */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center flex-shrink-0">
                {isSpeaking ? (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer animate-pulse"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>إيقاف القراءة الصوتية</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => speakArabicText(response.spokenText)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>استماع للإجابة بالصوت 🔊</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="نسخ الإجابة الكاملة"
                >
                  {copiedAnswer ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Structured Classical Arabic Sections */}
            <div className="grid grid-cols-1 gap-3.5">
              {response.sections.map((sec, idx) => {
                const style = toneStyles[sec.tone || 'emerald'] || toneStyles.emerald;
                return (
                  <div
                    key={`advisor-sec-${idx}`}
                    className={`p-4 sm:p-5 rounded-2xl border ${style.bg} ${style.border} space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h5 className={`text-sm sm:text-base font-extrabold font-['Alexandria'] ${style.title}`}>
                        {sec.heading}
                      </h5>
                      {sec.badge && (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText}`}
                        >
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                      {sec.content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Links to view matched person(s) in the tree */}
            {(response.matchedPrimaryPerson || response.matchedSecondaryPerson) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-600">
                  الانتقال المباشر إلى بطاقة الفرد في المشجر:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {response.matchedPrimaryPerson && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectPerson) {
                          onSelectPerson(response.matchedPrimaryPerson!.key);
                        } else if (onSwitchToTree) {
                          onSwitchToTree(response.matchedPrimaryPerson!.key);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>فتح سجل «{response.matchedPrimaryPerson.name}»</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {response.matchedSecondaryPerson && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectPerson) {
                          onSelectPerson(response.matchedSecondaryPerson!.key);
                        } else if (onSwitchToTree) {
                          onSwitchToTree(response.matchedSecondaryPerson!.key);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>فتح سجل «{response.matchedSecondaryPerson.name}»</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Disambiguation / Alternative Matches if multiple people share a similar name */}
            {response.alternativeCandidates && response.alternativeCandidates.length > 0 && (
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2.5">
                <div className="text-xs font-bold text-amber-950">
                  أفراد آخرون في الشجرة يحملون اسماً مشابهاً (اضغط على أي اسم لعرض تحليله الكامل فوراً):
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {response.alternativeCandidates.map(cand => {
                    const branchColor = BRANCH_COLORS[cand.branch] || BRANCH_COLORS.b0;
                    return (
                      <button
                        key={`alt-cand-${cand.key}`}
                        type="button"
                        onClick={() => handleSelectAlternativePerson(cand)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: branchColor.bg, color: branchColor.accent }}
                        >
                          {getArabicInitial(cand.name)}
                        </span>
                        <span>{getQuadLineageName(cand.key, registry.people, 4)}</span>
                        <span className="text-[10px] text-slate-500">(الجيل {cand.generation})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
