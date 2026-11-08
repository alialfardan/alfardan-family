import React, { useState } from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { getLineageChain, getQuadLineageName, searchFamilyMembers } from '../data/treeManager';
import { Printer, Award, X, Search, Shield, Type, Check, Space, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PedigreeCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  personKey: string;
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string) => void;
}

interface FontOption {
  id: string;
  name: string;
  label: string;
  fontFamily: string;
}

const CERTIFICATE_FONTS: FontOption[] = [
  {
    id: 'noto',
    name: 'خط النسخ الواضح',
    label: 'النسخ المعتمد (فائق الوضوح)',
    fontFamily: "'Noto Naskh Arabic', serif",
  },
  {
    id: 'amiri',
    name: 'خط أميري أصيل',
    label: 'أميري كلاسيكي',
    fontFamily: "'Amiri', serif",
  },
  {
    id: 'cairo',
    name: 'خط القاهرة الواضح',
    label: 'القاهرة عصري ومقروء',
    fontFamily: "'Cairo', sans-serif",
  },
  {
    id: 'readex',
    name: 'خط ريديكس الحديث',
    label: 'ريديكس معاصر',
    fontFamily: "'Readex Pro', sans-serif",
  },
];

type WordSpacingLevel = 'normal' | 'wide' | 'xwide';
type NameSizeLevel = 'normal' | 'large' | 'xlarge';

export const PedigreeCertificateModal: React.FC<PedigreeCertificateModalProps> = ({
  isOpen,
  onClose,
  personKey,
  registry,
  onSelectPerson: _onSelectPerson,
}) => {
  const [currentKey, setCurrentKey] = useState(personKey || registry.fardanKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFontId, setSelectedFontId] = useState<string>('noto');
  const [nameSize, setNameSize] = useState<NameSizeLevel>('large');
  const [wordSpacingLevel, setWordSpacingLevel] = useState<WordSpacingLevel>('wide');

  if (!isOpen) return null;

  const person = registry.people.get(currentKey) || registry.people.get(registry.fardanKey);
  if (!person) return null;

  const chain = getLineageChain(person.key, registry.people);

  const currentFont = CERTIFICATE_FONTS.find(f => f.id === selectedFontId) || CERTIFICATE_FONTS[0];

  const handlePrint = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Search candidates
  const candidates: ProcessedPerson[] = searchQuery.trim()
    ? searchFamilyMembers(searchQuery, registry.people, 12)
    : [];

  const todayArabic = new Date().toLocaleDateString('ar-BH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const nameSizeClasses = {
    normal: 'text-2xl sm:text-4xl',
    large: 'text-3xl sm:text-5xl',
    xlarge: 'text-4xl sm:text-6xl',
  }[nameSize];

  // Word spacing CSS values
  const spacingCssValue = {
    normal: '0.25em',
    wide: '0.5em',
    xwide: '0.8em',
  }[wordSpacingLevel];

  const wordGapClass = {
    normal: 'gap-x-2',
    wide: 'gap-x-3.5',
    xwide: 'gap-x-5',
  }[wordSpacingLevel];

  const fullNameText = `${person.title ? `${person.title} ` : ''}${person.name}`.trim();
  const nameWords = fullNameText.split(/\s+/).filter(Boolean);

  // Generate certificate reference code based on person key and generation
  const certCode = `FRD-${person.key.toUpperCase()}-G${person.generation}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 text-slate-800 font-['Readex_Pro',sans-serif] overflow-hidden">
        {/* Modal Top Bar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              وثيقة إثبات النسب العائلي
            </h3>
            <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
              معتمدة
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Customization Controls (hidden on print) */}
        <div className="print:hidden px-4 sm:px-6 py-3 bg-amber-50/70 border-b border-amber-200/80 space-y-2.5 text-xs">
          {/* Row 1: Font selection & Word Spacing & Name Size */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Font selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 font-bold shrink-0">
                <Type className="w-3.5 h-3.5 text-amber-700" />
                <span>نوع الخط:</span>
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {CERTIFICATE_FONTS.map(font => {
                  const isSelected = font.id === selectedFontId;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFontId(font.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-amber-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{font.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Word spacing toggle */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-lg border border-amber-200 shadow-xs">
              <Space className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-slate-700 font-bold text-[11px]">تباعد كلمات الاسم:</span>
              {(['normal', 'wide', 'xwide'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setWordSpacingLevel(lvl)}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition-all ${
                    wordSpacingLevel === lvl
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lvl === 'normal' ? 'معتدل' : lvl === 'wide' ? 'واسع ومريح (موصى به)' : 'فائق التباعد'}
                </button>
              ))}
            </div>

            {/* Name Size Options */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-lg border border-amber-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-slate-700 font-bold text-[11px]">حجم الاسم:</span>
              {(['normal', 'large', 'xlarge'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setNameSize(size)}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition-all ${
                    nameSize === size
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {size === 'normal' ? 'عادي' : size === 'large' ? 'كبير' : 'كبير جداً'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Search Person */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-200/50">
            <span className="text-slate-600 shrink-0 font-medium">الشخص المعني بإصدار الشهادة:</span>
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم لتغيير الشخص في الوثيقة..."
                className="w-full pr-8 pl-3 py-1 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-slate-400" />

              {candidates.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto p-1">
                  {candidates.map((cand: ProcessedPerson) => (
                    <button
                      key={`cand-${cand.key}`}
                      onClick={() => {
                        setCurrentKey(cand.key);
                        setSearchQuery('');
                      }}
                      className="w-full text-right p-1.5 hover:bg-amber-50 rounded text-xs block truncate cursor-pointer font-medium"
                    >
                      <span className="font-bold text-slate-900">{getQuadLineageName(cand.key, registry.people, 4) || cand.name}</span>
                      <span className="text-[10px] text-amber-800 mr-1.5 font-normal">
                        (الجيل {cand.generation} {cand.branchName ? `· فرع ${cand.branchName}` : ''})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The Printable Certificate Area */}
        <div className="p-4 sm:p-10 bg-[#fffdf9] print:p-6 print:m-0">
          <div className="relative border-8 border-double border-amber-700/70 rounded-3xl p-6 sm:p-12 text-center space-y-6 shadow-inner bg-gradient-to-b from-[#fffcf7] via-[#fffbf2] to-[#fff8eb]">
            {/* Watermark / Logo background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none">
              <img src="/fardan-logo.jpg" alt="" className="w-96 h-96 object-contain" />
            </div>

            {/* Header with Emblem */}
            <div className="flex flex-col items-center space-y-2.5">
              <div className="w-20 h-20 rounded-full border-2 border-amber-600/50 p-1 shadow-md bg-white">
                <img
                  src="/fardan-logo.jpg"
                  alt="شعار عائلة الفردان"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <span
                className="text-xs uppercase tracking-widest text-amber-900 font-bold"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                مملكة البحرين · قرية كرزكان
              </span>

              <h2
                className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-wide"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                وثيقة إثبات نسب عائلي
              </h2>

              <div className="flex items-center justify-center gap-2 text-amber-600/70 my-1">
                <span className="w-14 h-px bg-gradient-to-r from-transparent to-amber-500"></span>
                <span className="text-sm select-none">✦ ❖ ✦</span>
                <span className="w-14 h-px bg-gradient-to-l from-transparent to-amber-500"></span>
              </div>
            </div>

            {/* Certificate Body Text */}
            <div className="space-y-5 max-w-2xl mx-auto text-slate-800 leading-relaxed">
              <p
                className="text-sm sm:text-base text-slate-700 font-medium"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                تشهد هذه الوثيقة المعتمدة والمستخرجة من السجل الرسمي لشجرة عائلة الفردان، بأن المكرم:
              </p>

              {/* The Person's Name - Separated with generous word spacing and large clear letters */}
              <div className="py-4 px-4 sm:px-6 my-2 bg-gradient-to-r from-amber-50/0 via-amber-100/60 to-amber-50/0 rounded-2xl border-y-2 border-amber-300/80 shadow-xs">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-amber-600 text-lg sm:text-2xl select-none">❖</span>

                  {/* Render each word of the name as an explicit block with wide spacing */}
                  <h3
                    className={`${nameSizeClasses} font-black text-emerald-950 tracking-normal leading-normal drop-shadow-xs flex flex-wrap items-center justify-center ${wordGapClass}`}
                    style={{
                      fontFamily: currentFont.fontFamily,
                      wordSpacing: spacingCssValue,
                    }}
                  >
                    {nameWords.map((word, wIdx) => (
                      <span
                        key={`word-${wIdx}`}
                        className="inline-block px-1 py-0.5 hover:text-emerald-800 transition-colors"
                      >
                        {word}
                      </span>
                    ))}
                  </h3>

                  <span className="text-amber-600 text-lg sm:text-2xl select-none">❖</span>
                </div>

                {/* Subtitle / Generation / Branch details */}
                <div
                  className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm text-slate-600 mt-2.5 font-['Readex_Pro']"
                >
                  {person.year && (
                    <span className="bg-white/90 px-3 py-0.5 rounded-full border border-amber-200/80 shadow-2xs">
                      مواليد عام {person.year}م
                    </span>
                  )}
                  <span className="bg-white/90 px-3 py-0.5 rounded-full border border-amber-200/80 shadow-2xs font-semibold">
                    الجيل {person.generation}
                  </span>
                  {person.branchName && (
                    <span className="bg-white/90 px-3 py-0.5 rounded-full border border-amber-200/80 shadow-2xs">
                      فرع {person.branchName}
                    </span>
                  )}
                </div>
              </div>

              <p
                className="text-xs sm:text-sm text-slate-700 font-medium"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                ينحدر بنسبه الشريف المتصل كابراً عن كابر وفق التسلسل المبارك الآتي:
              </p>

              {/* Lineage Patronymic Chain - Clear distinct ancestor cards with spaced connectors */}
              <div
                className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-6 text-center shadow-xs"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                <div className="flex flex-wrap items-center justify-center gap-y-3 gap-x-2 text-base sm:text-xl leading-loose">
                  {chain.map((c, idx) => (
                    <React.Fragment key={`cert-chain-${c.key}`}>
                      <span className="inline-block px-3 py-1 bg-white/95 border border-amber-200/90 rounded-xl shadow-xs font-bold text-emerald-950 hover:border-amber-400 transition-colors">
                        {c.name}
                      </span>
                      {idx < chain.length - 1 && (
                        <span className="text-amber-900 font-extrabold px-1 text-sm sm:text-base flex items-center select-none">
                          {c.gender === 'f' ? 'بنت' : 'بن'}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <p
                className="text-xs sm:text-sm text-slate-600 italic"
                style={{ fontFamily: currentFont.fontFamily }}
              >
                {person.branch === 'b1' || person.key === 'o4' || chain.some(c => c.key === 'o4')
                  ? '«من ذرية محمد بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي الكرزكاني»'
                  : person.branch === 'b3' || person.key === 'o15' || chain.some(c => c.key === 'o15')
                  ? '«من ذرية حسين بن الفردان بن عبد الحسين بن يوسف بن الشيخ علي الكرزكاني»'
                  : person.key === 'am_mvzm8u6pyafp'
                  ? '«من ذرية الفردان بن عبد الحسين بن يوسف بن الشيخ علي الكرزكاني»'
                  : '«من ذرية فردان بن أيوب بن عبد الحسين بن يوسف بن الشيخ علي الكرزكاني»'}
              </p>
            </div>

            {/* Footer Signatures, Verification Code, and Official Seal */}
            <div
              className="pt-6 grid grid-cols-2 gap-6 text-xs text-slate-700 border-t border-amber-200/80"
              style={{ fontFamily: currentFont.fontFamily }}
            >
              <div className="text-right space-y-1">
                <span className="block font-bold text-slate-900 text-xs sm:text-sm">تاريخ الإصدار:</span>
                <span className="text-slate-700 block">{todayArabic}</span>
                <span className="block text-[10px] text-slate-400 font-mono tracking-wider">
                  رمز الوثيقة: {certCode}
                </span>
              </div>

              <div className="text-left flex flex-col items-end justify-center">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-sm">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>ختم التوثيق العائلي المعتمد</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5">شجرة عائلة الفردان</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
