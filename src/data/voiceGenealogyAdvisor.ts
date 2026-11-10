import { FamilyTreeProcessed, ProcessedPerson, MotherInfo, SpouseInfo } from '../types/family';
import { normalizeArabic, formatLineageString, getQuadLineageName, ARABIC_ORDINALS } from './treeManager';
import { analyzeKinship, getAncestorsPath, KinshipResult } from './kinshipAnalyzer';

export interface PersonDeepProfile {
  person: ProcessedPerson;
  fullLineageText: string;
  ancestorsChain: ProcessedPerson[];
  father: ProcessedPerson | null;
  paternalGrandfather: ProcessedPerson | null;
  paternalGreatGrandfather: ProcessedPerson | null;
  motherInfo: MotherInfo | null;
  motherPerson: ProcessedPerson | null;
  paternalGrandmotherInfo: MotherInfo | null;
  paternalGrandmotherPerson: ProcessedPerson | null;
  maternalGrandfather: ProcessedPerson | null;
  maternalGrandmotherInfo: MotherInfo | null;
  maternalGrandmotherPerson: ProcessedPerson | null;
  paternalUncles: ProcessedPerson[]; // الأعمام
  paternalAunts: ProcessedPerson[];  // العمات
  maternalUncles: ProcessedPerson[]; // الأخوال
  maternalAunts: ProcessedPerson[];  // الخالات
  brothers: ProcessedPerson[];       // الإخوة
  sisters: ProcessedPerson[];        // الأخوات
  maternalSiblings: ProcessedPerson[]; // الإخوة لأم
  sons: ProcessedPerson[];           // الأبناء
  daughters: ProcessedPerson[];      // البنات
  totalDescendantsCount: number;
  spouses: SpouseInfo[];
  husbandsFromTree: ProcessedPerson[]; // إذا كانت أنثى ومرتبطة كزوجة لفرد في الشجرة
  daughtersInLawAndSonsInLaw: { child: ProcessedPerson; spouseName: string; origin?: string }[];
}

export interface AdvisorResponse {
  query: string;
  queryType: 'kinship_two_people' | 'person_deep_profile' | 'family_overview' | 'not_found';
  title: string;
  spokenText: string; // نص عربي فصيح مهيأ للقراءة الصوتية الواضحة
  sections: {
    heading: string;
    content: string;
    badge?: string;
    tone?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  }[];
  matchedPrimaryPerson?: ProcessedPerson;
  matchedSecondaryPerson?: ProcessedPerson;
  kinshipResult?: KinshipResult | null;
  alternativeCandidates?: ProcessedPerson[];
}

/**
 * Counts all descendants of a person recursively
 */
function countAllDescendants(personKey: string, people: Map<string, ProcessedPerson>): number {
  const visited = new Set<string>();
  function dfs(k: string): number {
    const p = people.get(k);
    if (!p) return 0;
    let total = 0;
    for (const childKey of p.childrenKeys) {
      if (!visited.has(childKey)) {
        visited.add(childKey);
        const child = people.get(childKey);
        if (child && !child.deleted) {
          total += 1 + dfs(childKey);
        }
      }
    }
    return total;
  }
  return dfs(personKey);
}

/**
 * Builds a complete, deep genealogical profile for a single person:
 * - Lineage up to Sheikh Ali
 * - Mother, Paternal Grandmother (أم الأب), Maternal Grandmother (أم الأم), Maternal Grandfather (أبو الأم)
 * - Paternal Uncles & Aunts (الأعمام والعمات)
 * - Maternal Uncles & Aunts (الأخوال والخالات)
 * - Siblings (الإخوة والأخوات)
 * - Spouses & In-Laws (المصاهرات والأصهار)
 * - Children & Descendants (الأبناء والبنات والذرية)
 */
export function buildPersonDeepProfile(
  personKey: string,
  people: Map<string, ProcessedPerson>
): PersonDeepProfile | null {
  const person = people.get(personKey);
  if (!person || person.deleted) return null;

  const ancestorsChain = getAncestorsPath(person.key, people);
  const fullLineageText = formatLineageString(person.key, people);

  const father = person.parentKey ? people.get(person.parentKey) || null : null;
  const paternalGrandfather = father?.parentKey ? people.get(father.parentKey) || null : null;
  const paternalGreatGrandfather = paternalGrandfather?.parentKey
    ? people.get(paternalGrandfather.parentKey) || null
    : null;

  // Mother & Maternal side
  const motherInfo = person.mother || null;
  let motherPerson: ProcessedPerson | null = null;
  if (motherInfo?.personKey) {
    motherPerson = people.get(motherInfo.personKey) || null;
  } else if (motherInfo?.isFromFamily && motherInfo.name) {
    // Try to resolve mother from tree by normalized lineage name if personKey was not linked
    const normMother = normalizeArabic(motherInfo.name);
    for (const candidate of people.values()) {
      if (candidate.deleted || candidate.gender !== 'f') continue;
      const candQuad = normalizeArabic(getQuadLineageName(candidate.key, people, 4));
      if (candQuad === normMother || (normMother.includes(normalizeArabic(candidate.name)) && normMother.split(' ').length >= 3 && candQuad.startsWith(normMother))) {
        motherPerson = candidate;
        break;
      }
    }
  }

  // Paternal Grandmother (أم الأب)
  const paternalGrandmotherInfo = father?.mother || null;
  const paternalGrandmotherPerson = paternalGrandmotherInfo?.personKey
    ? people.get(paternalGrandmotherInfo.personKey) || null
    : null;

  // Maternal Grandfather (جد لأم - والد الأم) & Maternal Grandmother (جدة لأم - والدة الأم)
  const maternalGrandfather = motherPerson?.parentKey
    ? people.get(motherPerson.parentKey) || null
    : null;
  const maternalGrandmotherInfo = motherPerson?.mother || null;
  const maternalGrandmotherPerson = maternalGrandmotherInfo?.personKey
    ? people.get(maternalGrandmotherInfo.personKey) || null
    : null;

  // Paternal Uncles (الأعمام) & Paternal Aunts (العمات)
  const paternalUncles: ProcessedPerson[] = [];
  const paternalAunts: ProcessedPerson[] = [];
  if (paternalGrandfather && father) {
    for (const childKey of paternalGrandfather.childrenKeys) {
      if (childKey === father.key) continue;
      const siblingOfFather = people.get(childKey);
      if (siblingOfFather && !siblingOfFather.deleted) {
        if (siblingOfFather.gender === 'm') {
          paternalUncles.push(siblingOfFather);
        } else {
          paternalAunts.push(siblingOfFather);
        }
      }
    }
  }

  // Maternal Uncles (الأخوال) & Maternal Aunts (الخالات)
  const maternalUncles: ProcessedPerson[] = [];
  const maternalAunts: ProcessedPerson[] = [];
  if (maternalGrandfather && motherPerson) {
    for (const childKey of maternalGrandfather.childrenKeys) {
      if (childKey === motherPerson.key) continue;
      const siblingOfMother = people.get(childKey);
      if (siblingOfMother && !siblingOfMother.deleted) {
        if (siblingOfMother.gender === 'm') {
          maternalUncles.push(siblingOfMother);
        } else {
          maternalAunts.push(siblingOfMother);
        }
      }
    }
  }

  // Siblings from Father (الإخوة والأخوات)
  const brothers: ProcessedPerson[] = [];
  const sisters: ProcessedPerson[] = [];
  if (father) {
    for (const childKey of father.childrenKeys) {
      if (childKey === person.key) continue;
      const sib = people.get(childKey);
      if (sib && !sib.deleted) {
        if (sib.gender === 'm') {
          brothers.push(sib);
        } else {
          sisters.push(sib);
        }
      }
    }
  }

  // Maternal Half-Siblings (الإخوة لأم إن وجدوا من أب آخر)
  const maternalSiblings: ProcessedPerson[] = [];
  if (motherPerson) {
    for (const p of people.values()) {
      if (p.deleted || p.key === person.key || p.parentKey === person.parentKey) continue;
      if (p.mother?.personKey === motherPerson.key) {
        maternalSiblings.push(p);
      }
    }
  }

  // Children (الأبناء والبنات)
  const sons: ProcessedPerson[] = [];
  const daughters: ProcessedPerson[] = [];
  for (const childKey of person.childrenKeys) {
    const child = people.get(childKey);
    if (child && !child.deleted) {
      if (child.gender === 'm') {
        sons.push(child);
      } else {
        daughters.push(child);
      }
    }
  }

  const totalDescendantsCount = countAllDescendants(person.key, people);

  // Spouses & Husbands from tree
  const spouses = person.spouses || [];
  const husbandsFromTree: ProcessedPerson[] = [];
  if (person.gender === 'f') {
    for (const p of people.values()) {
      if (p.deleted || !p.spouses) continue;
      if (p.spouses.some(s => s.personKey === person.key)) {
        husbandsFromTree.push(p);
      }
    }
  }

  // Children's spouses (أصهار الأبناء والبنات)
  const daughtersInLawAndSonsInLaw: { child: ProcessedPerson; spouseName: string; origin?: string }[] = [];
  for (const childKey of person.childrenKeys) {
    const child = people.get(childKey);
    if (!child || child.deleted) continue;
    if (child.spouses && child.spouses.length > 0) {
      for (const sp of child.spouses) {
        daughtersInLawAndSonsInLaw.push({
          child,
          spouseName: sp.name,
          origin: sp.isFromFamily ? 'من عائلة الفردان' : sp.familyOrigin
        });
      }
    }
  }

  return {
    person,
    fullLineageText,
    ancestorsChain,
    father,
    paternalGrandfather,
    paternalGreatGrandfather,
    motherInfo,
    motherPerson,
    paternalGrandmotherInfo,
    paternalGrandmotherPerson,
    maternalGrandfather,
    maternalGrandmotherInfo,
    maternalGrandmotherPerson,
    paternalUncles,
    paternalAunts,
    maternalUncles,
    maternalAunts,
    brothers,
    sisters,
    maternalSiblings,
    sons,
    daughters,
    totalDescendantsCount,
    spouses,
    husbandsFromTree,
    daughtersInLawAndSonsInLaw
  };
}

/**
 * Cleans filler words from a person-name segment in a natural Arabic question
 */
function cleanNameSegment(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/[؟?!.,،؛"«»()]/g, ' ')
    .replace(/(?:شجرة|شجره|عائلة|عائله)\s+الفردان/g, ' ')
    .replace(/\b(ما|هي|هو|من|هم|هن|هل|كيف|اين|متى|كم|وش|شنو|ايش|أين)\b/g, ' ')
    .replace(/\b(صلة|صله|علاقة|علاقه|قرابة|قرابه|القرابة|القرابه|النسب|نسب|تاريخ|ذرية|ذريه|فرع|شجرة|شجره|عائلة|عائله|الكرزكاني|آل فردان|ال فردان)\b/g, ' ')
    .replace(/\b(بين|كل|كلا|مع|الى|إلى|عن|في|على|عند|لدى|لـ|الجد|الجدة|الجده|وجدات|جدات|الأب|الاب|الأم|الام|والد|والدة|والده|أبناء|ابناء|أولاد|اولاد|بنات|أعمام|اعمام|عمام|عموم|أخوال|اخوال|خوال|عمات|خالات|إخوة|اخوة|أخوان|اخوان|أخوات|اخوات|أزواج|ازواج|زوجات|زوجة|زوجه|زوج|مصاهرة|مصاهره|مصاهرات|أصول|اصول|تتبع|اعرف|أعرف|اخبرني|أخبرني|حدثني|تكلم|قلي|قل لي)\b/g, ' ')
    .replace(/\b( بن | بنت | ابن | ابنة )/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Finds the best matching person(s) in the tree for a given name query segment
 */
export function matchPersonFromText(
  rawSegment: string,
  people: Map<string, ProcessedPerson>,
  excludeFemales: boolean = false
): { best: ProcessedPerson | null; alternatives: ProcessedPerson[] } {
  const cleaned = cleanNameSegment(rawSegment);
  const normQuery = normalizeArabic(cleaned);
  if (!normQuery || normQuery.length < 2) {
    return { best: null, alternatives: [] };
  }

  const queryTokens = normQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) {
    return { best: null, alternatives: [] };
  }

  const scored: { person: ProcessedPerson; score: number }[] = [];

  for (const person of people.values()) {
    if (person.deleted) continue;
    if (excludeFemales && person.gender === 'f') continue;

    const normName = normalizeArabic(person.name);
    const fullChain = getAncestorsPath(person.key, people).map(p => normalizeArabic(p.name));
    const fullLineageSpace = fullChain.join(' ');
    const quadSpace = fullChain.slice(0, 5).join(' ');

    let score = 0;

    // 1. Exact full lineage prefix match (highest confidence)
    if (fullLineageSpace === normQuery || quadSpace === normQuery) {
      score += 1000;
    } else if (fullLineageSpace.startsWith(normQuery + ' ') || quadSpace.startsWith(normQuery + ' ')) {
      score += 850 + queryTokens.length * 40;
    } else if (normName === normQuery) {
      // Single name exact match: prioritize founding/earlier generations slightly if only 1 token
      score += 500 + Math.max(0, 15 - person.generation) * 5;
    }

    // 2. Sequential ancestor token matching (e.g. "عبدالله عبدالكريم حسين" -> person="عبدالله", father="عبدالكريم", grandpa="حسين")
    if (queryTokens.length >= 2) {
      let matchedSequential = 0;
      for (let i = 0; i < Math.min(queryTokens.length, fullChain.length); i++) {
        if (fullChain[i] === queryTokens[i] || fullChain[i].includes(queryTokens[i])) {
          matchedSequential++;
        } else {
          break;
        }
      }
      if (matchedSequential === queryTokens.length) {
        score += 750 + matchedSequential * 60;
      } else if (matchedSequential >= 2) {
        score += 400 + matchedSequential * 50;
      }
    }

    // 3. Token inclusion check if first token matches person's own first name
    if (score === 0 && (normName === queryTokens[0] || normName.includes(queryTokens[0]))) {
      let tokenHits = 1;
      for (let i = 1; i < queryTokens.length; i++) {
        if (fullLineageSpace.includes(queryTokens[i])) {
          tokenHits++;
        }
      }
      if (tokenHits === queryTokens.length) {
        score += 320 + tokenHits * 45 + Math.max(0, 12 - person.generation) * 3;
      }
    }

    if (score > 0) {
      scored.push({ person, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { best: null, alternatives: [] };
  }

  return {
    best: scored[0].person,
    alternatives: scored.slice(1, 7).map(s => s.person)
  };
}

/**
 * Formats a person's Deep Profile into eloquent Classical Arabic (الفصحى) sections and spoken summary
 */
export function formatDeepProfileResponse(
  query: string,
  profile: PersonDeepProfile,
  people: Map<string, ProcessedPerson>,
  alternatives: ProcessedPerson[] = [],
  isPrivacyRestricted: boolean = false
): AdvisorResponse {
  const { person } = profile;
  const isMale = person.gender === 'm';
  const genOrdinal = ARABIC_ORDINALS[person.generation] || `الجيل ${person.generation}`;

  const sections: AdvisorResponse['sections'] = [];

  // 1. عمود النسب والأصول حتى الجد الأكبر الشيخ علي
  const lineageParagraph = `${isMale ? 'هو' : 'هي'} «${profile.fullLineageText}»، ${isMale ? 'ينتمي' : 'تنتمي'} إلى ${genOrdinal} في شجرة عائلة الفردان الكرزكاني (${person.branchName || 'الأصل الجامع'}). ويمتد عمود نسب${isMale ? 'ه' : 'ها'} الموثق عبر ${profile.ancestorsChain.length} أجيال متصلة وصولاً إلى الجد الأكبر الشيخ علي الكرزكاني.`;
  sections.push({
    heading: '١. عمود النسب والأصول حتى الجد الأكبر الشيخ علي',
    content: lineageParagraph,
    badge: genOrdinal,
    tone: 'emerald'
  });

  // 2. الوالدة والجدات (للأب وللأم) — مخفي في وضع الزوار العام
  if (!isPrivacyRestricted) {
    const grandmothersLines: string[] = [];
    if (profile.motherInfo) {
      const motherOriginText = profile.motherPerson
        ? `من ذرية عائلة الفردان (${formatLineageString(profile.motherPerson.key, people)})`
        : profile.motherInfo.isFromFamily
        ? 'من كرائم عائلة الفردان'
        : profile.motherInfo.familyOrigin
        ? `من عائلة «${profile.motherInfo.familyOrigin}» الكريمة`
        : 'موثقة في سجل الأمهات';
      grandmothersLines.push(`• الوالدة الكريمة: «${profile.motherInfo.name}» (${motherOriginText}).`);
    } else {
      grandmothersLines.push(`• الوالدة الكريمة: لم يُدرج اسم الوالدة تفصيلاً في البطاقة الحالية بعد.`);
    }

    if (profile.paternalGrandmotherInfo) {
      const patGmLineage = profile.paternalGrandmotherPerson
        ? ` (${getQuadLineageName(profile.paternalGrandmotherPerson.key, people, 4)})`
        : profile.paternalGrandmotherInfo.familyOrigin
        ? ` (من عائلة ${profile.paternalGrandmotherInfo.familyOrigin})`
        : '';
      grandmothersLines.push(`• الجدة لأب (والدة الأب «${profile.father?.name || ''}»): السيدة «${profile.paternalGrandmotherInfo.name}»${patGmLineage}.`);
    } else if (profile.father) {
      grandmothersLines.push(`• الجدة لأب (والدة الأب «${profile.father.name}»): غير مسجلة حالياً في بطاقة الوالد.`);
    }

    if (profile.maternalGrandfather || profile.maternalGrandmotherInfo) {
      if (profile.maternalGrandfather) {
        grandmothersLines.push(
          `• الجد لأم (والد الوالدة): «${getQuadLineageName(profile.maternalGrandfather.key, people, 4)}».`
        );
      }
      if (profile.maternalGrandmotherInfo) {
        const matGmLineage = profile.maternalGrandmotherPerson
          ? ` (${getQuadLineageName(profile.maternalGrandmotherPerson.key, people, 4)})`
          : profile.maternalGrandmotherInfo.familyOrigin
          ? ` (من عائلة ${profile.maternalGrandmotherInfo.familyOrigin})`
          : '';
        grandmothersLines.push(`• الجدة لأم (والدة الأم): السيدة «${profile.maternalGrandmotherInfo.name}»${matGmLineage}.`);
      }
    }

    sections.push({
      heading: '٢. الوالدة والجدات (للأب وللأم)',
      content: grandmothersLines.join('\n'),
      badge: 'الأمهات والجدات',
      tone: 'rose'
    });
  }

  // 3. الأعمام والعمات (إخوة وأخوات الأب)
  const paternalRelativesLines: string[] = [];
  if (profile.paternalUncles.length > 0) {
    paternalRelativesLines.push(
      `• الأعمام (${profile.paternalUncles.length}): ${profile.paternalUncles.map(u => `«${u.name}»`).join('، ')}.`
    );
  } else {
    paternalRelativesLines.push(`• الأعمام: لا يوجد أعمام ذكور مسجلون غير الوالد.`);
  }

  if (!isPrivacyRestricted) {
    if (profile.paternalAunts.length > 0) {
      paternalRelativesLines.push(
        `• العمات (${profile.paternalAunts.length}): ${profile.paternalAunts.map(a => `«${a.name}»`).join('، ')}.`
      );
    } else {
      paternalRelativesLines.push(`• العمات: لا توجد عمات مسجلات في نفس الفرع المباشر.`);
    }
  }

  sections.push({
    heading: isPrivacyRestricted ? '٢. الأعمام (إخوة الأب)' : '٣. الأعمام والعمات (إخوة وأخوات الأب)',
    content: paternalRelativesLines.join('\n'),
    badge: isPrivacyRestricted
      ? `${profile.paternalUncles.length} أعمام`
      : `${profile.paternalUncles.length} أعمام · ${profile.paternalAunts.length} عمات`,
    tone: 'amber'
  });

  // 4. الأخوال والخالات (إخوة وأخوات الأم) — مخفي في وضع الزوار العام
  if (!isPrivacyRestricted) {
    const maternalRelativesLines: string[] = [];
    if (profile.motherPerson) {
      if (profile.maternalUncles.length > 0) {
        maternalRelativesLines.push(
          `• الأخوال المباشرون (${profile.maternalUncles.length}): ${profile.maternalUncles.map(u => `«${u.name}»`).join('، ')} (أبناء الجد لأم «${profile.maternalGrandfather?.name || ''}»).`
        );
      } else {
        maternalRelativesLines.push(`• الأخوال: لا يوجد أشقاء ذكور مسجلون للوالدة «${profile.motherPerson.name}».`);
      }
      if (profile.maternalAunts.length > 0) {
        maternalRelativesLines.push(
          `• الخالات المباشرات (${profile.maternalAunts.length}): ${profile.maternalAunts.map(a => `«${a.name}»`).join('، ')}.`
        );
      } else {
        maternalRelativesLines.push(`• الخالات: لا توجد شقيقات مسجلات للوالدة «${profile.motherPerson.name}».`);
      }
    } else if (profile.motherInfo?.familyOrigin) {
      maternalRelativesLines.push(
        `• الأخوال والخالات: من عائلة «${profile.motherInfo.familyOrigin}» الكريمة (خارج المشجر المباشر لعائلة الفردان).`
      );
    } else {
      maternalRelativesLines.push(
        `• الأخوال والخالات: يتطلب عرض أسماء الأخوال والخالات توثيق ارتباط الوالدة في سجل الأمهات.`
      );
    }

    sections.push({
      heading: '٤. الأخوال والخالات (قرابة جهة الأم)',
      content: maternalRelativesLines.join('\n'),
      badge: profile.motherPerson ? `${profile.maternalUncles.length} أخوال · ${profile.maternalAunts.length} خالات` : 'جهة الأم',
      tone: 'indigo'
    });
  }

  // 5. الإخوة والأخوات، المصاهرات، والأبناء
  const familyUnitLines: string[] = [];
  if (profile.brothers.length > 0 || (!isPrivacyRestricted && profile.sisters.length > 0)) {
    if (profile.brothers.length > 0) {
      familyUnitLines.push(`• الإخوة (${profile.brothers.length}): ${profile.brothers.map(b => `«${b.name}»`).join('، ')}.`);
    }
    if (!isPrivacyRestricted && profile.sisters.length > 0) {
      familyUnitLines.push(`• الأخوات (${profile.sisters.length}): ${profile.sisters.map(s => `«${s.name}»`).join('، ')}.`);
    }
  } else {
    familyUnitLines.push(`• الإخوة: لا يوجد إخوة مسجلون.`);
  }

  if (!isPrivacyRestricted) {
    if (profile.spouses.length > 0) {
      const spouseDescriptions = profile.spouses.map(sp => {
        if (sp.isFromFamily && sp.personKey && people.has(sp.personKey)) {
          return `«${getQuadLineageName(sp.personKey, people, 4)}» (من عائلة الفردان)`;
        }
        return `«${sp.name}»${sp.familyOrigin ? ` (من عائلة ${sp.familyOrigin})` : ''}`;
      });
      familyUnitLines.push(`• المصاهرة والزواج: اقترن بـ ${spouseDescriptions.join('، و')}.`);
    } else if (profile.husbandsFromTree.length > 0) {
      familyUnitLines.push(
        `• المصاهرة والزواج: مقترنة بـ ${profile.husbandsFromTree.map(h => `«${getQuadLineageName(h.key, people, 4)}»`).join('، و')}.`
      );
    }
  }

  if (profile.sons.length > 0 || profile.daughters.length > 0) {
    if (profile.sons.length > 0) {
      familyUnitLines.push(`• الأبناء الذكور (${profile.sons.length}): ${profile.sons.map(s => `«${s.name}»`).join('، ')}.`);
    }
    if (profile.daughters.length > 0) {
      if (isPrivacyRestricted) {
        const dCountText = profile.daughters.length === 1 ? 'بنت واحدة' : profile.daughters.length === 2 ? 'بنتان' : `${profile.daughters.length} بنات`;
        familyUnitLines.push(`• البنات: ${dCountText}.`);
      } else {
        familyUnitLines.push(`• البنات (${profile.daughters.length}): ${profile.daughters.map(d => `«${d.name}»`).join('، ')}.`);
      }
    }
    if (profile.totalDescendantsCount > profile.sons.length + profile.daughters.length) {
      familyUnitLines.push(`• إجمالي الذرية والأحفاد المسجلين في الشجرة: ${profile.totalDescendantsCount} فرداً.`);
    }
  } else {
    familyUnitLines.push(`• الأبناء والذرية: لا يوجد أبناء مسجلون حالياً في البطاقة.`);
  }

  sections.push({
    heading: isPrivacyRestricted ? '٣. الإخوة والأبناء والذرية' : '٥. الإخوة، المصاهرات، والأبناء والذرية',
    content: familyUnitLines.join('\n'),
    badge: `${profile.sons.length + profile.daughters.length} أبناء مباشرين`,
    tone: 'slate'
  });

  // Build fluent Classical Arabic text for SpeechSynthesis
  const spokenParts: string[] = [
    `تحليل النسب الكامل لـ ${person.name}.`,
    `عمود النسب: ${isMale ? 'هو' : 'هي'} ${profile.fullLineageText}، في ${genOrdinal}.`
  ];
  if (!isPrivacyRestricted && profile.motherInfo) {
    spokenParts.push(
      `والدته الكريمة هي ${profile.motherInfo.name}${
        profile.motherPerson
          ? ` ابنة ${profile.maternalGrandfather?.name || ''} من عائلة الفردان`
          : profile.motherInfo.familyOrigin
          ? ` من عائلة ${profile.motherInfo.familyOrigin}`
          : ''
      }.`
    );
  }
  if (!isPrivacyRestricted && profile.paternalGrandmotherInfo) {
    spokenParts.push(`وجدته لأبيه هي السيدة ${profile.paternalGrandmotherInfo.name}.`);
  }
  if (!isPrivacyRestricted && profile.maternalGrandmotherInfo) {
    spokenParts.push(`وجدته لأمه هي السيدة ${profile.maternalGrandmotherInfo.name}.`);
  }
  if (profile.paternalUncles.length > 0) {
    spokenParts.push(`أما أعمامه فعددهم ${profile.paternalUncles.length}، وهم: ${profile.paternalUncles.map(u => u.name).join('، و')}.`);
  }
  if (!isPrivacyRestricted && profile.paternalAunts.length > 0) {
    spokenParts.push(`وعماته عددُهن ${profile.paternalAunts.length}، وهن: ${profile.paternalAunts.map(a => a.name).join('، و')}.`);
  }
  if (!isPrivacyRestricted && profile.maternalUncles.length > 0) {
    spokenParts.push(`وأخواله المباشرون عددهم ${profile.maternalUncles.length}، وهم: ${profile.maternalUncles.map(u => u.name).join('، و')}.`);
  }
  if (!isPrivacyRestricted && profile.maternalAunts.length > 0) {
    spokenParts.push(`وخالاته عددُهن ${profile.maternalAunts.length}، وهن: ${profile.maternalAunts.map(a => a.name).join('، و')}.`);
  }
  if (!isPrivacyRestricted && profile.spouses.length > 0) {
    spokenParts.push(`وفي سجل المصاهرة والزواج: اقترن بـ ${profile.spouses.map(s => s.name).join('، و')}.`);
  }
  if (profile.sons.length + profile.daughters.length > 0) {
    spokenParts.push(
      `وله من الأبناء المباشرين ${profile.sons.length + profile.daughters.length}، وإجمالي ذريته في المشجر ${profile.totalDescendantsCount} فرداً.`
    );
  }

  return {
    query,
    queryType: 'person_deep_profile',
    title: `التحليل التفصيلي لنسب وقرابات «${getQuadLineageName(person.key, people, 4)}»`,
    spokenText: spokenParts.join(' '),
    sections,
    matchedPrimaryPerson: person,
    alternativeCandidates: alternatives
  };
}

/**
 * Formats a two-person Kinship Analysis into eloquent Classical Arabic (الفصحى) sections and spoken summary
 */
export function formatTwoPersonKinshipResponse(
  query: string,
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  alternatives: ProcessedPerson[] = [],
  isPrivacyRestricted: boolean = false
): AdvisorResponse {
  const kinship = analyzeKinship(personA.key, personB.key, people);
  const profileA = buildPersonDeepProfile(personA.key, people);
  const profileB = buildPersonDeepProfile(personB.key, people);

  const quadA = getQuadLineageName(personA.key, people, 4);
  const quadB = getQuadLineageName(personB.key, people, 4);

  if (!kinship) {
    return {
      query,
      queryType: 'not_found',
      title: 'تعذر إتمام المقارنة',
      spokenText: 'عذراً، تعذر إتمام تحليل صلة القرابة بين الاسمين المحددين.',
      sections: []
    };
  }

  const sections: AdvisorResponse['sections'] = [];

  // 1. الخلاصة المباشرة لصلة القرابة
  const summaryText = `«${quadA}» هو **${kinship.relationshipTitle}** بالنسبة إلى «${quadB}».\n${kinship.narrativeExplanation}${
    kinship.commonAncestor
      ? `\n• الجد المشترك الجامع لهما: «${getQuadLineageName(kinship.commonAncestor.key, people, 4)}» (يبعد عن الأول بـ ${kinship.distanceA} أجيال وعن الثاني بـ ${kinship.distanceB} أجيال).`
      : ''
  }`;

  sections.push({
    heading: `١. صلة القرابة من جهة الآباء (العصبة): ${kinship.relationshipTitle}`,
    content: summaryText.replace(/\*\*/g, ''),
    badge: kinship.relationshipTitle,
    tone: 'emerald'
  });

  // 2. تتبع عمود النسب الكامل للطرفين حتى الجد الأكبر الشيخ علي
  const lineageBothText = [
    `• نسب الطرف الأول: ${formatLineageString(personA.key, people)} (الجيل ${personA.generation} - ${personA.branchName || 'الأصل'}).`,
    `• نسب الطرف الثاني: ${formatLineageString(personB.key, people)} (الجيل ${personB.generation} - ${personB.branchName || 'الأصل'}).`
  ].join('\n');

  sections.push({
    heading: '٢. تتبع عمود النسب الكامل وصولاً إلى الجد الأكبر الشيخ علي',
    content: lineageBothText,
    badge: 'عمود النسب',
    tone: 'amber'
  });

  // 3 & 4: الأمهات والمصاهرة — مخفية في وضع الزوار العام
  if (!isPrivacyRestricted) {
    // 3. صلة القرابة من جهة الأمهات والجدات والأخوال
    const maternalLines: string[] = [];
    if (kinship.maternalKinship.hasMaternalRelation) {
      maternalLines.push(`• قرابة الأرحام والأخوال المشتركة: ${kinship.maternalKinship.maternalTitle} — ${kinship.maternalKinship.maternalExplanation}`);
    }
    if (profileA?.motherInfo) {
      maternalLines.push(
        `• والدة «${personA.name}»: السيدة «${profileA.motherInfo.name}»${
          profileA.paternalGrandmotherInfo ? `، وجدته لأبيه: «${profileA.paternalGrandmotherInfo.name}»` : ''
        }.`
      );
    }
    if (profileB?.motherInfo) {
      maternalLines.push(
        `• والدة «${personB.name}»: السيدة «${profileB.motherInfo.name}»${
          profileB.paternalGrandmotherInfo ? `، وجدته لأبيه: «${profileB.paternalGrandmotherInfo.name}»` : ''
        }.`
      );
    }
    if (maternalLines.length === 0) {
      maternalLines.push('• لا توجد قرابة مباشرة إضافية مسجلة من جهة الأمهات بين الطرفين بخلاف قرابة العصبة الأبوية.');
    }

    sections.push({
      heading: '٣. القرابة من جهة الأمهات والجدات والأخوال',
      content: maternalLines.join('\n'),
      badge: kinship.maternalKinship.hasMaternalRelation ? kinship.maternalKinship.maternalTitle : 'الأمهات والجدات',
      tone: 'rose'
    });

    // 4. صلة المصاهرة والزواج
    const inLawLines: string[] = [];
    if (kinship.inLawKinship.hasInLawRelation) {
      inLawLines.push(`• رابطة المصاهرة المباشرة: ${kinship.inLawKinship.spousalTitle} — ${kinship.inLawKinship.spousalExplanation}`);
      for (const item of kinship.inLawKinship.inLawsA) {
        if (item.explanation !== kinship.inLawKinship.spousalExplanation) {
          inLawLines.push(`• ${item.explanation}`);
        }
      }
      for (const item of kinship.inLawKinship.inLawsB) {
        if (item.explanation !== kinship.inLawKinship.spousalExplanation) {
          inLawLines.push(`• ${item.explanation}`);
        }
      }
    } else {
      inLawLines.push('• لا توجد رابطة مصاهرة مباشرة مسجلة بين الفردين، وتجمعهما رابطة الدم والنسب الأصيل في الشجرة.');
    }

    sections.push({
      heading: '٤. روابط المصاهرة والزواج',
      content: inLawLines.join('\n'),
      badge: kinship.inLawKinship.hasInLawRelation ? kinship.inLawKinship.spousalTitle : 'المصاهرة',
      tone: 'indigo'
    });
  }

  // Spoken Arabic summary
  const spokenParts: string[] = [
    `تحليل صلة القرابة بين ${quadA} و ${quadB}.`,
    `النتيجة: ${personA.name} هو ${kinship.relationshipTitle} لـ ${personB.name}.`,
    kinship.narrativeExplanation,
    `أما من حيث عمود النسب الكامل: فإن الطرف الأول هو ${formatLineageString(personA.key, people)}.`,
    `والطرف الثاني هو ${formatLineageString(personB.key, people)}.`
  ];
  if (!isPrivacyRestricted && kinship.maternalKinship.hasMaternalRelation) {
    spokenParts.push(`ومن جهة الأمهات والأخوال: ${kinship.maternalKinship.maternalExplanation}`);
  }
  if (!isPrivacyRestricted && kinship.inLawKinship.hasInLawRelation) {
    spokenParts.push(`ومن جهة المصاهرة: ${kinship.inLawKinship.spousalExplanation}`);
  }

  return {
    query,
    queryType: 'kinship_two_people',
    title: `صلة القرابة بين «${quadA}» و«${quadB}»`,
    spokenText: spokenParts.join(' '),
    sections,
    matchedPrimaryPerson: personA,
    matchedSecondaryPerson: personB,
    kinshipResult: kinship,
    alternativeCandidates: alternatives
  };
}

/**
 * Main entry point: Parses any natural Arabic question and returns a rich, polite Classical Arabic response
 */
export function askGenealogyAdvisor(
  rawQuery: string,
  registry: FamilyTreeProcessed,
  explicitPersonAKey?: string,
  explicitPersonBKey?: string,
  isPrivacyRestricted: boolean = false
): AdvisorResponse {
  const query = rawQuery.trim();
  const people = registry.people;

  // 1. If explicit keys were provided by the user via quick selector
  if (explicitPersonAKey && explicitPersonBKey) {
    const pA = people.get(explicitPersonAKey);
    const pB = people.get(explicitPersonBKey);
    if (pA && pB && !(isPrivacyRestricted && (pA.gender === 'f' || pB.gender === 'f'))) {
      return formatTwoPersonKinshipResponse(
        query || `ما صلة القرابة بين ${pA.name} و ${pB.name}؟`,
        pA,
        pB,
        people,
        [],
        isPrivacyRestricted
      );
    }
  } else if (explicitPersonAKey && !explicitPersonBKey && !query) {
    const profile = buildPersonDeepProfile(explicitPersonAKey, people);
    if (profile && !(isPrivacyRestricted && profile.person.gender === 'f')) {
      return formatDeepProfileResponse(`تحليل نسب وقرابات ${profile.person.name}`, profile, people, [], isPrivacyRestricted);
    }
  }

  const normQ = normalizeArabic(query);

  // 2. Check if the user is asking a two-person relationship question:
  // Patterns like: "ما صلة القرابة بين X و Y", "بين X وبين Y", "علاقة X مع Y", "X و Y"
  let candidateSegA = '';
  let candidateSegB = '';

  const betweenMatch = query.match(/بين\s+(.+?)\s+(?:وبين|و)\s+(.+)/i);
  if (betweenMatch) {
    candidateSegA = betweenMatch[1];
    candidateSegB = betweenMatch[2];
  } else if (query.includes(' و ') || query.includes(' و')) {
    // Check if splitting by " و " yields two valid person matches
    const parts = query.split(/\s+و\s*|\s+مع\s+/);
    if (parts.length === 2) {
      candidateSegA = parts[0];
      candidateSegB = parts[1];
    }
  }

  if (candidateSegA && candidateSegB) {
    const matchA = matchPersonFromText(candidateSegA, people, isPrivacyRestricted);
    const matchB = matchPersonFromText(candidateSegB, people, isPrivacyRestricted);
    if (matchA.best && matchB.best) {
      const combinedAlts = [...matchA.alternatives.slice(0, 3), ...matchB.alternatives.slice(0, 3)];
      return formatTwoPersonKinshipResponse(query, matchA.best, matchB.best, people, combinedAlts, isPrivacyRestricted);
    }
  }

  // 3. Check if the user is asking about general family tree history / founders / branches
  const isGeneralTreeQuestion =
    (normQ.includes('شجره') || normQ.includes('عائله') || normQ.includes('فروع') || normQ.includes('الشيخ علي') || normQ.includes('كم عدد')) &&
    !cleanNameSegment(query);

  if (isGeneralTreeQuestion) {
    const spoken = `شجرة عائلة الفردان الكرزكاني هي شجرة نسب موثقة ومحققة عبر ${registry.stats.totalGenerations} أجيال متعاقبة، وتضم حالياً ${registry.stats.totalCount} اسماً من الذكور والإناث. تبدأ الشجرة من الجد الأكبر الشيخ علي الكرزكاني، فالجد يوسف، فالجد عبد الحسين الذي يتفرع عقبه إلى فرعين تأسيسيين: الأول هو الجد الفردان بن عبد الحسين ويتفرع منه ابنان هما الجد محمد والجد حسين وذريتهما، والثاني هو الجد أيوب بن عبد الحسين والد الجد فردان الذي يتفرع منه الجد عبدالله وذريته.`;
    return {
      query,
      queryType: 'family_overview',
      title: 'نبذة تأصيلية شاملة عن شجرة عائلة الفردان الكرزكاني',
      spokenText: spoken,
      sections: [
        {
          heading: '١. الجذور التاريخية والجد الأكبر الجامع',
          content: `تجمع الشجرة المباركة ذرية عائلة الفردان الكرزكاني ابتداءً من الجد الأكبر «الشيخ علي الكرزكاني»، ومنه ابنه «يوسف»، ومنه «عبد الحسين بن يوسف بن الشيخ علي» الذي يتفرع عقبه إلى:\n• الفرع التأسيسي الأول: «الفردان بن عبد الحسين» (ويتفرع منه ابنان هما: الجد محمد والجد حسين وذريتهما).\n• الفرع التأسيسي الثاني: «أيوب بن عبد الحسين» (والد الجد فردان الذي يتفرع منه الجد عبدالله وذريته).`,
          badge: 'الأصول التاريخية',
          tone: 'emerald'
        },
        {
          heading: '٢. الإحصائيات الموثقة في قاعدة البيانات',
          content: `• إجمالي عدد أفراد الشجرة المسجلين: ${registry.stats.totalCount} اسماً.\n• عدد الأجيال المتعاقبة: ${registry.stats.totalGenerations} جيلاً.\n• الذكور: ${registry.stats.maleCount} | الإناث: ${registry.stats.femaleCount}.`,
          badge: `${registry.stats.totalCount} فرداً`,
          tone: 'amber'
        }
      ]
    };
  }

  // 4. Single Person Deep Profile Analysis (Lineage, Grandmothers, Uncles, Maternal Uncles, Spouses, Children)
  const singleMatch = matchPersonFromText(query, people, isPrivacyRestricted);
  if (singleMatch.best) {
    const profile = buildPersonDeepProfile(singleMatch.best.key, people);
    if (profile) {
      return formatDeepProfileResponse(query, profile, people, singleMatch.alternatives, isPrivacyRestricted);
    }
  }

  // 5. Fallback when no specific person name was matched
  const fallbackSpoken =
    'لم أتمكن من مطابقة الاسم المذكور بدقة في قاعدة بيانات الشجرة. يرجى ذكر الاسم مع اسم الأب أو الجد، مثل: محمد بن الفردان، أو عبدالله عبدالكريم حسين، أو استخدام قائمة الاختيار السريع للأسماء.';
  return {
    query,
    queryType: 'not_found',
    title: 'يرجى توضيح الاسم أو اختيار الفرد من القائمة المساعدة',
    spokenText: fallbackSpoken,
    sections: [
      {
        heading: 'إرشادات الاستعلام الدقيق في المستشار الذكي',
        content: `للحصول على أدق تحليل للنسب والجدات والأعمام والأخوال والمصاهرات، يمكنك طرح سؤالك بإحدى الصيغ التالية:\n• لمعرفة صلة القرابة بين شخصين: «ما صلة القرابة بين محمد بن محسن و علي بن فردان؟»\n• لمعرفة النسب الكامل والأعمام والأخوال والجدات: «ما هو نسب وأخوال وأعمام محفوظ بن محسن؟»\n• كما يمكنك اختيار الفرد الأول أو الثاني مباشرةً من أزرار الاختيار السريع أدناه.`,
        badge: 'تلميح ذكي',
        tone: 'amber'
      }
    ]
  };
}
