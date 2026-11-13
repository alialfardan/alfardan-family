import { ProcessedPerson, MotherInfo, SpouseInfo } from '../types/family';
import { normalizeArabic } from './treeManager';

export interface KinshipPathNode {
  key?: string;
  displayName: string;
  roleLabel: string;
  generation?: number;
  gender: 'm' | 'f';
  isHighlight?: boolean;
  isEndpointA?: boolean;
  isEndpointB?: boolean;
  isMaskedFemale?: boolean;
}

export interface KinshipVisualPath {
  id: string;
  title: string;
  badge?: string;
  nodes: KinshipPathNode[];
}

export interface GrandmotherRecord {
  id: string;
  roleLabel: string;
  throughAncestor: ProcessedPerson;
  throughDistance: number;
  side: 'paternal' | 'maternal';
  motherInfo: MotherInfo;
  person: ProcessedPerson | null;
  fatherPerson: ProcessedPerson | null;
  displayName: string;
  lineageSummary: string;
}

export interface CrossOrGrandmotherLink {
  id: string;
  category: 'paternal_to_maternal' | 'maternal_to_paternal' | 'shared_grandmother' | 'related_grandmothers' | 'grandmother_to_grandfather';
  title: string;
  badge: string;
  partyABadge: string; // e.g., "أب حسن (محمد)"
  connector: '⬅' | '🤝';
  partyBBadge: string; // e.g., "أم علي (فاطمة)"
  commonAncestor: ProcessedPerson | null;
  conciseBullet: string;
  narrative: string;
  fullChainText: string;
  visualPath: KinshipVisualPath;
}

export interface CrossAndGrandmothersKinship {
  hasCrossOrGrandmotherRelation: boolean;
  summaryTitle: string;
  summaryExplanation: string;
  paternalAToMaternalB: CrossOrGrandmotherLink | null;
  maternalAToPaternalB: CrossOrGrandmotherLink | null;
  grandmotherLinks: CrossOrGrandmotherLink[];
  grandmothersA: GrandmotherRecord[];
  grandmothersB: GrandmotherRecord[];
}

export interface PaternalDetailedAnalysis {
  partyABadge: string; // e.g., "أب حسن (محمد)"
  partyBBadge: string; // e.g., "أب علي (إبراهيم)"
  commonAncestorConciseLine: string;
  commonAncestorNarrative: string;
  branchingPoint: {
    ancestor: ProcessedPerson;
    sonA: ProcessedPerson;
    sonB: ProcessedPerson;
    sonADisplayName: string;
    sonBDisplayName: string;
  } | null;
  branchingPointConciseLine: string;
  branchingPointNarrative: string;
  unclesAndGrandfathersNarrative: string;
  fullChainUpA: string;
  fullChainDownB: string;
  fullChainNarrative: string;
  visualPath: KinshipVisualPath;
}

export interface MaternalPartyConciseCard {
  nameDisplay: string;
  shortLineage: string;
  grandmotherName: string;
  originBadge: string;
  personKey?: string;
}

export interface MaternalKinship {
  hasMaternalRelation: boolean;
  personAMother: MotherInfo | null;
  personBMother: MotherInfo | null;
  motherPersonA: ProcessedPerson | null;
  motherPersonB: ProcessedPerson | null;
  motherADisplayName: string;
  motherBDisplayName: string;
  partyABadge: string; // e.g., "أم حسن (فاطمة)"
  partyBBadge: string; // e.g., "أم علي (زينب)"
  motherAConcise: MaternalPartyConciseCard | null;
  motherBConcise: MaternalPartyConciseCard | null;
  motherALineageSummary: string;
  motherBLineageSummary: string;
  maternalTitle: string;
  maternalConciseSummary: string;
  maternalExplanation: string;
  detailedNarrativeParagraphs: string[];
  maternalCommonAncestor: ProcessedPerson | null;
  maternalBranchingPoint: {
    ancestor: ProcessedPerson;
    branchA: ProcessedPerson;
    branchB: ProcessedPerson;
  } | null;
  maternalPathA: ProcessedPerson[];
  maternalPathB: ProcessedPerson[];
  maternalLineageChain: ProcessedPerson[];
  maternalDistanceA: number;
  maternalDistanceB: number;
  visualPath: KinshipVisualPath | null;
}

export interface InLawBulletCard {
  id: string;
  partyABadge: string;
  connector: '⬅' | '🤝';
  partyBBadge: string;
  text: string;
}

export interface InLawDetail {
  spouse: SpouseInfo;
  wifePerson?: ProcessedPerson | null;
  spouseDisplayName: string;
  relationType:
    | 'direct_marriage'
    | 'wife_is_daughter'
    | 'wife_is_sister'
    | 'wife_is_aunt'
    | 'wife_is_cousin'
    | 'sister_in_law'
    | 'children_intermarriage'
    | 'siblings_intermarriage'
    | 'external_family'
    | 'other';
  title: string;
  explanation: string;
  visualPath?: KinshipVisualPath;
}

export interface InLawKinship {
  hasInLawRelation: boolean;
  isDirectSpouse: boolean;
  spousalTitle: string;
  spousalExplanation: string;
  conciseBullets: string[];
  bulletCards: InLawBulletCard[];
  detailedNarratives: string[];
  inLawsA: InLawDetail[];
  inLawsB: InLawDetail[];
  areBrothersInLaw: boolean;
  brotherInLawExplanation?: string;
  visualPaths: KinshipVisualPath[];
}

export interface KinshipResult {
  personA: ProcessedPerson;
  personB: ProcessedPerson;
  personADisplayName: string;
  personBDisplayName: string;
  commonAncestor: ProcessedPerson | null;
  relationshipTitle: string;
  relationshipType: 'self' | 'ancestor' | 'descendant' | 'sibling' | 'uncle_aunt' | 'nephew_niece' | 'cousin' | 'distant';
  narrativeExplanation: string;
  executiveSummary: string;
  paternalAnalysis: PaternalDetailedAnalysis;
  distanceA: number;
  distanceB: number;
  generationDiff: number;
  pathFromAToAncestor: ProcessedPerson[];
  pathFromBToAncestor: ProcessedPerson[];
  fullLineageChain: ProcessedPerson[];
  isSameBranch: boolean;
  branchNameA: string;
  branchNameB: string;

  maternalKinship: MaternalKinship;
  crossAndGrandmothersKinship: CrossAndGrandmothersKinship;
  inLawKinship: InLawKinship;
  isPrivacyRestricted: boolean;
}

/**
 * Formats a person's name according to Privacy Mode rules:
 * In full family mode (!isPrivacyRestricted): returns explicit name.
 * In visitor mode (isPrivacyRestricted): males keep explicit name; females become «كريمة [اسم والدها]».
 */
export function formatPersonDisplayName(
  person: ProcessedPerson | null | undefined,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): string {
  if (!person) return 'غير محدد';
  if (!isPrivacyRestricted || person.gender !== 'f') {
    return person.name;
  }
  if (person.parentKey && people.has(person.parentKey)) {
    const father = people.get(person.parentKey)!;
    const grandpa = father.parentKey ? people.get(father.parentKey) : null;
    if (grandpa && !father.name.includes('بن ')) {
      return `كريمة ${father.name} بن ${grandpa.name}`;
    }
    return `كريمة ${father.name}`;
  }
  if (person.name.includes('بنت ')) {
    const afterBint = person.name.split('بنت ')[1]?.trim();
    if (afterBint) return `كريمة ${afterBint}`;
  }
  return 'كريمة من آل فردان';
}

/**
 * Returns distinct display names for Person A and Person B so that if both share the same first name
 * (e.g. both named "علي"), their father's name is appended ("علي بن حسن" vs "علي بن محمد").
 */
export function getDistinctPairNames(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): { nameA: string; nameB: string } {
  let nameA = formatPersonDisplayName(personA, people, isPrivacyRestricted);
  let nameB = formatPersonDisplayName(personB, people, isPrivacyRestricted);

  if (personA.key !== personB.key && nameA === nameB) {
    const fatherA = personA.parentKey ? people.get(personA.parentKey) : null;
    const fatherB = personB.parentKey ? people.get(personB.parentKey) : null;
    const connA = personA.gender === 'f' ? 'بنت' : 'بن';
    const connB = personB.gender === 'f' ? 'بنت' : 'بن';
    if (fatherA && !nameA.includes(' بن ') && !nameA.includes(' بنت ')) {
      nameA = `${nameA} ${connA} ${formatPersonDisplayName(fatherA, people, isPrivacyRestricted)}`;
    }
    if (fatherB && !nameB.includes(' بن ') && !nameB.includes(' بنت ')) {
      nameB = `${nameB} ${connB} ${formatPersonDisplayName(fatherB, people, isPrivacyRestricted)}`;
    }
  }

  return { nameA, nameB };
}

/**
 * Formats a MotherInfo or SpouseInfo name according to Privacy Mode rules.
 */
export function formatFemaleInfoDisplayName(
  info: MotherInfo | SpouseInfo | null | undefined,
  linkedPerson: ProcessedPerson | null | undefined,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): string {
  if (linkedPerson) {
    return formatPersonDisplayName(linkedPerson, people, isPrivacyRestricted);
  }
  if (!info || !info.name) return 'غير مسجلة';
  if (!isPrivacyRestricted) return info.name;

  if (info.name.includes('بنت ')) {
    const afterBint = info.name.split('بنت ')[1]?.trim();
    if (afterBint) return `كريمة ${afterBint}`;
  }
  if (info.name.includes('كريمة ')) {
    return info.name;
  }
  if (info.familyOrigin && info.familyOrigin.trim() && info.familyOrigin.trim() !== 'عائلة الفردان') {
    return `كريمة من ${info.familyOrigin.trim()}`;
  }
  if (info.isFromFamily) {
    return 'كريمة من آل فردان';
  }
  return 'كريمة (محفوظة للخصوصية)';
}

/**
 * Resolves a MotherInfo to a ProcessedPerson in the tree if possible.
 */
export function resolveMotherPerson(
  mother: MotherInfo | null | undefined,
  father: ProcessedPerson | null | undefined,
  people: Map<string, ProcessedPerson>
): ProcessedPerson | null {
  if (!mother || !mother.name) return null;
  if (mother.personKey && people.has(mother.personKey)) {
    const p = people.get(mother.personKey)!;
    if (!p.deleted) return p;
  }
  const normMotherName = normalizeArabic(mother.name);
  if (!normMotherName) return null;

  if (father?.spouses) {
    for (const sp of father.spouses) {
      if (sp.personKey && people.has(sp.personKey) && normalizeArabic(sp.name) === normMotherName) {
        const p = people.get(sp.personKey)!;
        if (!p.deleted) return p;
      }
    }
  }

  if (mother.isFromFamily) {
    const candidates: ProcessedPerson[] = [];
    people.forEach(cand => {
      if (!cand.deleted && cand.gender === 'f' && normalizeArabic(cand.name) === normMotherName) {
        candidates.push(cand);
      }
    });
    if (candidates.length === 1) {
      return candidates[0];
    }
  }

  return null;
}

/**
 * Formats an Arabic generation count phrase (e.g., "جيل واحد", "جيلين", "3 أجيال").
 */
export function formatGenerationsCount(count: number): string {
  const n = Math.abs(count);
  if (n === 0) return 'نفس الجيل';
  if (n === 1) return 'جيل واحد';
  if (n === 2) return 'جيلين';
  if (n >= 3 && n <= 10) return `${n} أجيال`;
  return `${n} جيلاً`;
}

/**
 * Builds a patronymic lineage string (بن / بنت) from a path [person, parent, grandparent, ...].
 */
export function formatPatronymicChain(
  path: ProcessedPerson[],
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): string {
  if (!path || path.length === 0) return '';
  return path
    .map((p, idx) => {
      const disp = formatPersonDisplayName(p, people, isPrivacyRestricted);
      if (idx === 0) return disp;
      const prev = path[idx - 1];
      const connector = prev.gender === 'f' ? 'بنت' : 'بن';
      return `${connector} ${disp}`;
    })
    .join(' ');
}

/**
 * Calculates ancestors chain from a person up to the root.
 * Returns array starting with the person: [person, parent, grandparent, ..., root]
 */
export function getAncestorsPath(
  personKey: string,
  people: Map<string, ProcessedPerson>
): ProcessedPerson[] {
  const path: ProcessedPerson[] = [];
  const visited = new Set<string>();
  let cur: ProcessedPerson | undefined = people.get(personKey);

  while (cur && !visited.has(cur.key)) {
    path.push(cur);
    visited.add(cur.key);
    if (!cur.parentKey) break;
    cur = people.get(cur.parentKey);
  }

  return path;
}

/**
 * Finds lowest common ancestor between two person keys
 */
export function findLowestCommonAncestor(
  key1: string,
  key2: string,
  people: Map<string, ProcessedPerson>
): { ancestor: ProcessedPerson | null; distance1: number; distance2: number; path1: ProcessedPerson[]; path2: ProcessedPerson[] } {
  const path1 = getAncestorsPath(key1, people);
  const path2 = getAncestorsPath(key2, people);

  const map2 = new Map<string, number>();
  path2.forEach((p, idx) => map2.set(p.key, idx));

  for (let i = 0; i < path1.length; i++) {
    const key = path1[i].key;
    if (map2.has(key)) {
      return {
        ancestor: path1[i],
        distance1: i,
        distance2: map2.get(key)!,
        path1: path1.slice(0, i + 1),
        path2: path2.slice(0, map2.get(key)! + 1)
      };
    }
  }

  return { ancestor: null, distance1: -1, distance2: -1, path1, path2 };
}

/**
 * Helper to create a KinshipPathNode from a ProcessedPerson
 */
function makePersonPathNode(
  person: ProcessedPerson,
  roleLabel: string,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean,
  opts?: { isHighlight?: boolean; isEndpointA?: boolean; isEndpointB?: boolean; customDisplayName?: string }
): KinshipPathNode {
  const isMasked = isPrivacyRestricted && person.gender === 'f';
  return {
    key: isMasked ? undefined : person.key,
    displayName: opts?.customDisplayName || formatPersonDisplayName(person, people, isPrivacyRestricted),
    roleLabel,
    generation: person.generation,
    gender: person.gender,
    isHighlight: opts?.isHighlight,
    isEndpointA: opts?.isEndpointA,
    isEndpointB: opts?.isEndpointB,
    isMaskedFemale: isMasked
  };
}

/**
 * Builds a complete visual path from Path1 (ending at LCA) and Path2 (ending at LCA) using actual names instead of الأول/الثاني
 */
function buildVisualPathBetweenLineages(
  id: string,
  title: string,
  path1ToLca: ProcessedPerson[],
  path2ToLca: ProcessedPerson[],
  nameA: string,
  nameB: string,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean,
  opts?: {
    badge?: string;
    prefixNodesA?: KinshipPathNode[];
    suffixNodesB?: KinshipPathNode[];
    lcaRoleLabel?: string;
  }
): KinshipVisualPath {
  const nodes: KinshipPathNode[] = [];
  if (opts?.prefixNodesA && opts.prefixNodesA.length > 0) {
    nodes.push(...opts.prefixNodesA);
  }

  const lca = path1ToLca[path1ToLca.length - 1];
  const dist1 = path1ToLca.length - 1;
  const dist2 = path2ToLca.length - 1;

  for (let i = 0; i < path1ToLca.length - 1; i++) {
    const p = path1ToLca[i];
    const isFirstOverall = i === 0 && (!opts?.prefixNodesA || opts.prefixNodesA.length === 0);
    let role = `جد ${nameA}`;
    if (isFirstOverall) {
      role = nameA;
    } else if (i === 1 && (!opts?.prefixNodesA || opts.prefixNodesA.length === 0)) {
      role = p.gender === 'f' ? `والدة ${nameA}` : `والد ${nameA}`;
    } else if (i === path1ToLca.length - 2 && dist1 >= 2 && dist2 >= 1) {
      role = p.gender === 'f' ? `بنت الجد المشترك` : `ابن الجد المشترك (فرع ${nameA})`;
    }
    nodes.push(
      makePersonPathNode(p, role, people, isPrivacyRestricted, {
        isEndpointA: isFirstOverall,
        customDisplayName: isFirstOverall ? nameA : undefined
      })
    );
  }

  if (lca) {
    const isA = dist1 === 0 && (!opts?.prefixNodesA || opts.prefixNodesA.length === 0);
    const isB = dist2 === 0 && (!opts?.suffixNodesB || opts.suffixNodesB.length === 0);
    nodes.push(
      makePersonPathNode(
        lca,
        opts?.lcaRoleLabel || (isA ? `${nameA} (الجد الجامع)` : isB ? `${nameB} (الجد الجامع)` : 'الجد المشترك'),
        people,
        isPrivacyRestricted,
        {
          isHighlight: true,
          isEndpointA: isA,
          isEndpointB: isB
        }
      )
    );
  }

  for (let j = path2ToLca.length - 2; j >= 0; j--) {
    const p = path2ToLca[j];
    const isLastOverall = j === 0 && (!opts?.suffixNodesB || opts.suffixNodesB.length === 0);
    let role = `جد ${nameB}`;
    if (isLastOverall) {
      role = nameB;
    } else if (j === path2ToLca.length - 2 && dist1 >= 1 && dist2 >= 2) {
      role = p.gender === 'f' ? `بنت الجد المشترك` : `ابن الجد المشترك (فرع ${nameB})`;
    } else if (j === 1 && (!opts?.suffixNodesB || opts.suffixNodesB.length === 0)) {
      role = p.gender === 'f' ? `والدة ${nameB}` : `والد ${nameB}`;
    }
    nodes.push(
      makePersonPathNode(p, role, people, isPrivacyRestricted, {
        isEndpointB: isLastOverall,
        customDisplayName: isLastOverall ? nameB : undefined
      })
    );
  }

  if (opts?.suffixNodesB && opts.suffixNodesB.length > 0) {
    nodes.push(...opts.suffixNodesB);
  }

  return {
    id,
    title,
    badge: opts?.badge,
    nodes
  };
}

/**
 * Builds a concise Mother Card
 */
function buildMotherConciseCard(
  motherInfo: MotherInfo | null,
  motherPerson: ProcessedPerson | null,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean
): MaternalPartyConciseCard | null {
  if (!motherInfo || !motherInfo.name) return null;

  const nameDisplay = formatFemaleInfoDisplayName(motherInfo, motherPerson, people, isPrivacyRestricted);
  const originBadge = motherInfo.isFromFamily
    ? 'من آل فردان'
    : motherInfo.familyOrigin || 'خارج العائلة';

  let shortLineage = 'غير مسجل';
  let grandmotherName = 'غير مسجلة';

  if (motherPerson) {
    const ancPath = getAncestorsPath(motherPerson.key, people);
    if (ancPath.length > 1) {
      const fatherChain = formatPatronymicChain(ancPath.slice(1, 4), people, isPrivacyRestricted);
      shortLineage = `بنت ${fatherChain}`;
    } else {
      shortLineage = originBadge;
    }

    const fatherOfMother = ancPath[1] || null;
    const gmInfo = motherPerson.mother || null;
    const gmPerson = resolveMotherPerson(gmInfo, fatherOfMother, people);
    if (gmInfo && gmInfo.name) {
      grandmotherName = formatFemaleInfoDisplayName(gmInfo, gmPerson, people, isPrivacyRestricted);
      if (gmInfo.familyOrigin && !gmInfo.isFromFamily) {
        grandmotherName += ` (${gmInfo.familyOrigin})`;
      }
    }
  } else {
    if (motherInfo.name.includes('بنت ')) {
      const afterBint = motherInfo.name.split('بنت ')[1]?.trim();
      if (afterBint) shortLineage = `بنت ${afterBint}`;
    } else {
      shortLineage = originBadge;
    }
  }

  return {
    nameDisplay,
    shortLineage,
    grandmotherName,
    originBadge,
    personKey: !isPrivacyRestricted && motherPerson ? motherPerson.key : undefined
  };
}

/**
 * Analyzes maternal relationships (أم ⬅ أم) between Person A and Person B using real names
 */
export function analyzeMaternalKinship(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): MaternalKinship {
  const fatherA = personA.parentKey ? people.get(personA.parentKey) || null : null;
  const fatherB = personB.parentKey ? people.get(personB.parentKey) || null : null;

  const motherA: MotherInfo | null = personA.mother || null;
  const motherB: MotherInfo | null = personB.mother || null;

  const motherPersonA = resolveMotherPerson(motherA, fatherA, people);
  const motherPersonB = resolveMotherPerson(motherB, fatherB, people);

  const { nameA, nameB } = getDistinctPairNames(personA, personB, people, isPrivacyRestricted);
  const motherADisplayName = formatFemaleInfoDisplayName(motherA, motherPersonA, people, isPrivacyRestricted);
  const motherBDisplayName = formatFemaleInfoDisplayName(motherB, motherPersonB, people, isPrivacyRestricted);

  const partyABadge = `أم ${nameA} (${motherADisplayName})`;
  const partyBBadge = `أم ${nameB} (${motherBDisplayName})`;

  const motherAConcise = buildMotherConciseCard(motherA, motherPersonA, people, isPrivacyRestricted);
  const motherBConcise = buildMotherConciseCard(motherB, motherPersonB, people, isPrivacyRestricted);

  const motherALineageSummary = motherAConcise
    ? `${motherAConcise.nameDisplay} (${motherAConcise.shortLineage}) — والدتها: ${motherAConcise.grandmotherName}`
    : `لم يتم توثيق اسم والدة «${nameA}» بعد.`;
  const motherBLineageSummary = motherBConcise
    ? `${motherBConcise.nameDisplay} (${motherBConcise.shortLineage}) — والدتها: ${motherBConcise.grandmotherName}`
    : `لم يتم توثيق اسم والدة «${nameB}» بعد.`;

  let hasMaternalRelation = false;
  let maternalTitle = '';
  let maternalConciseSummary = '';
  let maternalExplanation = '';
  let maternalCommonAncestor: ProcessedPerson | null = null;
  let maternalBranchingPoint: MaternalKinship['maternalBranchingPoint'] = null;
  let maternalPathA: ProcessedPerson[] = [];
  let maternalPathB: ProcessedPerson[] = [];
  let maternalDistanceA = -1;
  let maternalDistanceB = -1;
  let visualPath: KinshipVisualPath | null = null;

  // 1. Direct motherhood: Person B is Person A's Mother
  if (motherPersonA && motherPersonA.key === personB.key) {
    hasMaternalRelation = true;
    maternalTitle = `الوالدة المباشرة (أم ${nameA})`;
    maternalConciseSummary = `«${nameB}» هي الوالدة المباشرة لـ «${nameA}».`;
    maternalExplanation = maternalConciseSummary;
    maternalCommonAncestor = motherPersonA;
    maternalPathA = [personA, motherPersonA];
    maternalPathB = [personB];
    maternalDistanceA = 1;
    maternalDistanceB = 0;
  }
  // 2. Direct motherhood: Person A is Person B's Mother
  else if (motherPersonB && motherPersonB.key === personA.key) {
    hasMaternalRelation = true;
    maternalTitle = `أمومة مباشرة (${nameA} والدة ${nameB})`;
    maternalConciseSummary = `«${nameA}» هي الوالدة المباشرة لـ «${nameB}».`;
    maternalExplanation = maternalConciseSummary;
    maternalCommonAncestor = motherPersonB;
    maternalPathA = [personA];
    maternalPathB = [personB, motherPersonB];
    maternalDistanceA = 0;
    maternalDistanceB = 1;
  }
  // 3. Both parties have mothers linked in the family tree (أم ⬅ أم)
  else if (motherPersonA && motherPersonB) {
    // 3a. Same exact mother
    if (motherPersonA.key === motherPersonB.key) {
      hasMaternalRelation = true;
      const isFullSiblings = personA.parentKey && personA.parentKey === personB.parentKey;
      maternalTitle = isFullSiblings ? 'إخوة أشقاء (من نفس الأم والأب)' : 'إخوة لأم (يجتمعان في نفس الوالدة)';
      maternalConciseSummary = `يجتمع «${nameA}» و«${nameB}» في نفس الوالدة «${motherADisplayName}» (${maternalTitle}).`;
      maternalExplanation = maternalConciseSummary;
      maternalCommonAncestor = motherPersonA;
      maternalPathA = [personA, motherPersonA];
      maternalPathB = [personB, motherPersonB];
      maternalDistanceA = 1;
      maternalDistanceB = 1;
    }
    // 3b. Mothers are sisters (same father)
    else if (motherPersonA.parentKey && motherPersonA.parentKey === motherPersonB.parentKey) {
      hasMaternalRelation = true;
      const maternalGrandpa = people.get(motherPersonA.parentKey)!;
      const grandpaDisp = formatPersonDisplayName(maternalGrandpa, people, isPrivacyRestricted);
      maternalTitle = 'أبناء خالة مباشرون (الأمهات شقيقات)';
      maternalConciseSummary = `والدة «${nameA}» («${motherADisplayName}») ووالدة «${nameB}» («${motherBDisplayName}») شقيقتان تجتمعان في والدهما الجد «${grandpaDisp}» (الجيل ${maternalGrandpa.generation}) — فـ «${nameA}» و«${nameB}» أبناء خالة مباشرين.`;
      maternalExplanation = maternalConciseSummary;
      maternalCommonAncestor = maternalGrandpa;
      maternalBranchingPoint = {
        ancestor: maternalGrandpa,
        branchA: motherPersonA,
        branchB: motherPersonB
      };
      maternalPathA = [personA, motherPersonA, maternalGrandpa];
      maternalPathB = [personB, motherPersonB, maternalGrandpa];
      maternalDistanceA = 2;
      maternalDistanceB = 2;
    }
    // 3c. Mothers are maternal half-sisters (same mother)
    else if (
      motherPersonA.mother?.name &&
      motherPersonB.mother?.name &&
      ((motherPersonA.mother.personKey && motherPersonA.mother.personKey === motherPersonB.mother.personKey) ||
        normalizeArabic(motherPersonA.mother.name) === normalizeArabic(motherPersonB.mother.name))
    ) {
      hasMaternalRelation = true;
      const sharedGmPerson = resolveMotherPerson(motherPersonA.mother, null, people);
      const sharedGmDisp = formatFemaleInfoDisplayName(motherPersonA.mother, sharedGmPerson, people, isPrivacyRestricted);
      maternalTitle = 'أبناء خالة لأم (الأمهات أختان من أم واحدة)';
      maternalConciseSummary = `والدة «${nameA}» («${motherADisplayName}») ووالدة «${nameB}» («${motherBDisplayName}») أختان لأم تجتمعان في والدتهما الجدة «${sharedGmDisp}» — فـ «${nameA}» و«${nameB}» أبناء خالة.`;
      maternalExplanation = maternalConciseSummary;
      maternalCommonAncestor = sharedGmPerson;
      maternalDistanceA = 2;
      maternalDistanceB = 2;
    }
    // 3d. Mothers meet at a common ancestor in their paternal lineages
    else {
      const lcaMothers = findLowestCommonAncestor(motherPersonA.key, motherPersonB.key, people);
      if (lcaMothers.ancestor) {
        hasMaternalRelation = true;
        const anc = lcaMothers.ancestor;
        const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
        const d1 = lcaMothers.distance1;
        const d2 = lcaMothers.distance2;

        maternalCommonAncestor = anc;
        maternalPathA = [personA, ...lcaMothers.path1];
        maternalPathB = [personB, ...lcaMothers.path2];
        maternalDistanceA = d1 + 1;
        maternalDistanceB = d2 + 1;

        const branchA = d1 >= 1 ? lcaMothers.path1[lcaMothers.path1.length - 2] : motherPersonA;
        const branchB = d2 >= 1 ? lcaMothers.path2[lcaMothers.path2.length - 2] : motherPersonB;

        if (d1 >= 1 && d2 >= 1 && branchA.key !== branchB.key) {
          maternalBranchingPoint = {
            ancestor: anc,
            branchA,
            branchB
          };
        }

        const branchADisp = formatPersonDisplayName(branchA, people, isPrivacyRestricted);
        const branchBDisp = formatPersonDisplayName(branchB, people, isPrivacyRestricted);

        if (d1 === 2 && d2 === 2) {
          maternalTitle = 'الأمهات بنات عم مباشرات (الدرجة الأولى)';
          maternalConciseSummary = `والدة «${nameA}» («${motherADisplayName}») ووالدة «${nameB}» («${motherBDisplayName}») ابنتا عم مباشرتان تجتمعان في الجد «${ancDisp}» (الجيل ${anc.generation}) عبر الأخوين «${branchADisp}» و«${branchBDisp}».`;
        } else if (d1 === 1 && d2 === 2) {
          maternalTitle = `والدة ${nameA} عمة مباشرة لوالدة ${nameB}`;
          maternalConciseSummary = `والدة «${nameA}» («${motherADisplayName}») هي عمة مباشرة لوالدة «${nameB}» («${motherBDisplayName}»)، وتجتمعان في الجد «${ancDisp}».`;
        } else if (d1 === 2 && d2 === 1) {
          maternalTitle = `والدة ${nameB} عمة مباشرة لوالدة ${nameA}`;
          maternalConciseSummary = `والدة «${nameB}» («${motherBDisplayName}») هي عمة مباشرة لوالدة «${nameA}» («${motherADisplayName}»)، وتجتمعان في الجد «${ancDisp}».`;
        } else if (d1 === d2) {
          const deg = d1 - 1;
          maternalTitle = `الأمهات بنات عمومة (الدرجة ${deg})`;
          maternalConciseSummary = `تلتقي والدة «${nameA}» («${motherADisplayName}») مع والدة «${nameB}» («${motherBDisplayName}») في الجد المشترك «${ancDisp}» (الجيل ${anc.generation}) عبر الأخوين «${branchADisp}» و«${branchBDisp}» (درجة عمومة الأمهات: الدرجة ${deg}).`;
        } else {
          maternalTitle = `تلتقي الأمهات في الجد «${ancDisp}»`;
          maternalConciseSummary = `تلتقي والدة «${nameA}» («${motherADisplayName}») مع والدة «${nameB}» («${motherBDisplayName}») في الجد المشترك «${ancDisp}» (الجيل ${anc.generation}) عبر الأخوين «${branchADisp}» و«${branchBDisp}» (يبعد ${formatGenerationsCount(d1)} عن والدة «${nameA}» و${formatGenerationsCount(d2)} عن والدة «${nameB}»).`;
        }

        maternalExplanation = maternalConciseSummary;

        visualPath = buildVisualPathBetweenLineages(
          'mat-lca-path',
          `مسار التقاء نسب والدة ${nameA} ووالدة ${nameB}`,
          lcaMothers.path1,
          lcaMothers.path2,
          `والدة ${nameA}`,
          `والدة ${nameB}`,
          people,
          isPrivacyRestricted,
          {
            badge: maternalTitle,
            prefixNodesA: [makePersonPathNode(personA, nameA, people, isPrivacyRestricted, { isEndpointA: true, customDisplayName: nameA })],
            suffixNodesB: [makePersonPathNode(personB, nameB, people, isPrivacyRestricted, { isEndpointB: true, customDisplayName: nameB })],
            lcaRoleLabel: 'الجد المشترك للأمهات'
          }
        );
      }
    }
  }
  // 4. Both mothers are from the same external family origin
  else if (motherA?.familyOrigin && motherB?.familyOrigin) {
    const origA = motherA.familyOrigin.trim();
    const origB = motherB.familyOrigin.trim();
    if (origA && origB && normalizeArabic(origA) === normalizeArabic(origB)) {
      hasMaternalRelation = true;
      maternalTitle = `أخوال من نفس العائلة (${origA})`;
      maternalConciseSummary = `تجتمع والدة «${nameA}» ووالدة «${nameB}» في انتمائهما لنفس الأسرة الكريمة: «${origA}».`;
      maternalExplanation = maternalConciseSummary;
    }
  }

  if (!hasMaternalRelation) {
    if (motherA && motherB) {
      maternalConciseSummary = `لا يوجد التقاء مباشر مسجل بين عمود نسب والدة «${nameA}» ووالدة «${nameB}» في البيانات الحالية.`;
    } else {
      maternalConciseSummary = `لم يتم توثيق بيانات والدة «${nameA}» ووالدة «${nameB}» بالكامل لفحص نقطة الالتقاء بينهما.`;
    }
  }

  const detailedNarrativeParagraphs = [
    `والدة ${nameA}: ${motherALineageSummary}`,
    `والدة ${nameB}: ${motherBLineageSummary}`,
    `خلاصة قرابة الأمهات: ${maternalConciseSummary}`
  ];

  const maternalLineageChain: ProcessedPerson[] = [
    ...maternalPathA,
    ...maternalPathB.slice(0, -1).reverse()
  ];

  return {
    hasMaternalRelation,
    personAMother: motherA,
    personBMother: motherB,
    motherPersonA,
    motherPersonB,
    motherADisplayName,
    motherBDisplayName,
    partyABadge,
    partyBBadge,
    motherAConcise,
    motherBConcise,
    motherALineageSummary,
    motherBLineageSummary,
    maternalTitle,
    maternalConciseSummary,
    maternalExplanation,
    detailedNarrativeParagraphs,
    maternalCommonAncestor,
    maternalBranchingPoint,
    maternalPathA,
    maternalPathB,
    maternalLineageChain,
    maternalDistanceA,
    maternalDistanceB,
    visualPath
  };
}

/**
 * Collects all documented grandmothers for a person
 */
export function collectPersonGrandmothers(
  person: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): GrandmotherRecord[] {
  const records: GrandmotherRecord[] = [];
  const seenKeysOrNames = new Set<string>();

  const addGm = (
    roleLabel: string,
    throughAncestor: ProcessedPerson,
    throughDistance: number,
    side: 'paternal' | 'maternal',
    motherInfo: MotherInfo | null | undefined
  ) => {
    if (!motherInfo || !motherInfo.name || !motherInfo.name.trim()) return;
    const throughParent = throughAncestor.parentKey ? people.get(throughAncestor.parentKey) || null : null;
    const gmPerson = resolveMotherPerson(motherInfo, throughParent, people);
    const dedupId = gmPerson ? `key:${gmPerson.key}` : `name:${throughAncestor.key}:${normalizeArabic(motherInfo.name)}`;
    if (seenKeysOrNames.has(dedupId)) return;
    seenKeysOrNames.add(dedupId);

    const fatherPerson = gmPerson?.parentKey ? people.get(gmPerson.parentKey) || null : null;
    const displayName = formatFemaleInfoDisplayName(motherInfo, gmPerson, people, isPrivacyRestricted);

    let lineageSummary = `«${displayName}»`;
    if (gmPerson && fatherPerson) {
      const fatherChain = formatPatronymicChain(getAncestorsPath(fatherPerson.key, people).slice(0, 3), people, isPrivacyRestricted);
      lineageSummary += ` (بنت ${fatherChain})`;
    } else if (motherInfo.isFromFamily) {
      lineageSummary += ' (من آل فردان)';
    } else if (motherInfo.familyOrigin) {
      lineageSummary += ` (${motherInfo.familyOrigin})`;
    }

    records.push({
      id: `${person.key}_gm_${records.length}`,
      roleLabel,
      throughAncestor,
      throughDistance,
      side,
      motherInfo,
      person: gmPerson,
      fatherPerson,
      displayName,
      lineageSummary
    });
  };

  const patPath = getAncestorsPath(person.key, people);
  for (let i = 1; i < patPath.length; i++) {
    const anc = patPath[i];
    if (!anc.mother || !anc.mother.name) continue;
    const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
    let roleLabel = '';
    if (i === 1) {
      roleLabel = `الجدة لأب (أم الوالد «${ancDisp}»)`;
    } else if (i === 2) {
      roleLabel = `أم الجد لأب (والدة «${ancDisp}»)`;
    } else {
      roleLabel = `والدة الجد («${ancDisp}»)`;
    }
    addGm(roleLabel, anc, i, 'paternal', anc.mother);
  }

  const father = patPath[1] || null;
  const motherPerson = resolveMotherPerson(person.mother, father, people);
  if (motherPerson) {
    const matAncPath = getAncestorsPath(motherPerson.key, people);
    for (let j = 0; j < matAncPath.length; j++) {
      const mAnc = matAncPath[j];
      if (!mAnc.mother || !mAnc.mother.name) continue;
      const mAncDisp = formatPersonDisplayName(mAnc, people, isPrivacyRestricted);
      let roleLabel = '';
      if (j === 0) {
        roleLabel = `الجدة لأم (أم الوالدة «${mAncDisp}»)`;
      } else {
        roleLabel = `أم الجد لأم (والدة «${mAncDisp}»)`;
      }
      addGm(roleLabel, mAnc, j + 1, 'maternal', mAnc.mother);
    }
  }

  return records;
}

/**
 * Section 3: Analyzes Cross-Kinship (أب ⬅ أم / أم ⬅ أب) and Grandmothers (الجدات) using real names and dual badges
 */
export function analyzeCrossAndGrandmothersKinship(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): CrossAndGrandmothersKinship {
  const { nameA, nameB } = getDistinctPairNames(personA, personB, people, isPrivacyRestricted);

  const fatherA = personA.parentKey ? people.get(personA.parentKey) || null : null;
  const fatherB = personB.parentKey ? people.get(personB.parentKey) || null : null;
  const fatherADisp = fatherA ? formatPersonDisplayName(fatherA, people, isPrivacyRestricted) : nameA;
  const fatherBDisp = fatherB ? formatPersonDisplayName(fatherB, people, isPrivacyRestricted) : nameB;

  const motherPersonA = resolveMotherPerson(personA.mother, fatherA, people);
  const motherPersonB = resolveMotherPerson(personB.mother, fatherB, people);

  const motherADisp = formatFemaleInfoDisplayName(personA.mother, motherPersonA, people, isPrivacyRestricted);
  const motherBDisp = formatFemaleInfoDisplayName(personB.mother, motherPersonB, people, isPrivacyRestricted);

  let paternalAToMaternalB: CrossOrGrandmotherLink | null = null;
  let maternalAToPaternalB: CrossOrGrandmotherLink | null = null;
  const grandmotherLinks: CrossOrGrandmotherLink[] = [];

  // 1. Paternal Line of A ⬅ Maternal Line of B (أب [اسم أ] ⬅ أم [اسم ب])
  if (motherPersonB && motherPersonB.key !== personA.key) {
    const lcaAB = findLowestCommonAncestor(personA.key, motherPersonB.key, people);
    if (lcaAB.ancestor) {
      const anc = lcaAB.ancestor;
      const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
      const dA = lcaAB.distance1;
      const dMB = lcaAB.distance2;

      const branchA = dA >= 1 ? lcaAB.path1[lcaAB.path1.length - 2] : personA;
      const branchMB = dMB >= 1 ? lcaAB.path2[lcaAB.path2.length - 2] : motherPersonB;
      const branchADisp = formatPersonDisplayName(branchA, people, isPrivacyRestricted);
      const branchMBDisp = formatPersonDisplayName(branchMB, people, isPrivacyRestricted);

      const partyABadge = fatherA ? `أب ${nameA} (${fatherADisp})` : `نسب ${nameA}`;
      const partyBBadge = `أم ${nameB} (${motherBDisp})`;
      const badge = `${partyABadge} ⬅ ${partyBBadge}`;
      let title = `تقاطع نسب والد ${nameA} مع والدة ${nameB}`;
      let conciseBullet = '';

      if (dA === 0 && dMB === 1) {
        title = `${nameA} هو الجد لأم المباشر لـ ${nameB}`;
        conciseBullet = `«${nameA}» هو والد «${motherBDisp}» (أي الجد المباشر لأم «${nameB}»).`;
      } else if (dA === 1 && dMB === 1) {
        title = personA.gender === 'f' ? `خالة مباشرة لـ ${nameB}` : `خال مباشر لـ ${nameB}`;
        conciseBullet = `«${nameA}» هو شقيق والدة «${nameB}» («${motherBDisp}») من صلب الجد «${ancDisp}» (خال مباشر لـ «${nameB}»).`;
      } else if (dA === 2 && dMB === 1 && fatherA) {
        title = `ابن خال مباشر لـ ${nameB} (والد ${nameA} شقيق أم ${nameB})`;
        conciseBullet = `والد «${nameA}» («${fatherADisp}») هو الشقيق المباشر لوالدة «${nameB}» («${motherBDisp}»)، ويجتمعان في الجد «${ancDisp}».`;
      } else if (dA >= 1 && dMB >= 1 && branchA.key !== branchMB.key) {
        title = `التقاء والد ${nameA} مع والدة ${nameB} في الجد «${ancDisp}»`;
        conciseBullet = `يلتقي عمود والد «${nameA}» (${fatherADisp}) مع والدة «${nameB}» (${motherBDisp}) في الجد «${ancDisp}» عبر الأخوين «${branchADisp}» و«${branchMBDisp}».`;
      } else {
        title = `التقاء والد ${nameA} مع والدة ${nameB} في الجد «${ancDisp}»`;
        conciseBullet = `يلتقي عمود والد «${nameA}» (${fatherADisp}) مع والدة «${nameB}» (${motherBDisp}) في الجد «${ancDisp}» (الجيل ${anc.generation}).`;
      }

      const visualPath = buildVisualPathBetweenLineages(
        'cross-ab-mb',
        `مسار التقاطع: ${partyABadge} ⬅ ${partyBBadge}`,
        lcaAB.path1,
        lcaAB.path2,
        nameA,
        `والدة ${nameB}`,
        people,
        isPrivacyRestricted,
        {
          badge,
          suffixNodesB: [makePersonPathNode(personB, nameB, people, isPrivacyRestricted, { isEndpointB: true, customDisplayName: nameB })],
          lcaRoleLabel: 'الجد المشترك'
        }
      );

      paternalAToMaternalB = {
        id: 'cross_paternalA_maternalB',
        category: 'paternal_to_maternal',
        title,
        badge,
        partyABadge,
        connector: '⬅',
        partyBBadge,
        commonAncestor: anc,
        conciseBullet,
        narrative: conciseBullet,
        fullChainText: conciseBullet,
        visualPath
      };
    }
  }

  // 2. Maternal Line of A ⬅ Paternal Line of B (أم [اسم أ] ⬅ أب [اسم ب])
  if (motherPersonA && motherPersonA.key !== personB.key) {
    const lcaBA = findLowestCommonAncestor(motherPersonA.key, personB.key, people);
    if (lcaBA.ancestor) {
      const anc = lcaBA.ancestor;
      const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
      const dMA = lcaBA.distance1;
      const dB = lcaBA.distance2;

      const branchMA = dMA >= 1 ? lcaBA.path1[lcaBA.path1.length - 2] : motherPersonA;
      const branchB = dB >= 1 ? lcaBA.path2[lcaBA.path2.length - 2] : personB;
      const branchMADisp = formatPersonDisplayName(branchMA, people, isPrivacyRestricted);
      const branchBDisp = formatPersonDisplayName(branchB, people, isPrivacyRestricted);

      const partyABadge = `أم ${nameA} (${motherADisp})`;
      const partyBBadge = fatherB ? `أب ${nameB} (${fatherBDisp})` : `نسب ${nameB}`;
      const badge = `${partyABadge} ⬅ ${partyBBadge}`;
      let title = `تقاطع نسب والدة ${nameA} مع والد ${nameB}`;
      let conciseBullet = '';

      if (dB === 0 && dMA === 1) {
        title = `${nameB} هو الجد لأم المباشر لـ ${nameA}`;
        conciseBullet = `«${nameB}» هو والد «${motherADisp}» (أي الجد المباشر لأم «${nameA}»).`;
      } else if (dMA === 1 && dB === 1) {
        title = `${nameB} خال مباشر لـ ${nameA}`;
        conciseBullet = `«${nameB}» هو شقيق والدة «${nameA}» («${motherADisp}») من صلب الجد «${ancDisp}» (خال مباشر لـ «${nameA}»).`;
      } else if (dMA === 1 && dB === 2 && fatherB) {
        title = `ابن عمة مباشر لـ ${nameB} (أم ${nameA} شقيقة والد ${nameB})`;
        conciseBullet = `والدة «${nameA}» («${motherADisp}») هي الشقيقة المباشرة لوالد «${nameB}» («${fatherBDisp}»)، ويجتمعان في الجد «${ancDisp}».`;
      } else if (dMA >= 1 && dB >= 1 && branchMA.key !== branchB.key) {
        title = `التقاء والدة ${nameA} مع والد ${nameB} في الجد «${ancDisp}»`;
        conciseBullet = `تلتقي والدة «${nameA}» (${motherADisp}) مع عمود والد «${nameB}» (${fatherBDisp}) في الجد «${ancDisp}» عبر الأخوين «${branchMADisp}» و«${branchBDisp}».`;
      } else {
        title = `التقاء والدة ${nameA} مع والد ${nameB} في الجد «${ancDisp}»`;
        conciseBullet = `تلتقي والدة «${nameA}» (${motherADisp}) مع عمود والد «${nameB}» (${fatherBDisp}) في الجد «${ancDisp}» (الجيل ${anc.generation}).`;
      }

      const visualPath = buildVisualPathBetweenLineages(
        'cross-ma-ab',
        `مسار التقاطع: ${partyABadge} ⬅ ${partyBBadge}`,
        lcaBA.path1,
        lcaBA.path2,
        `والدة ${nameA}`,
        nameB,
        people,
        isPrivacyRestricted,
        {
          badge,
          prefixNodesA: [makePersonPathNode(personA, nameA, people, isPrivacyRestricted, { isEndpointA: true, customDisplayName: nameA })],
          lcaRoleLabel: 'الجد المشترك'
        }
      );

      maternalAToPaternalB = {
        id: 'cross_maternalA_paternalB',
        category: 'maternal_to_paternal',
        title,
        badge,
        partyABadge,
        connector: '⬅',
        partyBBadge,
        commonAncestor: anc,
        conciseBullet,
        narrative: conciseBullet,
        fullChainText: conciseBullet,
        visualPath
      };
    }
  }

  // 3. Grandmothers Analysis (أم الأب، أم الأم، وأمهات الأجداد)
  const grandmothersA = collectPersonGrandmothers(personA, people, isPrivacyRestricted);
  const grandmothersB = collectPersonGrandmothers(personB, people, isPrivacyRestricted);
  const seenGmPairIds = new Set<string>();

  for (const gmA of grandmothersA) {
    for (const gmB of grandmothersB) {
      const isSameByKey = gmA.person && gmB.person && gmA.person.key === gmB.person.key;
      const isSameByNameAndAncestor =
        !gmA.person &&
        !gmB.person &&
        gmA.throughAncestor.key === gmB.throughAncestor.key &&
        normalizeArabic(gmA.motherInfo.name) === normalizeArabic(gmB.motherInfo.name);

      if (isSameByKey || isSameByNameAndAncestor) {
        if (gmA.throughAncestor.key === gmB.throughAncestor.key && gmA.throughDistance > 2 && gmB.throughDistance > 2) {
          continue;
        }
        const pairKey = `same_gm_${gmA.person?.key || normalizeArabic(gmA.motherInfo.name)}`;
        if (seenGmPairIds.has(pairKey)) continue;
        seenGmPairIds.add(pairKey);

        const partyABadge = `${gmA.roleLabel} لـ ${nameA}`;
        const partyBBadge = `${gmB.roleLabel} لـ ${nameB}`;
        const conciseBullet = `جدة مشتركة تجمع «${nameA}» و«${nameB}»: «${gmA.displayName}» (هي ${gmA.roleLabel} لدى «${nameA}»، و${gmB.roleLabel} لدى «${nameB}»).`;

        const nodes: KinshipPathNode[] = [
          makePersonPathNode(personA, nameA, people, isPrivacyRestricted, { isEndpointA: true, customDisplayName: nameA }),
          makePersonPathNode(gmA.throughAncestor, gmA.side === 'paternal' ? `سلف ${nameA}` : `أم ${nameA}`, people, isPrivacyRestricted),
          {
            key: !isPrivacyRestricted && gmA.person ? gmA.person.key : undefined,
            displayName: gmA.displayName,
            roleLabel: 'الجدة المشتركة',
            gender: 'f',
            generation: gmA.person?.generation,
            isHighlight: true,
            isMaskedFemale: isPrivacyRestricted
          }
        ];
        if (gmB.throughAncestor.key !== gmA.throughAncestor.key) {
          nodes.push(makePersonPathNode(gmB.throughAncestor, gmB.side === 'paternal' ? `سلف ${nameB}` : `أم ${nameB}`, people, isPrivacyRestricted));
        }
        nodes.push(makePersonPathNode(personB, nameB, people, isPrivacyRestricted, { isEndpointB: true, customDisplayName: nameB }));

        grandmotherLinks.push({
          id: pairKey,
          category: 'shared_grandmother',
          title: `الجدة المشتركة: «${gmA.displayName}»`,
          badge: `${partyABadge} 🤝 ${partyBBadge}`,
          partyABadge,
          connector: '🤝',
          partyBBadge,
          commonAncestor: gmA.person || gmA.fatherPerson,
          conciseBullet,
          narrative: conciseBullet,
          fullChainText: conciseBullet,
          visualPath: {
            id: `vp_${pairKey}`,
            title: 'مسار الجدة المشتركة',
            badge: 'جدة مشتركة',
            nodes
          }
        });
        continue;
      }

      if (gmA.person && gmB.person && gmA.throughDistance <= 2 && gmB.throughDistance <= 2) {
        const lcaGm = findLowestCommonAncestor(gmA.person.key, gmB.person.key, people);
        if (lcaGm.ancestor && lcaGm.distance1 <= 2 && lcaGm.distance2 <= 2) {
          const pairKey = `rel_gm_${[gmA.person.key, gmB.person.key].sort().join('_')}`;
          if (seenGmPairIds.has(pairKey)) continue;
          seenGmPairIds.add(pairKey);

          const anc = lcaGm.ancestor;
          const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);

          const partyABadge = `${gmA.roleLabel} لـ ${nameA} (${gmA.displayName})`;
          const partyBBadge = `${gmB.roleLabel} لـ ${nameB} (${gmB.displayName})`;

          const conciseBullet =
            lcaGm.distance1 === 1 && lcaGm.distance2 === 1
              ? `قرابة الجدات: ${gmA.roleLabel} لدى «${nameA}» («${gmA.displayName}») و${gmB.roleLabel} لدى «${nameB}» («${gmB.displayName}») هما شقيقتان ابنتا الجد «${ancDisp}».`
              : `قرابة الجدات: تلتقي ${gmA.roleLabel} لدى «${nameA}» («${gmA.displayName}») مع ${gmB.roleLabel} لدى «${nameB}» («${gmB.displayName}») في الجد «${ancDisp}».`;

          grandmotherLinks.push({
            id: pairKey,
            category: 'related_grandmothers',
            title: `قرابة بين الجدات في الجد «${ancDisp}»`,
            badge: `${partyABadge} ⬅ ${partyBBadge}`,
            partyABadge,
            connector: '⬅',
            partyBBadge,
            commonAncestor: anc,
            conciseBullet,
            narrative: conciseBullet,
            fullChainText: conciseBullet,
            visualPath: {
              id: `vp_${pairKey}`,
              title: 'مسار قرابة الجدات',
              badge: 'قرابة الجدات',
              nodes: [
                makePersonPathNode(personA, nameA, people, isPrivacyRestricted, { isEndpointA: true, customDisplayName: nameA }),
                makePersonPathNode(gmA.person, gmA.roleLabel, people, isPrivacyRestricted),
                makePersonPathNode(anc, 'الجد المشترك للجدتين', people, isPrivacyRestricted, { isHighlight: true }),
                makePersonPathNode(gmB.person, gmB.roleLabel, people, isPrivacyRestricted),
                makePersonPathNode(personB, nameB, people, isPrivacyRestricted, { isEndpointB: true, customDisplayName: nameB })
              ]
            }
          });
        }
      }
    }
  }

  // Direct Grandmother (أم الأب / أم الأم) intersecting with the other party's grandfather line
  for (const gmA of grandmothersA.filter(g => g.throughDistance === 1 && g.person)) {
    const lcaWithB = findLowestCommonAncestor(gmA.person!.key, personB.key, people);
    if (lcaWithB.ancestor && lcaWithB.distance1 <= 2 && lcaWithB.distance2 <= 3) {
      const pairKey = `gmA_to_B_${gmA.person!.key}_${lcaWithB.ancestor.key}`;
      if (!seenGmPairIds.has(pairKey)) {
        seenGmPairIds.add(pairKey);
        const anc = lcaWithB.ancestor;
        const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
        const bBranch = lcaWithB.distance2 >= 1 ? lcaWithB.path2[lcaWithB.path2.length - 2] : personB;
        const bBranchDisp = formatPersonDisplayName(bBranch, people, isPrivacyRestricted);

        const partyABadge = `${gmA.roleLabel} لـ ${nameA} (${gmA.displayName})`;
        const partyBBadge = fatherB ? `أب ${nameB} (${fatherBDisp})` : `نسب ${nameB}`;

        const conciseBullet =
          lcaWithB.distance1 === 1
            ? `${gmA.roleLabel} لدى «${nameA}» («${gmA.displayName}») هي شقيقة «${bBranchDisp}» في عمود نسب «${nameB}»، ويجتمعان في الجد «${ancDisp}».`
            : `تلتقي ${gmA.roleLabel} لدى «${nameA}» («${gmA.displayName}») مع عمود نسب «${nameB}» في الجد «${ancDisp}».`;

        grandmotherLinks.push({
          id: pairKey,
          category: 'grandmother_to_grandfather',
          title: `ارتباط ${gmA.roleLabel} لـ ${nameA} بنسب ${nameB}`,
          badge: `${partyABadge} ⬅ ${partyBBadge}`,
          partyABadge,
          connector: '⬅',
          partyBBadge,
          commonAncestor: anc,
          conciseBullet,
          narrative: conciseBullet,
          fullChainText: conciseBullet,
          visualPath: buildVisualPathBetweenLineages(
            `vp_${pairKey}`,
            `مسار ارتباط ${gmA.roleLabel} بنسب ${nameB}`,
            lcaWithB.path1,
            lcaWithB.path2,
            gmA.displayName,
            nameB,
            people,
            isPrivacyRestricted,
            {
              badge: `${partyABadge} ⬅ ${partyBBadge}`,
              prefixNodesA: [makePersonPathNode(personA, nameA, people, isPrivacyRestricted, { isEndpointA: true, customDisplayName: nameA })],
              lcaRoleLabel: 'الجد المشترك'
            }
          )
        });
      }
    }
  }

  for (const gmB of grandmothersB.filter(g => g.throughDistance === 1 && g.person)) {
    const lcaWithA = findLowestCommonAncestor(personA.key, gmB.person!.key, people);
    if (lcaWithA.ancestor && lcaWithA.distance2 <= 2 && lcaWithA.distance1 <= 3) {
      const pairKey = `gmB_to_A_${gmB.person!.key}_${lcaWithA.ancestor.key}`;
      if (!seenGmPairIds.has(pairKey)) {
        seenGmPairIds.add(pairKey);
        const anc = lcaWithA.ancestor;
        const ancDisp = formatPersonDisplayName(anc, people, isPrivacyRestricted);
        const aBranch = lcaWithA.distance1 >= 1 ? lcaWithA.path1[lcaWithA.path1.length - 2] : personA;
        const aBranchDisp = formatPersonDisplayName(aBranch, people, isPrivacyRestricted);

        const partyABadge = fatherA ? `أب ${nameA} (${fatherADisp})` : `نسب ${nameA}`;
        const partyBBadge = `${gmB.roleLabel} لـ ${nameB} (${gmB.displayName})`;

        const conciseBullet =
          lcaWithA.distance2 === 1
            ? `${gmB.roleLabel} لدى «${nameB}» («${gmB.displayName}») هي شقيقة «${aBranchDisp}» في عمود نسب «${nameA}»، ويجتمعان في الجد «${ancDisp}».`
            : `تلتقي ${gmB.roleLabel} لدى «${nameB}» («${gmB.displayName}») مع عمود نسب «${nameA}» في الجد «${ancDisp}».`;

        grandmotherLinks.push({
          id: pairKey,
          category: 'grandmother_to_grandfather',
          title: `ارتباط ${gmB.roleLabel} لـ ${nameB} بنسب ${nameA}`,
          badge: `${partyABadge} ⬅ ${partyBBadge}`,
          partyABadge,
          connector: '⬅',
          partyBBadge,
          commonAncestor: anc,
          conciseBullet,
          narrative: conciseBullet,
          fullChainText: conciseBullet,
          visualPath: buildVisualPathBetweenLineages(
            `vp_${pairKey}`,
            `مسار ارتباط نسب ${nameA} بـ ${gmB.roleLabel}`,
            lcaWithA.path1,
            lcaWithA.path2,
            nameA,
            gmB.displayName,
            people,
            isPrivacyRestricted,
            {
              badge: `${partyABadge} ⬅ ${partyBBadge}`,
              suffixNodesB: [makePersonPathNode(personB, nameB, people, isPrivacyRestricted, { isEndpointB: true, customDisplayName: nameB })],
              lcaRoleLabel: 'الجد المشترك'
            }
          )
        });
      }
    }
  }

  const hasCrossOrGrandmotherRelation = Boolean(
    paternalAToMaternalB || maternalAToPaternalB || grandmotherLinks.length > 0
  );

  let summaryTitle = 'لا توجد تقاطعات إضافية مسجلة';
  let summaryExplanation = `لا يوجد تقاطع إضافي مسجل بين عمود والد ووالدة «${nameA}» و«${nameB}» أو جداتهما بخلاف النسب الأبوي الأساسي.`;

  if (hasCrossOrGrandmotherRelation) {
    const bullets: string[] = [];
    if (paternalAToMaternalB) bullets.push(paternalAToMaternalB.conciseBullet);
    if (maternalAToPaternalB) bullets.push(maternalAToPaternalB.conciseBullet);
    grandmotherLinks.forEach(g => bullets.push(g.conciseBullet));
    summaryTitle = paternalAToMaternalB?.title || maternalAToPaternalB?.title || grandmotherLinks[0]?.title || 'تقاطع الأب والأم والجدات';
    summaryExplanation = bullets.join(' • ');
  }

  return {
    hasCrossOrGrandmotherRelation,
    summaryTitle,
    summaryExplanation,
    paternalAToMaternalB,
    maternalAToPaternalB,
    grandmotherLinks,
    grandmothersA,
    grandmothersB
  };
}

/**
 * Section 4: Analyzes in-law and spousal relationships in concise bullets using real names and dual badges
 */
export function analyzeInLawKinship(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): InLawKinship {
  let hasInLawRelation = false;
  let isDirectSpouse = false;
  let spousalTitle = '';
  let spousalExplanation = '';
  let areBrothersInLaw = false;
  let brotherInLawExplanation = '';
  const conciseBullets: string[] = [];
  const bulletCards: InLawBulletCard[] = [];
  const visualPaths: KinshipVisualPath[] = [];

  const inLawsA: InLawDetail[] = [];
  const inLawsB: InLawDetail[] = [];

  const spousesA = personA.spouses || [];
  const spousesB = personB.spouses || [];

  const { nameA, nameB } = getDistinctPairNames(personA, personB, people, isPrivacyRestricted);

  const fatherA = personA.parentKey ? people.get(personA.parentKey) || null : null;
  const fatherB = personB.parentKey ? people.get(personB.parentKey) || null : null;
  const motherPersonA = resolveMotherPerson(personA.mother, fatherA, people);
  const motherPersonB = resolveMotherPerson(personB.mother, fatherB, people);

  // 1. Direct Marriage
  const aMarriedToB = spousesA.some(s => s.personKey === personB.key || normalizeArabic(s.name) === normalizeArabic(personB.name));
  const bMarriedToA = spousesB.some(s => s.personKey === personA.key || normalizeArabic(s.name) === normalizeArabic(personA.name));

  if (aMarriedToB || bMarriedToA) {
    hasInLawRelation = true;
    isDirectSpouse = true;
    spousalTitle = 'علاقة زوجية مباشرة (زوج وزوجة)';
    spousalExplanation = `«${nameA}» و«${nameB}» تربطهما علاقة زواج ومصاهرة مباشرة.`;
    conciseBullets.push(spousalExplanation);
    bulletCards.push({
      id: 'inlaw_direct',
      partyABadge: `${nameA} (القرين)`,
      connector: '🤝',
      partyBBadge: `${nameB} (القرين)`,
      text: spousalExplanation
    });
  }

  // 2. Person A's spouses in-law relations with Person B
  spousesA.forEach((s, idx) => {
    const wifePerson = s.personKey ? people.get(s.personKey) || null : null;
    const spDisp = formatFemaleInfoDisplayName(s, wifePerson, people, isPrivacyRestricted);

    if (s.isFromFamily && wifePerson && wifePerson.key !== personB.key) {
      if (wifePerson.parentKey === personB.key) {
        hasInLawRelation = true;
        const exp = `صهر مباشر: «${nameA}» متزوج من «${spDisp}» ابنة «${nameB}».`;
        inLawsA.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_daughter',
          title: 'صهر مباشر (زوج ابنته)',
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_a_dau_${idx}`,
          partyABadge: `${nameA} (زوج ${spDisp})`,
          connector: '🤝',
          partyBBadge: `${nameB} (والد الزوجة)`,
          text: exp
        });
      } else if (wifePerson.parentKey && personB.parentKey && wifePerson.parentKey === personB.parentKey) {
        hasInLawRelation = true;
        const exp = `صهر مباشر: «${nameA}» متزوج من «${spDisp}» شقيقة «${nameB}».`;
        inLawsA.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_sister',
          title: 'صهر مباشر (زوج أخته)',
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_a_sis_${idx}`,
          partyABadge: `${nameA} (زوج ${spDisp})`,
          connector: '🤝',
          partyBBadge: `${nameB} (شقيق الزوجة)`,
          text: exp
        });
      } else if (
        (fatherB && wifePerson.parentKey && wifePerson.parentKey === fatherB.parentKey && wifePerson.key !== fatherB.key) ||
        (motherPersonB && wifePerson.parentKey && wifePerson.parentKey === motherPersonB.parentKey && wifePerson.key !== motherPersonB.key)
      ) {
        hasInLawRelation = true;
        const isPaternalAunt = fatherB && wifePerson.parentKey === fatherB.parentKey;
        const title = isPaternalAunt ? `زوج عمة ${nameB}` : `زوج خالة ${nameB}`;
        const exp = `${title}: «${nameA}» متزوج من «${spDisp}» (${isPaternalAunt ? 'عمة' : 'خالة'} «${nameB}»).`;
        inLawsA.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_aunt',
          title,
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_a_aunt_${idx}`,
          partyABadge: `${nameA} (زوج ${spDisp})`,
          connector: '🤝',
          partyBBadge: `${isPaternalAunt ? 'عمة' : 'خالة'} ${nameB} (${spDisp})`,
          text: exp
        });
      } else {
        const lca = findLowestCommonAncestor(wifePerson.key, personB.key, people);
        if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
          hasInLawRelation = true;
          const ancDisp = formatPersonDisplayName(lca.ancestor, people, isPrivacyRestricted);
          const exp = `مصاهرة عائلية: زوجة «${nameA}» («${spDisp}») تلتقي مع «${nameB}» في الجد «${ancDisp}».`;
          inLawsA.push({
            spouse: s,
            wifePerson,
            spouseDisplayName: spDisp,
            relationType: 'wife_is_cousin',
            title: 'مصاهرة من بنات العمومة',
            explanation: exp
          });
          conciseBullets.push(exp);
          bulletCards.push({
            id: `inlaw_a_cous_${idx}`,
            partyABadge: `زوجة ${nameA} (${spDisp})`,
            connector: '⬅',
            partyBBadge: `نسب ${nameB}`,
            text: exp
          });
        }
      }
    }
  });

  // 3. Person B's spouses in-law relations with Person A
  spousesB.forEach((s, idx) => {
    const wifePerson = s.personKey ? people.get(s.personKey) || null : null;
    const spDisp = formatFemaleInfoDisplayName(s, wifePerson, people, isPrivacyRestricted);

    if (s.isFromFamily && wifePerson && wifePerson.key !== personA.key) {
      if (wifePerson.parentKey === personA.key) {
        hasInLawRelation = true;
        const exp = `صهر مباشر: «${nameB}» متزوج من «${spDisp}» ابنة «${nameA}».`;
        inLawsB.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_daughter',
          title: `والد الزوجة (${nameB} زوج ابنته)`,
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_b_dau_${idx}`,
          partyABadge: `${nameA} (والد الزوجة)`,
          connector: '🤝',
          partyBBadge: `${nameB} (زوج ${spDisp})`,
          text: exp
        });
      } else if (wifePerson.parentKey && personA.parentKey && wifePerson.parentKey === personA.parentKey) {
        hasInLawRelation = true;
        const exp = `صهر مباشر: «${nameB}» متزوج من «${spDisp}» شقيقة «${nameA}».`;
        inLawsB.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_sister',
          title: `شقيق الزوجة (${nameB} زوج أخته)`,
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_b_sis_${idx}`,
          partyABadge: `${nameA} (شقيق الزوجة)`,
          connector: '🤝',
          partyBBadge: `${nameB} (زوج ${spDisp})`,
          text: exp
        });
      } else if (
        (fatherA && wifePerson.parentKey && wifePerson.parentKey === fatherA.parentKey && wifePerson.key !== fatherA.key) ||
        (motherPersonA && wifePerson.parentKey && wifePerson.parentKey === motherPersonA.parentKey && wifePerson.key !== motherPersonA.key)
      ) {
        hasInLawRelation = true;
        const isPaternalAunt = fatherA && wifePerson.parentKey === fatherA.parentKey;
        const title = isPaternalAunt ? `زوج عمة ${nameA}` : `زوج خالة ${nameA}`;
        const exp = `${title}: «${nameB}» متزوج من «${spDisp}» (${isPaternalAunt ? 'عمة' : 'خالة'} «${nameA}»).`;
        inLawsB.push({
          spouse: s,
          wifePerson,
          spouseDisplayName: spDisp,
          relationType: 'wife_is_aunt',
          title,
          explanation: exp
        });
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_b_aunt_${idx}`,
          partyABadge: `${isPaternalAunt ? 'عمة' : 'خالة'} ${nameA} (${spDisp})`,
          connector: '🤝',
          partyBBadge: `${nameB} (زوج ${spDisp})`,
          text: exp
        });
      } else {
        const lca = findLowestCommonAncestor(personA.key, wifePerson.key, people);
        if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
          hasInLawRelation = true;
          const ancDisp = formatPersonDisplayName(lca.ancestor, people, isPrivacyRestricted);
          const exp = `مصاهرة عائلية: زوجة «${nameB}» («${spDisp}») تلتقي مع «${nameA}» في الجد «${ancDisp}».`;
          inLawsB.push({
            spouse: s,
            wifePerson,
            spouseDisplayName: spDisp,
            relationType: 'wife_is_cousin',
            title: 'مصاهرة من بنات العمومة',
            explanation: exp
          });
          conciseBullets.push(exp);
          bulletCards.push({
            id: `inlaw_b_cous_${idx}`,
            partyABadge: `نسب ${nameA}`,
            connector: '⬅',
            partyBBadge: `زوجة ${nameB} (${spDisp})`,
            text: exp
          });
        }
      }
    }
  });

  // 4. العدلاء (Both married to sisters)
  for (const sA of spousesA) {
    if (!sA.isFromFamily || !sA.personKey) continue;
    const wA = people.get(sA.personKey);
    if (!wA || !wA.parentKey) continue;

    for (const sB of spousesB) {
      if (!sB.isFromFamily || !sB.personKey) continue;
      const wB = people.get(sB.personKey);
      if (!wB || !wB.parentKey) continue;

      if (wA.parentKey === wB.parentKey && wA.key !== wB.key) {
        hasInLawRelation = true;
        areBrothersInLaw = true;
        const fatherInLaw = people.get(wA.parentKey);
        const wADisp = formatPersonDisplayName(wA, people, isPrivacyRestricted);
        const wBDisp = formatPersonDisplayName(wB, people, isPrivacyRestricted);
        const fatherInLawDisp = formatPersonDisplayName(fatherInLaw, people, isPrivacyRestricted);
        brotherInLawExplanation = `عديلان: «${nameA}» و«${nameB}» متزوجان من الشقيقتين «${wADisp}» و«${wBDisp}» ابنتي «${fatherInLawDisp}».`;
        conciseBullets.push(brotherInLawExplanation);
        bulletCards.push({
          id: 'inlaw_brothers_in_law',
          partyABadge: `زوجة ${nameA} (${wADisp})`,
          connector: '🤝',
          partyBBadge: `زوجة ${nameB} (${wBDisp})`,
          text: brotherInLawExplanation
        });
        break;
      }
    }
    if (areBrothersInLaw) break;
  }

  // 5. Intermarriage between direct children
  const childrenA = personA.childrenKeys.map(k => people.get(k)).filter((c): c is ProcessedPerson => Boolean(c && !c.deleted));
  const childrenB = personB.childrenKeys.map(k => people.get(k)).filter((c): c is ProcessedPerson => Boolean(c && !c.deleted));
  const childBKeys = new Set(childrenB.map(c => c.key));

  for (const childA of childrenA) {
    for (const sp of childA.spouses || []) {
      if (sp.personKey && childBKeys.has(sp.personKey)) {
        const childB = people.get(sp.personKey)!;
        hasInLawRelation = true;
        const cADisp = formatPersonDisplayName(childA, people, isPrivacyRestricted);
        const cBDisp = formatPersonDisplayName(childB, people, isPrivacyRestricted);
        const exp = `مصاهرة الأبناء: اقترن «${cADisp}» (${childA.gender === 'f' ? 'ابنة' : 'ابن'} «${nameA}») بـ «${cBDisp}» (${childB.gender === 'f' ? 'ابنة' : 'ابن'} «${nameB}»).`;
        conciseBullets.push(exp);
        bulletCards.push({
          id: `inlaw_children_${childA.key}_${childB.key}`,
          partyABadge: `${childA.gender === 'f' ? 'ابنة' : 'ابن'} ${nameA} (${cADisp})`,
          connector: '🤝',
          partyBBadge: `${childB.gender === 'f' ? 'ابنة' : 'ابن'} ${nameB} (${cBDisp})`,
          text: exp
        });
        inLawsA.push({
          spouse: sp,
          wifePerson: childB,
          spouseDisplayName: cBDisp,
          relationType: 'children_intermarriage',
          title: `مصاهرة مباشرة بين أبناء ${nameA} و${nameB}`,
          explanation: exp
        });
      }
    }
  }

  if (!spousalTitle) {
    if (areBrothersInLaw) {
      spousalTitle = 'عديلان (متزوجان من شقيقتين)';
      spousalExplanation = brotherInLawExplanation;
    } else if (inLawsA.length > 0) {
      spousalTitle = inLawsA[0].title;
      spousalExplanation = inLawsA[0].explanation;
    } else if (inLawsB.length > 0) {
      spousalTitle = inLawsB[0].title;
      spousalExplanation = inLawsB[0].explanation;
    }
  }

  return {
    hasInLawRelation,
    isDirectSpouse,
    spousalTitle,
    spousalExplanation,
    conciseBullets,
    bulletCards,
    detailedNarratives: conciseBullets,
    inLawsA,
    inLawsB,
    areBrothersInLaw,
    brotherInLawExplanation,
    visualPaths
  };
}

/**
 * Builds the concise Paternal Analysis (أب ⬅ أب) using real names
 */
function buildPaternalDetailedAnalysis(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  commonAncestor: ProcessedPerson | null,
  distanceA: number,
  distanceB: number,
  pathFromAToAncestor: ProcessedPerson[],
  pathFromBToAncestor: ProcessedPerson[],
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean
): PaternalDetailedAnalysis {
  const { nameA, nameB } = getDistinctPairNames(personA, personB, people, isPrivacyRestricted);
  const fatherA = personA.parentKey ? people.get(personA.parentKey) : null;
  const fatherB = personB.parentKey ? people.get(personB.parentKey) : null;

  const partyABadge = fatherA
    ? `أب ${nameA} (${formatPersonDisplayName(fatherA, people, isPrivacyRestricted)})`
    : `نسب ${nameA}`;
  const partyBBadge = fatherB
    ? `أب ${nameB} (${formatPersonDisplayName(fatherB, people, isPrivacyRestricted)})`
    : `نسب ${nameB}`;

  if (!commonAncestor || distanceA < 0 || distanceB < 0) {
    return {
      partyABadge,
      partyBBadge,
      commonAncestorConciseLine: `لا يوجد جد أبوي مشترك مسجل بين «${nameA}» و«${nameB}».`,
      commonAncestorNarrative: `لا يوجد جد أبوي مشترك مسجل بين «${nameA}» و«${nameB}».`,
      branchingPoint: null,
      branchingPointConciseLine: '',
      branchingPointNarrative: '',
      unclesAndGrandfathersNarrative: '',
      fullChainUpA: formatPatronymicChain(pathFromAToAncestor, people, isPrivacyRestricted),
      fullChainDownB: formatPatronymicChain(pathFromBToAncestor, people, isPrivacyRestricted),
      fullChainNarrative: '',
      visualPath: {
        id: 'pat-none',
        title: 'مسار النسب الأبوي',
        nodes: []
      }
    };
  }

  const ancDisp = formatPersonDisplayName(commonAncestor, people, isPrivacyRestricted);

  let commonAncestorConciseLine = '';
  if (distanceA === 0 && distanceB === 0) {
    commonAncestorConciseLine = `الاسم المختار في الخانتين يمثل نفس الفرد: «${nameA}» (الجيل ${personA.generation}).`;
  } else if (distanceA === 0) {
    commonAncestorConciseLine = `«${nameA}» (الجيل ${personA.generation}) هو الجد المباشر لـ «${nameB}» بفارق ${formatGenerationsCount(distanceB)}.`;
  } else if (distanceB === 0) {
    commonAncestorConciseLine = `«${nameB}» (الجيل ${personB.generation}) هو الجد المباشر لـ «${nameA}» بفارق ${formatGenerationsCount(distanceA)}.`;
  } else {
    commonAncestorConciseLine = `الجد «${ancDisp}» (الجيل ${commonAncestor.generation}) — يبعد ${formatGenerationsCount(distanceA)} عن «${nameA}»، ويبعد ${formatGenerationsCount(distanceB)} عن «${nameB}».`;
  }

  let branchingPoint: PaternalDetailedAnalysis['branchingPoint'] = null;
  let branchingPointConciseLine = '';

  if (distanceA >= 1 && distanceB >= 1) {
    const sonA = pathFromAToAncestor[pathFromAToAncestor.length - 2];
    const sonB = pathFromBToAncestor[pathFromBToAncestor.length - 2];
    const sonADisp = formatPersonDisplayName(sonA, people, isPrivacyRestricted);
    const sonBDisp = formatPersonDisplayName(sonB, people, isPrivacyRestricted);

    branchingPoint = {
      ancestor: commonAncestor,
      sonA,
      sonB,
      sonADisplayName: sonADisp,
      sonBDisplayName: sonBDisp
    };

    if (distanceA === 1 && distanceB === 1) {
      branchingPointConciseLine = `«${nameA}» و«${nameB}» أخوان شقيقان/لأب يتفرعان مباشرة من أبيهما «${ancDisp}».`;
    } else {
      branchingPointConciseLine = `يتفرع «${nameA}» من «${sonADisp}» بينما يتفرع «${nameB}» من أخيه «${sonBDisp}»، وهما أبناء الجد «${ancDisp}».`;
    }
  }

  const fullChainUpA = formatPatronymicChain(pathFromAToAncestor, people, isPrivacyRestricted);
  const fullChainDownB = formatPatronymicChain(pathFromBToAncestor, people, isPrivacyRestricted);

  const visualPath = buildVisualPathBetweenLineages(
    'paternal-main-path',
    `سلسلة النسب الأبوي بين ${nameA} و${nameB} حتى الجد المشترك`,
    pathFromAToAncestor,
    pathFromBToAncestor,
    nameA,
    nameB,
    people,
    isPrivacyRestricted,
    {
      badge: `${partyABadge} ⬅ ${partyBBadge}`,
      lcaRoleLabel: 'الجد المشترك'
    }
  );

  return {
    partyABadge,
    partyBBadge,
    commonAncestorConciseLine,
    commonAncestorNarrative: commonAncestorConciseLine,
    branchingPoint,
    branchingPointConciseLine,
    branchingPointNarrative: branchingPointConciseLine,
    unclesAndGrandfathersNarrative: branchingPointConciseLine,
    fullChainUpA,
    fullChainDownB,
    fullChainNarrative: `${fullChainUpA} ↔ ${fullChainDownB}`,
    visualPath
  };
}

/**
 * Analyzes the complete genealogical relationship between Person A and Person B.
 */
export function analyzeKinship(
  keyA: string,
  keyB: string,
  people: Map<string, ProcessedPerson>,
  isPrivacyRestricted: boolean = false
): KinshipResult | null {
  const personA = people.get(keyA);
  const personB = people.get(keyB);

  if (!personA || !personB) return null;

  const { nameA: personADisplayName, nameB: personBDisplayName } = getDistinctPairNames(
    personA,
    personB,
    people,
    isPrivacyRestricted
  );

  const maternalKinship = analyzeMaternalKinship(personA, personB, people, isPrivacyRestricted);
  const crossAndGrandmothersKinship = analyzeCrossAndGrandmothersKinship(personA, personB, people, isPrivacyRestricted);
  const inLawKinship = analyzeInLawKinship(personA, personB, people, isPrivacyRestricted);

  if (keyA === keyB) {
    const paternalAnalysis = buildPaternalDetailedAnalysis(
      personA,
      personB,
      personA,
      0,
      0,
      [personA],
      [personB],
      people,
      isPrivacyRestricted
    );
    return {
      personA,
      personB,
      personADisplayName,
      personBDisplayName,
      commonAncestor: personA,
      relationshipTitle: 'نفس الشخص (المقارنة مع الذات)',
      relationshipType: 'self',
      narrativeExplanation: `الاسم المختار في الخانتين يمثل نفس الفرد: «${personADisplayName}».`,
      executiveSummary: `الاسم المختار في الخانتين يمثل نفس الفرد: «${personADisplayName}».`,
      paternalAnalysis,
      distanceA: 0,
      distanceB: 0,
      generationDiff: 0,
      pathFromAToAncestor: [personA],
      pathFromBToAncestor: [personB],
      fullLineageChain: [personA],
      isSameBranch: true,
      branchNameA: personA.branchName || 'الأصل',
      branchNameB: personB.branchName || 'الأصل',
      maternalKinship,
      crossAndGrandmothersKinship,
      inLawKinship,
      isPrivacyRestricted
    };
  }

  const pathA = getAncestorsPath(keyA, people);
  const pathB = getAncestorsPath(keyB, people);

  let commonAncestor: ProcessedPerson | null = null;
  let distanceA = -1;
  let distanceB = -1;

  const bIndexMap = new Map<string, number>();
  pathB.forEach((p, idx) => bIndexMap.set(p.key, idx));

  for (let i = 0; i < pathA.length; i++) {
    const key = pathA[i].key;
    if (bIndexMap.has(key)) {
      commonAncestor = pathA[i];
      distanceA = i;
      distanceB = bIndexMap.get(key)!;
      break;
    }
  }

  if (!commonAncestor) {
    const paternalAnalysis = buildPaternalDetailedAnalysis(
      personA,
      personB,
      null,
      -1,
      -1,
      pathA,
      pathB,
      people,
      isPrivacyRestricted
    );

    return {
      personA,
      personB,
      personADisplayName,
      personBDisplayName,
      commonAncestor: null,
      relationshipTitle: 'لا يوجد جد أبوي مشترك مسجل',
      relationshipType: 'distant',
      narrativeExplanation: `لم يتم العثور على جد مشترك من جهة الأب في المشجر يجمع بين «${personADisplayName}» و«${personBDisplayName}».`,
      executiveSummary: `لم يتم العثور على جد مشترك من جهة الأب في المشجر يجمع بين «${personADisplayName}» و«${personBDisplayName}».`,
      paternalAnalysis,
      distanceA: -1,
      distanceB: -1,
      generationDiff: personA.generation - personB.generation,
      pathFromAToAncestor: pathA,
      pathFromBToAncestor: pathB,
      fullLineageChain: [],
      isSameBranch: personA.branch === personB.branch,
      branchNameA: personA.branchName || 'فرع',
      branchNameB: personB.branchName || 'فرع',
      maternalKinship,
      crossAndGrandmothersKinship,
      inLawKinship,
      isPrivacyRestricted
    };
  }

  const pathFromAToAncestor = pathA.slice(0, distanceA + 1);
  const pathFromBToAncestor = pathB.slice(0, distanceB + 1);

  const fullLineageChain: ProcessedPerson[] = [
    ...pathFromAToAncestor,
    ...pathFromBToAncestor.slice(0, -1).reverse()
  ];

  const isMaleA = personA.gender === 'm';
  const genDiff = personA.generation - personB.generation;
  const isSameBranch = personA.branch === personB.branch;
  const ancDisp = formatPersonDisplayName(commonAncestor, people, isPrivacyRestricted);

  let relationshipTitle = '';
  let relationshipType: KinshipResult['relationshipType'] = 'cousin';
  let narrativeExplanation = '';

  if (distanceA === 0 && distanceB > 0) {
    relationshipType = 'ancestor';
    if (distanceB === 1) {
      relationshipTitle = isMaleA ? 'والد مباشر (أب)' : 'والدة مباشرة (أم)';
      narrativeExplanation = `«${personADisplayName}» هو الوالد المباشر لـ «${personBDisplayName}».`;
    } else if (distanceB === 2) {
      relationshipTitle = isMaleA ? 'جد مباشر' : 'جدة مباشرة';
      const mid = pathFromBToAncestor[1];
      narrativeExplanation = `«${personADisplayName}» هو الجد المباشر لـ «${personBDisplayName}» (والد «${formatPersonDisplayName(mid, people, isPrivacyRestricted)}»).`;
    } else if (distanceB === 3) {
      relationshipTitle = isMaleA ? 'والد الجد (الجد الثاني)' : 'والدة الجد';
      narrativeExplanation = `«${personADisplayName}» هو والد جد «${personBDisplayName}» بفارق ثلاثة أجيال.`;
    } else {
      relationshipTitle = `جد أعلى من الجيل (${distanceB})`;
      narrativeExplanation = `«${personADisplayName}» هو جد أعلى لـ «${personBDisplayName}» يفصل بينهما ${distanceB} أجيال.`;
    }
  } else if (distanceB === 0 && distanceA > 0) {
    relationshipType = 'descendant';
    if (distanceA === 1) {
      relationshipTitle = isMaleA ? 'ابن مباشر' : 'ابنة مباشرة';
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن مباشر' : 'ابنة مباشرة'} لـ «${personBDisplayName}».`;
    } else if (distanceA === 2) {
      relationshipTitle = isMaleA ? 'حفيد مباشر' : 'حفيدة مباشرة';
      const mid = pathFromAToAncestor[1];
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'حفيد' : 'حفيدة'} لـ «${personBDisplayName}» (${isMaleA ? 'ابن' : 'ابنة'} «${formatPersonDisplayName(mid, people, isPrivacyRestricted)}»).`;
    } else if (distanceA === 3) {
      relationshipTitle = isMaleA ? 'ابن حفيد (الجيل الثالث)' : 'ابنة حفيد';
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن حفيد' : 'ابنة حفيد'} لـ «${personBDisplayName}».`;
    } else {
      relationshipTitle = `من أحفاد وذرية الجيل (${distanceA})`;
      narrativeExplanation = `«${personADisplayName}» من سلالة وذرية «${personBDisplayName}» بفارق ${distanceA} أجيال.`;
    }
  } else if (distanceA === 1 && distanceB === 1) {
    relationshipType = 'sibling';
    relationshipTitle = isMaleA ? 'أخ شقيق / مباشر' : 'أخت شقيقة / مباشرة';
    narrativeExplanation = `«${personADisplayName}» و«${personBDisplayName}» إخوة مشتركان في الوالد: «${ancDisp}».`;
  } else if (distanceA === 1 && distanceB > 1) {
    relationshipType = 'uncle_aunt';
    if (distanceB === 2) {
      relationshipTitle = isMaleA ? 'عم مباشر (شقيق والده)' : 'عمة مباشرة (شقيقة والده)';
      const fatherB = pathFromBToAncestor[1];
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'عم' : 'عمة'} «${personBDisplayName}» (${isMaleA ? 'شقيق' : 'شقيقة'} والده «${formatPersonDisplayName(fatherB, people, isPrivacyRestricted)}»)، ويلتقيان في الجد «${ancDisp}».`;
    } else if (distanceB === 3) {
      relationshipTitle = isMaleA ? 'عم الوالد (شقيق الجد)' : 'عمة الوالد (شقيقة الجد)';
      const grandFatherB = pathFromBToAncestor[2];
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'شقيق' : 'شقيقة'} جد «${personBDisplayName}» («${formatPersonDisplayName(grandFatherB, people, isPrivacyRestricted)}»)، ويلتقيان في والد الجد «${ancDisp}».`;
    } else {
      relationshipTitle = isMaleA ? `عم أجداد (من الجيل ${distanceB - 1})` : `عمة أجداد (من الجيل ${distanceB - 1})`;
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'عم' : 'عمة'} أحد أجداد «${personBDisplayName}»، ويلتقيان في الجد الجامع «${ancDisp}».`;
    }
  } else if (distanceB === 1 && distanceA > 1) {
    relationshipType = 'nephew_niece';
    if (distanceA === 2) {
      relationshipTitle = isMaleA ? 'ابن أخ مباشر' : 'ابنة أخ مباشرة';
      const fatherA = pathFromAToAncestor[1];
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} أخ لـ «${personBDisplayName}» (والده «${formatPersonDisplayName(fatherA, people, isPrivacyRestricted)}» هو شقيق «${personBDisplayName}»)، ويلتقيان في الجد «${ancDisp}».`;
    } else if (distanceA === 3) {
      relationshipTitle = isMaleA ? 'حفيد أخ (ابن ابن أخ)' : 'حفيدة أخ (ابنة ابن أخ)';
      narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'حفيد' : 'حفيدة'} أخ لـ «${personBDisplayName}»، ويلتقيان في الجد «${ancDisp}».`;
    } else {
      relationshipTitle = `من ذرية وأحفاد أخ «${personBDisplayName}»`;
      narrativeExplanation = `«${personADisplayName}» ينحدر من ذرية أخ «${personBDisplayName}» بفارق ${distanceA} أجيال.`;
    }
  } else {
    relationshipType = 'cousin';
    if (distanceA === distanceB) {
      if (distanceA === 2) {
        relationshipTitle = isMaleA ? 'ابن عم مباشر' : 'ابنة عم مباشرة';
        narrativeExplanation = `«${personADisplayName}» و«${personBDisplayName}» أبناء عمومة مباشرون في نفس الجيل، والجد المشترك لهما هو: «${ancDisp}».`;
      } else if (distanceA === 3) {
        relationshipTitle = isMaleA ? 'ابن عم من الدرجة الثانية' : 'ابنة عم من الدرجة الثانية';
        narrativeExplanation = `«${personADisplayName}» و«${personBDisplayName}» أولاد عمومة من الدرجة الثانية، ويلتقيان في الجد المشترك: «${ancDisp}».`;
      } else if (distanceA === 4) {
        relationshipTitle = isMaleA ? 'ابن عم من الدرجة الثالثة' : 'ابنة عم من الدرجة الثالثة';
        narrativeExplanation = `«${personADisplayName}» و«${personBDisplayName}» يلتقيان في الجد الثالث المشترك: «${ancDisp}».`;
      } else {
        const degree = distanceA - 1;
        relationshipTitle = isMaleA ? `ابن عم من الدرجة (${degree})` : `ابنة عم من الدرجة (${degree})`;
        narrativeExplanation = `«${personADisplayName}» و«${personBDisplayName}» في نفس الجيل ويلتقيان في الجد المشترك: «${ancDisp}» بعد ${distanceA} أجيال صعوداً.`;
      }
    } else if (distanceA < distanceB) {
      if (distanceA === 2 && distanceB === 3) {
        relationshipTitle = isMaleA ? 'ابن عم الوالد (في مقام العم)' : 'ابنة عم الوالد (في مقام العمة)';
        const fatherB = pathFromBToAncestor[1];
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} عم مباشر لوالد «${personBDisplayName}» («${formatPersonDisplayName(fatherB, people, isPrivacyRestricted)}»)، والجد المشترك هو: «${ancDisp}».`;
      } else if (distanceA === 2 && distanceB === 4) {
        relationshipTitle = isMaleA ? 'ابن عم الجد' : 'ابنة عم الجد';
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} عم لجد «${personBDisplayName}»، ويلتقيان في الجد «${ancDisp}».`;
      } else if (distanceA === 3 && distanceB === 4) {
        relationshipTitle = isMaleA ? 'ابن عم الوالد من الدرجة الثانية' : 'ابنة عم الوالد من الدرجة الثانية';
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} عم من الدرجة الثانية لوالد «${personBDisplayName}»، ويلتقيان في الجد «${ancDisp}».`;
      } else {
        const genGap = distanceB - distanceA;
        relationshipTitle = isMaleA
          ? `ابن عم من جيل الأجداد (أعلى بـ ${formatGenerationsCount(genGap)})`
          : `ابنة عم من جيل الأجداد (أعلى بـ ${formatGenerationsCount(genGap)})`;
        narrativeExplanation = `«${personADisplayName}» يلتقي مع «${personBDisplayName}» في الجد المشترك «${ancDisp}»، ويسبق «${personBDisplayName}» بـ ${formatGenerationsCount(genGap)}.`;
      }
    } else {
      if (distanceA === 3 && distanceB === 2) {
        relationshipTitle = isMaleA ? 'ابن ابن عم مباشر' : 'ابنة ابن عم مباشر';
        const fatherA = pathFromAToAncestor[1];
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} لـ («${formatPersonDisplayName(fatherA, people, isPrivacyRestricted)}») ابن عم «${personBDisplayName}»، ويلتقيان في الجد: «${ancDisp}».`;
      } else if (distanceA === 4 && distanceB === 2) {
        relationshipTitle = isMaleA ? 'حفيد ابن عم مباشر' : 'حفيدة ابن عم مباشر';
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'حفيد' : 'حفيدة'} لابن عم «${personBDisplayName}»، ويلتقيان في الجد «${ancDisp}».`;
      } else if (distanceA === 4 && distanceB === 3) {
        relationshipTitle = isMaleA ? 'ابن ابن عم من الدرجة الثانية' : 'ابنة ابن عم من الدرجة الثانية';
        narrativeExplanation = `«${personADisplayName}» هو ${isMaleA ? 'ابن' : 'ابنة'} لأحد أبناء عمومة «${personBDisplayName}» من الدرجة الثانية، ويلتقيان في الجد «${ancDisp}».`;
      } else {
        const genGap = distanceA - distanceB;
        relationshipTitle = isMaleA
          ? `ابن عم من ذرية الأحفاد (أصغر بـ ${formatGenerationsCount(genGap)})`
          : `ابنة عم من ذرية الأحفاد (أصغر بـ ${formatGenerationsCount(genGap)})`;
        narrativeExplanation = `«${personADisplayName}» يلتقي مع «${personBDisplayName}» في الجد المشترك «${ancDisp}»، ويأتي بعد «${personBDisplayName}» بـ ${formatGenerationsCount(genGap)}.`;
      }
    }
  }

  const paternalAnalysis = buildPaternalDetailedAnalysis(
    personA,
    personB,
    commonAncestor,
    distanceA,
    distanceB,
    pathFromAToAncestor,
    pathFromBToAncestor,
    people,
    isPrivacyRestricted
  );

  return {
    personA,
    personB,
    personADisplayName,
    personBDisplayName,
    commonAncestor,
    relationshipTitle,
    relationshipType,
    narrativeExplanation,
    executiveSummary: narrativeExplanation,
    paternalAnalysis,
    distanceA,
    distanceB,
    generationDiff: genDiff,
    pathFromAToAncestor,
    pathFromBToAncestor,
    fullLineageChain,
    isSameBranch,
    branchNameA: personA.branchName || 'فرع',
    branchNameB: personB.branchName || 'فرع',
    maternalKinship,
    crossAndGrandmothersKinship,
    inLawKinship,
    isPrivacyRestricted
  };
}
