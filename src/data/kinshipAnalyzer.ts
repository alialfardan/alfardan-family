import { ProcessedPerson, MotherInfo, SpouseInfo } from '../types/family';

export interface MaternalKinship {
  hasMaternalRelation: boolean;
  personAMother: MotherInfo | null;
  personBMother: MotherInfo | null;
  motherPersonA: ProcessedPerson | null;
  motherPersonB: ProcessedPerson | null;
  maternalTitle: string;
  maternalExplanation: string;
  maternalCommonAncestor: ProcessedPerson | null;
  maternalPathA: ProcessedPerson[];
  maternalPathB: ProcessedPerson[];
  maternalLineageChain: ProcessedPerson[];
  maternalDistanceA: number;
  maternalDistanceB: number;
}

export interface InLawDetail {
  spouse: SpouseInfo;
  wifePerson?: ProcessedPerson | null;
  relationType: 'direct_marriage' | 'wife_is_daughter' | 'wife_is_sister' | 'wife_is_aunt' | 'wife_is_cousin' | 'sister_in_law' | 'external_family' | 'other';
  title: string;
  explanation: string;
}

export interface InLawKinship {
  hasInLawRelation: boolean;
  isDirectSpouse: boolean;
  spousalTitle: string;
  spousalExplanation: string;
  inLawsA: InLawDetail[];
  inLawsB: InLawDetail[];
  areBrothersInLaw: boolean; // عدلاء (متزوجان شقيقتين)
  brotherInLawExplanation?: string;
}

export interface KinshipResult {
  personA: ProcessedPerson;
  personB: ProcessedPerson;
  commonAncestor: ProcessedPerson | null;
  relationshipTitle: string; // e.g. "ابن عم مباشر"
  relationshipType: 'self' | 'ancestor' | 'descendant' | 'sibling' | 'uncle_aunt' | 'nephew_niece' | 'cousin' | 'distant';
  narrativeExplanation: string; // detailed natural explanation
  distanceA: number; // steps from A up to common ancestor
  distanceB: number; // steps from B up to common ancestor
  generationDiff: number; // genA - genB
  pathFromAToAncestor: ProcessedPerson[];
  pathFromBToAncestor: ProcessedPerson[];
  fullLineageChain: ProcessedPerson[]; // complete path from A to B via LCA
  isSameBranch: boolean;
  branchNameA: string;
  branchNameB: string;

  // Maternal & Spousal Kinship
  maternalKinship: MaternalKinship;
  inLawKinship: InLawKinship;
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
 * Analyzes maternal relationships between Person A and Person B
 */
export function analyzeMaternalKinship(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>
): MaternalKinship {
  const motherA: MotherInfo | null = personA.mother || null;
  const motherB: MotherInfo | null = personB.mother || null;

  const motherPersonA = motherA?.personKey ? people.get(motherA.personKey) || null : null;
  const motherPersonB = motherB?.personKey ? people.get(motherB.personKey) || null : null;

  let hasMaternalRelation = false;
  let maternalTitle = '';
  let maternalExplanation = '';
  let maternalCommonAncestor: ProcessedPerson | null = null;
  let maternalPathA: ProcessedPerson[] = [];
  let maternalPathB: ProcessedPerson[] = [];
  let maternalDistanceA = -1;
  let maternalDistanceB = -1;

  // 1. Person B is Person A's Mother
  if (motherPersonA && motherPersonA.key === personB.key) {
    hasMaternalRelation = true;
    maternalTitle = 'الوالدة (أم مباشرة)';
    maternalExplanation = `«${personB.name}» هي الوالدة المباشرة لـ «${personA.name}».`;
    maternalCommonAncestor = motherPersonA;
    maternalPathA = [personA, motherPersonA];
    maternalPathB = [personB];
  }
  // 2. Person A is Person B's Mother
  else if (motherPersonB && motherPersonB.key === personA.key) {
    hasMaternalRelation = true;
    maternalTitle = 'ابن / ابنة (علاقة أمومة مباشرة)';
    maternalExplanation = `«${personA.name}» هي الوالدة المباشرة لـ «${personB.name}».`;
    maternalCommonAncestor = motherPersonB;
    maternalPathA = [personA];
    maternalPathB = [personB, motherPersonB];
  }
  // 3. Person B is Maternal Grandfather of Person A
  else if (motherPersonA && motherPersonA.parentKey === personB.key) {
    hasMaternalRelation = true;
    maternalTitle = personB.gender === 'f' ? 'جدة لأم' : 'جد لأم (والد الوالدة)';
    maternalExplanation = `«${personB.name}» هو الجد لأم لـ «${personA.name}» (والد والدته «${motherPersonA.name}»).`;
    maternalCommonAncestor = personB;
    maternalPathA = [personA, motherPersonA, personB];
    maternalPathB = [personB];
  }
  // 4. Person A is Maternal Grandfather of Person B
  else if (motherPersonB && motherPersonB.parentKey === personA.key) {
    hasMaternalRelation = true;
    maternalTitle = personA.gender === 'f' ? 'جدة لأم' : 'جد لأم (والد والدته)';
    maternalExplanation = `«${personA.name}» هو الجد لأم لـ «${personB.name}» (والد والدته «${motherPersonB.name}»).`;
    maternalCommonAncestor = personA;
    maternalPathA = [personA];
    maternalPathB = [personB, motherPersonB, personA];
  }
  // 5. Person B is Maternal Uncle or Aunt to Person A (Sibling of motherPersonA)
  else if (motherPersonA && motherPersonA.parentKey && personB.parentKey && motherPersonA.parentKey === personB.parentKey) {
    hasMaternalRelation = true;
    const maternalGrandpa = people.get(motherPersonA.parentKey);
    if (personB.gender === 'm') {
      maternalTitle = 'خال مباشر (شقيق الوالدة)';
      maternalExplanation = `«${personB.name}» هو خال مباشر لـ «${personA.name}» (شقيق والدته «${motherPersonA.name}»)، ويلتقيان في الجد لأم: «${maternalGrandpa?.name || 'الجد'}».`;
    } else {
      maternalTitle = 'خالة مباشرة (شقيقة الوالدة)';
      maternalExplanation = `«${personB.name}» هي خالة مباشرة لـ «${personA.name}» (شقيقة والدته «${motherPersonA.name}»)، وتلتقي معها في الجد لأم: «${maternalGrandpa?.name || 'الجد'}».`;
    }
    maternalCommonAncestor = maternalGrandpa || null;
    maternalPathA = [personA, motherPersonA, maternalGrandpa!].filter(Boolean);
    maternalPathB = [personB, maternalGrandpa!].filter(Boolean);
  }
  // 6. Person A is Maternal Uncle or Aunt to Person B (Sibling of motherPersonB)
  else if (motherPersonB && motherPersonB.parentKey && personA.parentKey && motherPersonB.parentKey === personA.parentKey) {
    hasMaternalRelation = true;
    const maternalGrandpa = people.get(motherPersonB.parentKey);
    if (personA.gender === 'm') {
      maternalTitle = 'خال مباشر (شقيق والدته)';
      maternalExplanation = `«${personA.name}» هو خال مباشر لـ «${personB.name}» (شقيق والدته «${motherPersonB.name}»).`;
    } else {
      maternalTitle = 'خالة مباشرة (شقيقة والدته)';
      maternalExplanation = `«${personA.name}» هي خالة مباشرة لـ «${personB.name}» (شقيقة والدته «${motherPersonB.name}»).`;
    }
    maternalCommonAncestor = maternalGrandpa || null;
    maternalPathA = [personA, maternalGrandpa!].filter(Boolean);
    maternalPathB = [personB, motherPersonB, maternalGrandpa!].filter(Boolean);
  }
  // 7. Both have mothers from the family
  else if (motherPersonA && motherPersonB) {
    // Same mother (إخوة لأم)
    if (motherPersonA.key === motherPersonB.key) {
      hasMaternalRelation = true;
      maternalTitle = 'إخوة لأم (مشتركان في نفس الوالدة)';
      maternalExplanation = `«${personA.name}» و«${personB.name}» والدتهما واحدة هي «${motherPersonA.name}»، وبذلك هما إخوة لأم.`;
      maternalCommonAncestor = motherPersonA;
      maternalPathA = [personA, motherPersonA];
      maternalPathB = [personB, motherPersonB];
    }
    // Mothers are sisters (أولاد خالة مباشرون)
    else if (motherPersonA.parentKey && motherPersonA.parentKey === motherPersonB.parentKey) {
      hasMaternalRelation = true;
      const maternalGrandpa = people.get(motherPersonA.parentKey);
      maternalTitle = 'أبناء خالات مباشرون (أولاد خالة)';
      maternalExplanation = `والدة «${personA.name}» («${motherPersonA.name}») ووالدة «${personB.name}» («${motherPersonB.name}») شقيقتان كريمتا «${maternalGrandpa?.name || 'الجد'}»، مما يجعلهما أبناء خالات مباشرين.`;
      maternalCommonAncestor = maternalGrandpa || null;
      maternalPathA = [personA, motherPersonA, maternalGrandpa!].filter(Boolean);
      maternalPathB = [personB, motherPersonB, maternalGrandpa!].filter(Boolean);
    }
    // Mothers share another common ancestor
    else {
      const lcaMothers = findLowestCommonAncestor(motherPersonA.key, motherPersonB.key, people);
      if (lcaMothers.ancestor) {
        hasMaternalRelation = true;
        maternalTitle = `أبناء عمومة أمهات (يلتقيان في ${lcaMothers.ancestor.name})`;
        maternalExplanation = `والدة الطرف الأول («${motherPersonA.name}») ووالدة الطرف الثاني («${motherPersonB.name}») تلتقيان في الجد المشترك للأمهات: «${lcaMothers.ancestor.name}»، وبذلك تجمعهما قرابة أرحام وأخوال.`;
        maternalCommonAncestor = lcaMothers.ancestor;
        maternalPathA = [personA, ...lcaMothers.path1];
        maternalPathB = [personB, ...lcaMothers.path2];
        maternalDistanceA = lcaMothers.distance1 + 1;
        maternalDistanceB = lcaMothers.distance2 + 1;
      }
    }
  }
  // 8. Person B shares LCA with motherPersonA
  else if (motherPersonA) {
    const lca = findLowestCommonAncestor(motherPersonA.key, personB.key, people);
    if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
      hasMaternalRelation = true;
      if (lca.distance1 === 2 && lca.distance2 === 2) {
        maternalTitle = 'ابن خال / ابن عم والدته';
        maternalExplanation = `«${personB.name}» هو ابن عم لوالدة «${personA.name}» («${motherPersonA.name}»)، ويلتقيان في الجد لأم «${lca.ancestor.name}».`;
      } else {
        maternalTitle = `قرابة من جهة والدة الطرف الأول (الأخوال)`;
        maternalExplanation = `«${personB.name}» يلتقي مع والدة «${personA.name}» («${motherPersonA.name}») في الجد المشترك لأم: «${lca.ancestor.name}».`;
      }
      maternalCommonAncestor = lca.ancestor;
      maternalPathA = [personA, ...lca.path1];
      maternalPathB = lca.path2;
    }
  }
  // 9. Person A shares LCA with motherPersonB
  else if (motherPersonB) {
    const lca = findLowestCommonAncestor(personA.key, motherPersonB.key, people);
    if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
      hasMaternalRelation = true;
      if (lca.distance1 === 2 && lca.distance2 === 2) {
        maternalTitle = 'ابن عم والدته (من قرابة الأخوال)';
        maternalExplanation = `«${personA.name}» هو ابن عم لوالدة «${personB.name}» («${motherPersonB.name}»)، ويلتقيان في الجد لأم «${lca.ancestor.name}».`;
      } else {
        maternalTitle = `قرابة من جهة والدة الطرف الثاني (الأخوال)`;
        maternalExplanation = `«${personA.name}» يلتقي مع والدة «${personB.name}» («${motherPersonB.name}») في الجد المشترك لأم: «${lca.ancestor.name}».`;
      }
      maternalCommonAncestor = lca.ancestor;
      maternalPathA = lca.path1;
      maternalPathB = [personB, ...lca.path2];
    }
  }

  // 10. External mother origin match
  if (!hasMaternalRelation && motherA?.familyOrigin && motherB?.familyOrigin) {
    if (motherA.familyOrigin.trim().toLowerCase() === motherB.familyOrigin.trim().toLowerCase()) {
      hasMaternalRelation = true;
      maternalTitle = `أخوال من نفس العائلة (${motherA.familyOrigin})`;
      maternalExplanation = `والدة الطرف الأول ووالدة الطرف الثاني تنتميان لنفس العائلة الكريمة: «${motherA.familyOrigin}».`;
    }
  }

  // Lineage chain for display
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
    maternalTitle,
    maternalExplanation,
    maternalCommonAncestor,
    maternalPathA,
    maternalPathB,
    maternalLineageChain,
    maternalDistanceA,
    maternalDistanceB
  };
}

/**
 * Analyzes in-law and spousal relationships between Person A and Person B
 */
export function analyzeInLawKinship(
  personA: ProcessedPerson,
  personB: ProcessedPerson,
  people: Map<string, ProcessedPerson>
): InLawKinship {
  let hasInLawRelation = false;
  let isDirectSpouse = false;
  let spousalTitle = '';
  let spousalExplanation = '';
  let areBrothersInLaw = false;
  let brotherInLawExplanation = '';

  const inLawsA: InLawDetail[] = [];
  const inLawsB: InLawDetail[] = [];

  const spousesA = personA.spouses || [];
  const spousesB = personB.spouses || [];

  // 1. Direct Marriage
  const aMarriedToB = spousesA.some(s => s.personKey === personB.key || s.name.trim() === personB.name.trim());
  const bMarriedToA = spousesB.some(s => s.personKey === personA.key || s.name.trim() === personA.name.trim());

  if (aMarriedToB || bMarriedToA) {
    hasInLawRelation = true;
    isDirectSpouse = true;
    spousalTitle = 'علاقة زوجية مباشرة (زوج وزوجة)';
    spousalExplanation = `«${personA.name}» و«${personB.name}» تربطهما علاقة زوجية مباشرة.`;
  }

  // 2. Person A's wives in-law relations with Person B
  spousesA.forEach(s => {
    if (s.isFromFamily && s.personKey) {
      const wifePerson = people.get(s.personKey);
      if (wifePerson) {
        // Wife is B's daughter
        if (wifePerson.parentKey === personB.key) {
          hasInLawRelation = true;
          inLawsA.push({
            spouse: s,
            wifePerson,
            relationType: 'wife_is_daughter',
            title: 'صهر مباشر (زوج ابنته)',
            explanation: `«${personA.name}» هو صهر لـ «${personB.name}»؛ حيث تزوج من ابنته «${wifePerson.name}».`
          });
        }
        // Wife is B's sister
        else if (wifePerson.parentKey && personB.parentKey && wifePerson.parentKey === personB.parentKey) {
          hasInLawRelation = true;
          inLawsA.push({
            spouse: s,
            wifePerson,
            relationType: 'wife_is_sister',
            title: 'صهر مباشر (زوج أخته)',
            explanation: `«${personA.name}» هو صهر لـ «${personB.name}»؛ حيث تزوج من شقيقته «${wifePerson.name}».`
          });
        }
        // Wife is cousin or related to B
        else {
          const lca = findLowestCommonAncestor(wifePerson.key, personB.key, people);
          if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
            hasInLawRelation = true;
            inLawsA.push({
              spouse: s,
              wifePerson,
              relationType: 'wife_is_cousin',
              title: 'نسيب عائلي (مصاهرة من العائلة)',
              explanation: `«${personA.name}» متزوج من «${wifePerson.name}» (ابنة عم ${personB.name})، ويلتقيان في الجد «${lca.ancestor.name}».`
            });
          }
        }
      }
    } else if (s.familyOrigin) {
      inLawsA.push({
        spouse: s,
        relationType: 'external_family',
        title: `مصاهرة مع عائلة ${s.familyOrigin}`,
        explanation: `زوجة «${personA.name}» («${s.name}») كريمة عائلة ${s.familyOrigin}.`
      });
    }
  });

  // 3. Person B's wives in-law relations with Person A
  spousesB.forEach(s => {
    if (s.isFromFamily && s.personKey) {
      const wifePerson = people.get(s.personKey);
      if (wifePerson) {
        // Wife is A's daughter
        if (wifePerson.parentKey === personA.key) {
          hasInLawRelation = true;
          inLawsB.push({
            spouse: s,
            wifePerson,
            relationType: 'wife_is_daughter',
            title: 'صهر مباشر (زوج ابنته)',
            explanation: `«${personB.name}» هو صهر لـ «${personA.name}»؛ حيث تزوج من ابنته «${wifePerson.name}».`
          });
        }
        // Wife is A's sister
        else if (wifePerson.parentKey && personA.parentKey && wifePerson.parentKey === personA.parentKey) {
          hasInLawRelation = true;
          inLawsB.push({
            spouse: s,
            wifePerson,
            relationType: 'wife_is_sister',
            title: 'صهر مباشر (زوج أخته)',
            explanation: `«${personB.name}» هو صهر لـ «${personA.name}»؛ حيث تزوج من شقيقته «${wifePerson.name}».`
          });
        }
        // Wife is cousin or related to A
        else {
          const lca = findLowestCommonAncestor(wifePerson.key, personA.key, people);
          if (lca.ancestor && lca.distance1 <= 3 && lca.distance2 <= 3) {
            hasInLawRelation = true;
            inLawsB.push({
              spouse: s,
              wifePerson,
              relationType: 'wife_is_cousin',
              title: 'نسيب عائلي (مصاهرة من العائلة)',
              explanation: `«${personB.name}» متزوج من «${wifePerson.name}» (ابنة عم ${personA.name})، ويلتقيان في الجد «${lca.ancestor.name}».`
            });
          }
        }
      }
    } else if (s.familyOrigin) {
      inLawsB.push({
        spouse: s,
        relationType: 'external_family',
        title: `مصاهرة مع عائلة ${s.familyOrigin}`,
        explanation: `زوجة «${personB.name}» («${s.name}») كريمة عائلة ${s.familyOrigin}.`
      });
    }
  });

  // 4. العدلاء (Both married to sisters from the family)
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
        brotherInLawExplanation = `«${personA.name}» و«${personB.name}» عديلان؛ متزوجان من شقيقتين هما «${wA.name}» و«${wB.name}» كريمتا «${fatherInLaw?.name || 'والدهما'}».`;
        break;
      }
    }
    if (areBrothersInLaw) break;
  }

  // Derive top spousal title if not set yet
  if (!spousalTitle) {
    if (areBrothersInLaw) {
      spousalTitle = 'عدلاء (متزوجان من شقيقتين)';
      spousalExplanation = brotherInLawExplanation;
    } else if (inLawsA.some(i => i.relationType === 'wife_is_daughter')) {
      spousalTitle = 'صهر (زوج ابنته)';
      spousalExplanation = inLawsA.find(i => i.relationType === 'wife_is_daughter')!.explanation;
    } else if (inLawsB.some(i => i.relationType === 'wife_is_daughter')) {
      spousalTitle = 'صهر (زوج ابنته)';
      spousalExplanation = inLawsB.find(i => i.relationType === 'wife_is_daughter')!.explanation;
    } else if (inLawsA.some(i => i.relationType === 'wife_is_sister')) {
      spousalTitle = 'صهر (زوج أخته)';
      spousalExplanation = inLawsA.find(i => i.relationType === 'wife_is_sister')!.explanation;
    } else if (inLawsB.some(i => i.relationType === 'wife_is_sister')) {
      spousalTitle = 'صهر (زوج أخته)';
      spousalExplanation = inLawsB.find(i => i.relationType === 'wife_is_sister')!.explanation;
    } else if (inLawsA.some(i => i.relationType === 'wife_is_cousin')) {
      spousalTitle = 'نسيب عائلي (مصاهرة في العائلة)';
      spousalExplanation = inLawsA.find(i => i.relationType === 'wife_is_cousin')!.explanation;
    } else if (inLawsB.some(i => i.relationType === 'wife_is_cousin')) {
      spousalTitle = 'نسيب عائلي (مصاهرة في العائلة)';
      spousalExplanation = inLawsB.find(i => i.relationType === 'wife_is_cousin')!.explanation;
    }
  }

  return {
    hasInLawRelation,
    isDirectSpouse,
    spousalTitle,
    spousalExplanation,
    inLawsA,
    inLawsB,
    areBrothersInLaw,
    brotherInLawExplanation
  };
}

/**
 * Analyzes the complete genealogical relationship between Person A and Person B.
 * Person A is the subject (الطرف الأول), Person B is the reference (الطرف الثاني).
 * Explains paternal, maternal, and in-law kinship thoroughly.
 */
export function analyzeKinship(
  keyA: string,
  keyB: string,
  people: Map<string, ProcessedPerson>
): KinshipResult | null {
  const personA = people.get(keyA);
  const personB = people.get(keyB);

  if (!personA || !personB) return null;

  // Compute Maternal & In-law kinship first
  const maternalKinship = analyzeMaternalKinship(personA, personB, people);
  const inLawKinship = analyzeInLawKinship(personA, personB, people);

  // 1. Same Person
  if (keyA === keyB) {
    return {
      personA,
      personB,
      commonAncestor: personA,
      relationshipTitle: 'نفس الشخص (المقارنة مع الذات)',
      relationshipType: 'self',
      narrativeExplanation: `الطرف الأول والطرف الثاني هما نفس الفرد: «${personA.name}».`,
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
      inLawKinship
    };
  }

  const pathA = getAncestorsPath(keyA, people);
  const pathB = getAncestorsPath(keyB, people);

  // Find Lowest Common Ancestor (LCA)
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
    return {
      personA,
      personB,
      commonAncestor: null,
      relationshipTitle: 'لا يوجد جد أبوي مشترك مسجل',
      relationshipType: 'distant',
      narrativeExplanation: `لم يتم العثور على جد مشترك من جهة الأب في المشجر يجمع بين «${personA.name}» و«${personB.name}».`,
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
      inLawKinship
    };
  }

  const pathFromAToAncestor = pathA.slice(0, distanceA + 1);
  const pathFromBToAncestor = pathB.slice(0, distanceB + 1);

  // Full lineage chain from A up to Ancestor, then down to B
  const fullLineageChain: ProcessedPerson[] = [
    ...pathFromAToAncestor,
    ...pathFromBToAncestor.slice(0, -1).reverse()
  ];

  const isMaleA = personA.gender === 'm';
  const genDiff = personA.generation - personB.generation;
  const isSameBranch = personA.branch === personB.branch;

  let relationshipTitle = '';
  let relationshipType: KinshipResult['relationshipType'] = 'cousin';
  let narrativeExplanation = '';

  // Case: A is an ancestor of B
  if (distanceA === 0 && distanceB > 0) {
    relationshipType = 'ancestor';
    if (distanceB === 1) {
      relationshipTitle = isMaleA ? 'والد (أب)' : 'والدة (أم)';
      narrativeExplanation = `«${personA.name}» هو الوالد المباشر لـ «${personB.name}».`;
    } else if (distanceB === 2) {
      relationshipTitle = isMaleA ? 'جد مباشر' : 'جدة مباشرة';
      const mid = pathFromBToAncestor[1];
      narrativeExplanation = `«${personA.name}» هو الجد لـ «${personB.name}» (والد ${mid?.name}).`;
    } else if (distanceB === 3) {
      relationshipTitle = isMaleA ? 'والد الجد (الجد الثاني)' : 'والدة الجد';
      narrativeExplanation = `«${personA.name}» هو والد جد «${personB.name}» بفارق ثلاثة أجيال.`;
    } else {
      relationshipTitle = `جد من الجيل (${distanceB})`;
      narrativeExplanation = `«${personA.name}» هو جد أعلى لـ «${personB.name}» يفصل بينهما ${distanceB} أجيال.`;
    }
  }
  // Case: B is an ancestor of A (A is descendant of B)
  else if (distanceB === 0 && distanceA > 0) {
    relationshipType = 'descendant';
    if (distanceA === 1) {
      relationshipTitle = isMaleA ? 'ابن مباشر' : 'ابنة مباشرة';
      narrativeExplanation = `«${personA.name}» هو ابن مباشر لـ «${personB.name}».`;
    } else if (distanceA === 2) {
      relationshipTitle = isMaleA ? 'حفيد مباشر' : 'حفيدة مباشرة';
      const mid = pathFromAToAncestor[1];
      narrativeExplanation = `«${personA.name}» هو حفيد لـ «${personB.name}» (ابن ${mid?.name}).`;
    } else if (distanceA === 3) {
      relationshipTitle = isMaleA ? 'ابن حفيد (الجيل الثالث)' : 'ابنة حفيد';
      narrativeExplanation = `«${personA.name}» هو ابن حفيد لـ «${personB.name}».`;
    } else {
      relationshipTitle = `من أحفاد وذرية الجيل (${distanceA})`;
      narrativeExplanation = `«${personA.name}» من سلالة وذرية «${personB.name}» بفارق ${distanceA} أجيال.`;
    }
  }
  // Case: Siblings (Same parents)
  else if (distanceA === 1 && distanceB === 1) {
    relationshipType = 'sibling';
    relationshipTitle = isMaleA ? 'أخ شقيق / مباشر' : 'أخت شقيقة / مباشرة';
    narrativeExplanation = `«${personA.name}» و«${personB.name}» إخوة مشتركان في الوالد: «${commonAncestor.name}».`;
  }
  // Case: A is Uncle/Aunt to B (A is brother/sister of B's ancestor)
  else if (distanceA === 1 && distanceB > 1) {
    relationshipType = 'uncle_aunt';
    if (distanceB === 2) {
      relationshipTitle = isMaleA ? 'عم مباشر (أخ والده)' : 'عمة مباشرة (أخت والده)';
      const fatherB = pathFromBToAncestor[1];
      narrativeExplanation = `«${personA.name}» هو عم «${personB.name}» (شقيق والده ${fatherB?.name})، ويلتقيان في الجد «${commonAncestor.name}».`;
    } else if (distanceB === 3) {
      relationshipTitle = isMaleA ? 'عم والد (العم الأكبر)' : 'عمة والد (العمة الكبرى)';
      const grandFatherB = pathFromBToAncestor[2];
      narrativeExplanation = `«${personA.name}» هو شقيق جد «${personB.name}» (${grandFatherB?.name})، أي عم والده، ويلتقيان في والد الجد «${commonAncestor.name}».`;
    } else {
      relationshipTitle = `عم من أجداد الجيل (${distanceB - 1})`;
      narrativeExplanation = `«${personA.name}» هو عم أحد أجداد «${personB.name}»، ويلتقيان في الجد «${commonAncestor.name}».`;
    }
  }
  // Case: B is Uncle/Aunt to A (A is nephew/niece to B)
  else if (distanceB === 1 && distanceA > 1) {
    relationshipType = 'nephew_niece';
    if (distanceA === 2) {
      relationshipTitle = isMaleA ? 'ابن أخ مباشر' : 'ابنة أخ مباشرة';
      const fatherA = pathFromAToAncestor[1];
      narrativeExplanation = `«${personA.name}» هو ابن أخ لـ «${personB.name}» (والده ${fatherA?.name} هو شقيق ${personB.name})، ويلتقيان في الوالد/الجد «${commonAncestor.name}».`;
    } else if (distanceA === 3) {
      relationshipTitle = isMaleA ? 'حفيد أخ (ابن ابن أخ)' : 'حفيدة أخ (ابنة ابن أخ)';
      narrativeExplanation = `«${personA.name}» هو حفيد أخ لـ «${personB.name}»، حيث يفصله جيلان عن أخ ${personB.name}.`;
    } else {
      relationshipTitle = `من ذرية وأحفاد أخ «${personB.name}»`;
      narrativeExplanation = `«${personA.name}» ينحدر من ذرية أخ «${personB.name}» بفارق ${distanceA} أجيال.`;
    }
  }
  // Case: Cousins (أبناء عمومة)
  else {
    relationshipType = 'cousin';
    // Both same distance from LCA
    if (distanceA === distanceB) {
      if (distanceA === 2) {
        relationshipTitle = isMaleA ? 'ابن عم مباشر' : 'ابنة عم مباشرة';
        narrativeExplanation = `«${personA.name}» و«${personB.name}» أبناء عمومة مباشرون في نفس الجيل، والجد المشترك المباشر لهما هو: «${commonAncestor.name}».`;
      } else if (distanceA === 3) {
        relationshipTitle = isMaleA ? 'ابن عم من الدرجة الثانية' : 'ابنة عم من الدرجة الثانية';
        narrativeExplanation = `«${personA.name}» و«${personB.name}» أولاد عمومة من الدرجة الثانية (أبناء عمومة الآباء)، ويلتقيان في والد الجد المشترك: «${commonAncestor.name}».`;
      } else if (distanceA === 4) {
        relationshipTitle = isMaleA ? 'ابن عم من الدرجة الثالثة' : 'ابنة عم من الدرجة الثالثة';
        narrativeExplanation = `«${personA.name}» و«${personB.name}» يلتقيان في الجد الثالث المشترك: «${commonAncestor.name}».`;
      } else {
        const degree = distanceA - 1;
        relationshipTitle = isMaleA ? `ابن عم من الدرجة (${degree})` : `ابنة عم من الدرجة (${degree})`;
        narrativeExplanation = `«${personA.name}» و«${personB.name}» في نفس الجيل ويلتقيان في الجد المشترك: «${commonAncestor.name}» بعد ${distanceA} أجيال صعوداً.`;
      }
    }
    // A is in an older generation than B (distanceA < distanceB)
    else if (distanceA < distanceB) {
      if (distanceA === 2 && distanceB === 3) {
        relationshipTitle = isMaleA ? 'ابن عم والد (في مقام العم)' : 'ابنة عم والد';
        const fatherB = pathFromBToAncestor[1];
        narrativeExplanation = `«${personA.name}» هو ابن عم لوالد «${personB.name}» (${fatherB?.name})، والجد المشترك الذي يجمعهما هو: «${commonAncestor.name}».`;
      } else if (distanceA === 2 && distanceB === 4) {
        relationshipTitle = isMaleA ? 'ابن عم جد' : 'ابنة عم جد';
        narrativeExplanation = `«${personA.name}» هو ابن عم لجد «${personB.name}»، ويلتقيان في الجد «${commonAncestor.name}».`;
      } else if (distanceA === 3 && distanceB === 4) {
        relationshipTitle = isMaleA ? 'ابن عم والد من الدرجة الثانية' : 'ابنة عم والد من الدرجة الثانية';
        narrativeExplanation = `«${personA.name}» هو ابن عم من الدرجة الثانية لوالد «${personB.name}» بفارق جيل واحد.`;
      } else {
        const genGap = distanceB - distanceA;
        relationshipTitle = isMaleA
          ? `ابن عم من جيل الأجداد (أعلى بـ ${genGap} ${genGap === 1 ? 'جيل' : 'أجيال'})`
          : `ابنة عم من جيل الأجداد`;
        narrativeExplanation = `«${personA.name}» يلتقي مع «${personB.name}» في الجد المشترك «${commonAncestor.name}»، والطرف الأول يسبق الطرف الثاني بـ ${genGap} أجيال.`;
      }
    }
    // A is in a younger generation than B (distanceA > distanceB)
    else {
      if (distanceA === 3 && distanceB === 2) {
        relationshipTitle = isMaleA ? 'ابن ابن عم' : 'ابنة ابن عم';
        const fatherA = pathFromAToAncestor[1];
        narrativeExplanation = `«${personA.name}» هو ابن لـ (${fatherA?.name}) الذي يعد ابن عم مباشر لـ «${personB.name}»، ويلتقيان في الجد: «${commonAncestor.name}».`;
      } else if (distanceA === 4 && distanceB === 2) {
        relationshipTitle = isMaleA ? 'حفيد ابن عم' : 'حفيدة ابن عم';
        narrativeExplanation = `«${personA.name}» هو حفيد لابن عم «${personB.name}»، ويلتقيان في الجد «${commonAncestor.name}».`;
      } else if (distanceA === 4 && distanceB === 3) {
        relationshipTitle = isMaleA ? 'ابن ابن عم من الدرجة الثانية' : 'ابنة ابن عم من الدرجة الثانية';
        narrativeExplanation = `«${personA.name}» هو ابن لأحد أبناء عمومة «${personB.name}» من الدرجة الثانية.`;
      } else {
        const genGap = distanceA - distanceB;
        relationshipTitle = isMaleA
          ? `ابن عم من ذرية الأحفاد (أصغر بـ ${genGap} ${genGap === 1 ? 'جيل' : 'أجيال'})`
          : `ابنة عم من ذرية الأحفاد`;
        narrativeExplanation = `«${personA.name}» يلتقي مع «${personB.name}» في الجد المشترك «${commonAncestor.name}»، والطرف الأول يأتي بعد الطرف الثاني بـ ${genGap} أجيال في عمود النسب.`;
      }
    }
  }

  return {
    personA,
    personB,
    commonAncestor,
    relationshipTitle,
    relationshipType,
    narrativeExplanation,
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
    inLawKinship
  };
}
