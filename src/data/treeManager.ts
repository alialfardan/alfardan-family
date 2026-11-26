import initialData from './initialTreeData.json';
import { RawTreeNode, AddedMember, MemberOverrides, FamilyState, ProcessedPerson, ArchivalPhoto, MotherInfo, SpouseInfo, ContactInfo, NotableFigure } from '../types/family';

export const RAW_TREE: RawTreeNode = initialData.treeData as unknown as RawTreeNode;
export const DEFAULT_FAMILY_DATA: FamilyState = initialData.familyData as unknown as FamilyState;

export const DEFAULT_ARCHIVAL_PHOTOS: ArchivalPhoto[] = [
  {
    id: 'photo_doc_original',
    title: 'مخطوطة شجرة نسب عائلة الفردان الأصلية',
    url: '/assets/aistudio/original_252a7942.jpg',
    category: 'documents',
    era: '1442 هـ / 2020 م (محققة عن الأصول)',
    location: 'كرزكان - مملكة البحرين',
    notes: 'الوثيقة التاريخية الكبرى المحفوظة التي جمعت وحققت أسماء ذرية عائلة الفردان الكرزكاني ابتداءً من الجد الأكبر الشيخ علي، وتفرع ذرية عبد الحسين بن يوسف بن الشيخ علي إلى فردان (الذي يتفرع منه ابنان هما: محمد وحسين وذريتهما) وأيوب (والد فردان الذي يتفرع منه عبدالله وذريته). خطها وحققها المرحوم الحاج كاظم بن إبراهيم بن علي الفردان، وتعد المرجع المعتمد الأول لنسب وتفرعات العائلة.',
    taggedPersonKeys: ['ot0', 'ot2', 'am_mvzm8u6pyafp', 'oF', 'o4', 'o13', 'o15'],
    createdAt: 1609459200000,
    addedBy: 'إدارة شجرة آل فردان'
  },
  {
    id: 'photo_emblem',
    title: 'شعار وهوية عائلة الفردان الكرزكاني',
    url: '/fardan-logo.jpg',
    category: 'heritage',
    era: 'الإصدار المعتمد',
    location: 'كرزكان',
    notes: 'الشعار الرسمي المعتمد لعائلة الفردان، يرمز لأصالة الشجرة وعمق جذورها التاريخية في أرض كرزكان ومملكة البحرين، ويجمع بين الهيبة والتراث المعماري الأصيل.',
    taggedPersonKeys: ['oF'],
    createdAt: 1640995200000,
    addedBy: 'إدارة شجرة آل فردان'
  },
  {
    id: 'photo_classic_archive',
    title: 'صورة التوثيق التاريخي لشجرة آل فردان',
    url: '/original.jpg',
    category: 'historical',
    era: 'الأرشيف التراثي',
    location: 'مملكة البحرين',
    notes: 'صورة أرشيفية توثق مسودة حفظ الأنساب وتدوين أسماء الأجداد والآباء في كرزكان، والتي شكلت النواة الأولى لتدوين المشجر العائلي المعتمد.',
    taggedPersonKeys: ['oF', 'ot3', 'ot2'],
    createdAt: 1672531200000,
    addedBy: 'أرشيف العائلة'
  }
];

export const LEGACY_REMOVED_NOTABLE_IDS = new Set<string>([
  'notable_sheikh_ali',
  'notable_al_fardan_founder',
  'notable_fardan_ayoub',
  'notable_mohammad_founder',
  'notable_hussain_founder',
  'notable_abdullah_founder',
  'notable_mulla_hussain'
]);

export const DEFAULT_NOTABLE_FIGURES: NotableFigure[] = [
  {
    id: 'notable_kadhim_ibrahim',
    personKey: 'o163',
    name: 'الحاج كاظم بن إبراهيم بن علي بن محمد الفردان',
    title: 'مؤرخ العائلة وناسخ مخطوطة شجرة النسب الأصلية',
    branch: 'ذرية محمد',
    birthDeath: 'توفي في 23 أغسطس 2020 م (رحمه الله)',
    era: 'العصر الحديث - كرزكان',
    biography: 'المرحوم الحاج كاظم بن إبراهيم بن علي بن محمد بن فردان (رحمه الله)، المؤرخ والنسّابة والخطاط الذي كرّس جهده ووقته لجمع وتحقيق وتدوين «مخطوطة شجرة نسب عائلة الفردان الكرزكاني الأصلية». قام رحمه الله بتتبع الأصول والروايات الموثقة عن كبار العائلة وأعيانها، وخطّ بيده المشجر الجامع الذي حفظ أنساب العائلة وفروعها الثلاثة الكبرى للأجيال الحاضرة والقادمة.',
    achievements: [
      'تحقيق ونسخ وتوثيق مخطوطة شجرة نسب عائلة الفردان الأصلية المعتمدة',
      'حفظ تسلسل الأجيال والربط التاريخي الدقيق بين فروع العائلة الثلاثة في كرزكان',
      'مرجع تاريخي معتمد في تدوين أخبار وأنساب رجالات آل فردان'
    ],
    manuscripts: [
      {
        id: 'ms_kadhim_1',
        title: 'المخطوطة الكاملة لشجرة نسب عائلة الفردان بخط وتحقيق الحاج كاظم بن إبراهيم',
        url: '/assets/aistudio/original_252a7942.jpg',
        era: 'محرم 1442 هـ / أغسطس 2020 م',
        description: 'النسخة المعتمدة التي حققها وخطّها المرحوم الحاج كاظم بن إبراهيم الفردان، وتحمل توقيعه وتوثيقه التاريخي في أسفل المخطوطة.'
      }
    ],
    createdAt: 1704067230000,
    updatedAt: 1704067230000
  },
  {
    id: 'notable_mulla_ali_mahfoudh',
    personKey: 'o152',
    name: 'الملا علي بن محفوظ بن محسن الفردان',
    title: 'خطيب وأديب من رجالات العائلة البارزين',
    branch: 'ذرية محمد',
    birthDeath: 'من أعلام القرن الرابع عشر الهجري (رحمه الله)',
    era: 'الجيل الثامن - كرزكان',
    biography: 'الملا علي بن محفوظ بن محسن بن محمد بن فردان (رحمه الله)، من الخطباء والوجهاء المعروفين بالبيان وحسن الخلق وخدمة المجتمع في كرزكان. كان له حضور فاعل في المناسبات الدينية والاجتماعية وحفظ السيرة العطرة للآباء والأجداد.',
    achievements: [
      'من خطباء وأدباء عائلة الفردان في كرزكان',
      'حضور اجتماعي وثقافي مؤثر في خدمة الأهالي والمجالس العامرة'
    ],
    manuscripts: [],
    createdAt: 1704067280000,
    updatedAt: 1704067280000
  }
];

function isLegacyRemovedNotable(item: NotableFigure): boolean {
  if (!item || !item.id) return false;
  if (item.deleted === true) return true;
  const itemTs = typeof item.updatedAt === 'number' ? item.updatedAt : (item.createdAt || 0);
  if (LEGACY_REMOVED_NOTABLE_IDS.has(item.id) && itemTs <= 1704067300000) {
    return true;
  }
  return false;
}

export function resolveNotableFigures(saved?: NotableFigure[] | null): NotableFigure[] {
  if (!Array.isArray(saved)) {
    return [...DEFAULT_NOTABLE_FIGURES];
  }
  const byId = new Map<string, NotableFigure>();
  for (const item of saved) {
    if (!item || !item.id) continue;
    if (isLegacyRemovedNotable(item)) {
      byId.set(item.id, {
        ...item,
        name: item.name || item.id,
        personKey: item.personKey || 'oF',
        title: item.title || '',
        branch: item.branch || '',
        birthDeath: item.birthDeath || '',
        biography: item.biography || '',
        deleted: true,
        updatedAt: Math.max(item.updatedAt || 0, 1743850000000)
      });
      continue;
    }
    if (item.name) {
      const existing = byId.get(item.id);
      const existingTs = existing?.updatedAt || existing?.createdAt || 0;
      const itemTs = item.updatedAt || item.createdAt || 0;
      if (!existing || itemTs >= existingTs) {
        byId.set(item.id, {
          ...(existing || {}),
          ...item,
          deleted: item.deleted === true,
          manuscripts: Array.isArray(item.manuscripts)
            ? item.manuscripts
            : (existing?.manuscripts || []),
          achievements: Array.isArray(item.achievements)
            ? item.achievements
            : (existing?.achievements || [])
        });
      }
    }
  }
  return Array.from(byId.values());
}

export function mergeNotableFiguresLists(
  baseList?: NotableFigure[],
  incList?: NotableFigure[],
  forceIncomingAuthoritative: boolean = false
): NotableFigure[] {
  const byId = new Map<string, NotableFigure>();

  const applyItem = (rawItem: NotableFigure, isIncoming: boolean) => {
    if (!rawItem || !rawItem.id) return;
    const item: NotableFigure = isLegacyRemovedNotable(rawItem)
      ? {
          ...rawItem,
          name: rawItem.name || rawItem.id,
          personKey: rawItem.personKey || 'oF',
          title: rawItem.title || '',
          branch: rawItem.branch || '',
          birthDeath: rawItem.birthDeath || '',
          biography: rawItem.biography || '',
          deleted: true,
          updatedAt: Math.max(rawItem.updatedAt || 0, 1743850000000)
        }
      : rawItem;

    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }

    const exAt = existing.updatedAt || existing.createdAt || 0;
    const incAt = item.updatedAt || item.createdAt || 0;
    const itemWins = (isIncoming && forceIncomingAuthoritative) || incAt > exAt || (incAt === exAt && isIncoming);

    if (itemWins) {
      byId.set(item.id, {
        ...existing,
        ...item,
        deleted: item.deleted === true,
        updatedAt: Math.max(exAt, incAt)
      });
    } else if (existing.deleted === true && incAt <= exAt) {
      // Never resurrect a figure that was deleted at a newer or equal timestamp
      byId.set(item.id, existing);
    }
  };

  if (!Array.isArray(baseList) && !Array.isArray(incList)) {
    return [...DEFAULT_NOTABLE_FIGURES];
  }

  // If one list explicitly omitted a default figure (e.g. deleted directly in JSON), mark it deleted unless the other list has a newer edit
  const baseIds = new Set((baseList || []).map(x => x?.id).filter(Boolean));
  const incIds = new Set((incList || []).map(x => x?.id).filter(Boolean));

  for (const b of baseList || []) {
    applyItem(b, false);
  }
  for (const i of incList || []) {
    applyItem(i, true);
  }

  // If incoming is authoritative and omitted an item that was only an old initial seed (updatedAt <= 1704067300000), mark it deleted
  if (Array.isArray(incList) && incList.length > 0) {
    for (const [id, current] of byId.entries()) {
      const curTs = current.updatedAt || current.createdAt || 0;
      if (!incIds.has(id) && curTs <= 1704067300000) {
        byId.set(id, { ...current, deleted: true, updatedAt: 1743850000000 });
      } else if (!baseIds.has(id) && Array.isArray(baseList) && baseList.length > 0 && curTs <= 1704067300000) {
        byId.set(id, { ...current, deleted: true, updatedAt: 1743850000000 });
      }
    }
  }

  return Array.from(byId.values());
}

const STORAGE_KEY = 'fardan_family_tree_state_v5';
const CUSTOM_AVATARS_STORAGE_KEY = 'fardan_custom_avatars_v2';

const VALID_PHOTO_KEY_RE = /^[a-zA-Z0-9_-]+$/;

function getAvatarUrlVersion(url?: string): number {
  if (!url || typeof url !== 'string') return 0;
  const m = url.match(/[?&]v=(\d+)/);
  return m ? parseInt(m[1], 10) || 0 : 0;
}

const DEAD_PHOTO_KEYS = new Set([
  '1', '2', '33b3fde3-0f05-44d6-9aad-af4eadc51ce9'
]);

// Stale photo timestamps at or below which legacy broken URLs are ignored, while any new photo upload is accepted
const STALE_PHOTO_CUTOFF_BY_KEY: Record<string, number> = {
  o560: 1794830042524,
  o720: 1794700000000,
  am_mvr3piu7h618: 1794700000000,
  o310: 1794700000000,
  o656: 1794700000000,
  o652: 1794700000000,
};

export function isValidPhotoEntry(key: string, val: unknown): val is string {
  if (!key || !VALID_PHOTO_KEY_RE.test(key) || DEAD_PHOTO_KEYS.has(key)) return false;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (
    trimmed.includes(' ') ||
    trimmed.includes('%20') ||
    trimmed.includes('WhatsApp') ||
    trimmed.includes('\\')
  ) {
    return false;
  }
  const cutoff = STALE_PHOTO_CUTOFF_BY_KEY[key];
  if (cutoff && getAvatarUrlVersion(trimmed) <= cutoff) {
    return false;
  }
  return true;
}

export function loadCustomAvatarsBackup(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_AVATARS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isValidPhotoEntry(k, v) && v.trim().startsWith('data:image/')) {
        clean[k] = v.trim();
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveCustomAvatarBackup(key: string, dataUrl: string): void {
  if (!key || !dataUrl || !isValidPhotoEntry(key, dataUrl)) return;
  try {
    // Only back up compact base64 strings under 150KB to preserve localStorage quota
    if (dataUrl.length > 200000) return;
    const current = loadCustomAvatarsBackup();
    current[key] = dataUrl;
    // Cap to at most 15 recent avatar backups to stay well below 1MB
    const keys = Object.keys(current);
    if (keys.length > 15) {
      for (let i = 0; i < keys.length - 15; i++) {
        delete current[keys[i]];
      }
    }
    try {
      localStorage.setItem(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(current));
    } catch {
      cleanupObsoleteStorageKeys();
      try {
        localStorage.setItem(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(current));
      } catch {
        try { localStorage.removeItem(CUSTOM_AVATARS_STORAGE_KEY); } catch {}
      }
    }
  } catch {}
}

export function removeCustomAvatarBackup(key: string): void {
  if (!key) return;
  try {
    const current = loadCustomAvatarsBackup();
    delete current[key];
    localStorage.setItem(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export function cleanupObsoleteStorageKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    const legacyKeys = [
      'fardan_family_tree_state_v4',
      'fardan_family_tree_state_v3',
      'fardan_family_tree_state_v2',
      'fardan_family_tree_state_v1',
      'fardan_family_tree_state',
      'fardan_custom_avatars_v1',
      'fardan_firestore_quota_exhausted_v2',
      'fardan_firestore_quota_exhausted'
    ];
    for (const lk of legacyKeys) {
      try { localStorage.removeItem(lk); } catch {}
    }
    // One-time cleanup of any stale o560 avatar reference in localStorage
    if (!localStorage.getItem('fardan_o560_stale_photo_cleared_v1')) {
      try {
        const rawCustom = localStorage.getItem(CUSTOM_AVATARS_STORAGE_KEY);
        if (rawCustom) {
          const parsedCustom = JSON.parse(rawCustom);
          if (parsedCustom && typeof parsedCustom === 'object' && 'o560' in parsedCustom) {
            delete parsedCustom.o560;
            localStorage.setItem(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(parsedCustom));
          }
        }
      } catch {}
      try {
        const rawState = localStorage.getItem(STORAGE_KEY);
        if (rawState) {
          const parsedState = JSON.parse(rawState);
          if (parsedState?.photos && 'o560' in parsedState.photos) {
            delete parsedState.photos.o560;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedState));
          }
        }
      } catch {}
      try {
        localStorage.setItem('fardan_o560_stale_photo_cleared_v1', '1');
      } catch {}
    }
  } catch {}
}

// Automatically clean up stale keys on page load
try { cleanupObsoleteStorageKeys(); } catch {}


// Preserve exact Arabic name spellings as entered without adding hamzas or altering characters
export function standardizeArabicSpelling(text: string): string {
  if (!text) return '';
  return text.trim();
}

export function cleanPhotosMap(photos?: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!photos || typeof photos !== 'object') return clean;
  for (const [k, v] of Object.entries(photos)) {
    if (v === '') {
      // Explicit removal marker for a valid person key
      if (VALID_PHOTO_KEY_RE.test(k) && !DEAD_PHOTO_KEYS.has(k)) {
        clean[k] = '';
      }
    } else if (isValidPhotoEntry(k, v)) {
      clean[k] = v.trim();
    }
  }
  return clean;
}

const BASELINE_SAFE_TS = Math.max(1794830043000, Number(DEFAULT_FAMILY_DATA?.updatedAt) || 0);

export function normalizeTimestamp(ts?: number | null): number {
  if (!ts || typeof ts !== 'number' || ts <= 0) return 0;
  return ts;
}

export function getMonotonicTimestamp(currentState?: Partial<FamilyState> | number): number {
  const rawNow = Date.now();
  if (typeof currentState === 'number') {
    return Math.max(rawNow, BASELINE_SAFE_TS + 100, normalizeTimestamp(currentState) + 100);
  }
  const stateUpdated = normalizeTimestamp(currentState?.updatedAt);
  let maxMemberAt = 0;
  if (Array.isArray(currentState?.members)) {
    for (const m of currentState.members) {
      const mAt = normalizeTimestamp(m?.at);
      if (mAt > maxMemberAt) maxMemberAt = mAt;
    }
  }
  let maxOverAt = 0;
  if (currentState?.over && typeof currentState.over === 'object') {
    for (const ov of Object.values(currentState.over)) {
      const oAt = normalizeTimestamp(ov?.at);
      if (oAt > maxOverAt) maxOverAt = oAt;
    }
  }
  const highestExisting = Math.max(stateUpdated, maxMemberAt, maxOverAt, BASELINE_SAFE_TS);
  return Math.max(rawNow, highestExisting + 100);
}

// Normalize Arabic strings for intelligent and forgiving search
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[ًٌٍَُِّْـ]/g, '') // remove tashkeel and tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/عبد\s+ال/g, 'عبدال')
    .replace(/عبد\s+ع/g, 'عبدع')
    .replace(/^(ملا|الشهيد|الشيخ|المرحوم|الحاج)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getArabicInitial(name: string): string {
  if (!name) return '؟';
  const clean = name.replace(/^(ملا|الشهيد|الشيخ|المرحوم|الحاج)\s+/g, '').trim();
  return clean[0] || '؟';
}

// Arabic number formatting & pluralization
export const ARABIC_ORDINALS = [
  'الجد الأول',
  'الجيل الأول',
  'الجيل الثاني',
  'الجيل الثالث',
  'الجيل الرابع',
  'الجيل الخامس',
  'الجيل السادس',
  'الجيل السابع',
  'الجيل الثامن',
  'الجيل التاسع',
  'الجيل العاشر',
  'الجيل الحادي عشر',
  'الجيل الثاني عشر',
  'الجيل الثالث عشر',
  'الجيل الرابع عشر'
];

export function formatArabicCount(n: number, singular: string, dual: string, pluralFew: string, pluralMany: string): string {
  if (n === 0) return `لا يوجد ${pluralFew}`;
  if (n === 1) return singular;
  if (n === 2) return dual;
  const rem = n % 100;
  if (rem >= 3 && rem <= 10) return `${n.toLocaleString('ar-EG')} ${pluralFew}`;
  return `${n.toLocaleString('ar-EG')} ${pluralMany}`;
}

function mergeTwoMemberRecords(existing: AddedMember, incoming: AddedMember, forceIncoming: boolean = false): AddedMember {
  const existingAt = normalizeTimestamp(existing.at);
  const incomingAt = normalizeTimestamp(incoming.at);
  const incomingIsNewer = forceIncoming ? true : (incomingAt >= existingAt);
  const newer = incomingIsNewer ? incoming : existing;
  const older = incomingIsNewer ? existing : incoming;
  const hasStrictWinner = forceIncoming || (existingAt !== incomingAt && Math.max(existingAt, incomingAt) > 0);

  const isDel = hasStrictWinner
    ? !!newer.del
    : (existing.del === true || incoming.del === true);

  return {
    ...older,
    ...newer,
    id: existing.id || incoming.id,
    name: (existing.id || incoming.id) === 'm_mvzm8u6pyafp' ? 'فردان' : standardizeArabicSpelling(newer.name || older.name),
    gender: newer.gender || older.gender || 'm',
    parent: newer.parent || older.parent,
    del: isDel,
    year: hasStrictWinner
      ? (newer.year !== undefined ? newer.year : older.year)
      : (newer.year !== undefined && newer.year !== null ? newer.year : older.year),
    birthDate: hasStrictWinner
      ? (newer.birthDate !== undefined ? newer.birthDate : older.birthDate)
      : (newer.birthDate || older.birthDate),
    isDeceased: newer.isDeceased !== undefined ? newer.isDeceased : older.isDeceased,
    deathYear: newer.deathYear !== undefined ? newer.deathYear : older.deathYear,
    note: hasStrictWinner
      ? (newer.note !== undefined ? newer.note : older.note)
      : (newer.note !== undefined && newer.note !== '' ? newer.note : older.note),
    spouses: hasStrictWinner
      ? (newer.spouses !== undefined ? newer.spouses : older.spouses)
      : ((newer.spouses && newer.spouses.length > 0) ? newer.spouses : older.spouses),
    motherInfo: hasStrictWinner
      ? (newer.motherInfo !== undefined ? newer.motherInfo : older.motherInfo)
      : (newer.motherInfo || older.motherInfo),
    at: Math.max(existingAt, incomingAt) || BASELINE_SAFE_TS
  };
}

// Deduplicate members first by ID (so edits to name/gender/mother win by timestamp or cloud authority), then by parent + name + gender
export function deduplicateMembers(members: AddedMember[], forceIncoming: boolean = false): AddedMember[] {
  // Pass 1: Collapse records sharing the exact same ID
  const byIdMap = new Map<string, AddedMember>();
  for (const rawM of members) {
    if (!rawM || !rawM.name) continue;
    const m: AddedMember = {
      ...rawM,
      name: rawM.id === 'm_mvzm8u6pyafp' ? 'فردان' : standardizeArabicSpelling(rawM.name),
      at: normalizeTimestamp(rawM.at) || BASELINE_SAFE_TS - 1000
    };
    if (m.id && byIdMap.has(m.id)) {
      const prev = byIdMap.get(m.id)!;
      byIdMap.set(m.id, mergeTwoMemberRecords(prev, m, forceIncoming));
    } else if (m.id) {
      byIdMap.set(m.id, m);
    } else {
      const fallbackId = `m_${m.parent}_${normalizeArabic(m.name)}`;
      byIdMap.set(fallbackId, m);
    }
  }

  // Pass 2: Deduplicate by parent + normalized name (preserving honorifics like الشهيد) + gender + mother
  const memberMap = new Map<string, AddedMember>();
  for (const m of byIdMap.values()) {
    const cleanNameWithTitle = (m.name || '')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
    const motherKey = m.motherInfo?.personKey || m.motherInfo?.name || '';
    const key = `${m.parent || ''}_${cleanNameWithTitle}_${m.gender || 'm'}_${motherKey}`;
    if (!memberMap.has(key)) {
      memberMap.set(key, m);
    } else {
      const existing = memberMap.get(key)!;
      memberMap.set(key, mergeTwoMemberRecords(existing, m, forceIncoming));
    }
  }
  return Array.from(memberMap.values());
}

function getLatestMemberTimestamp(members?: AddedMember[]): number {
  if (!Array.isArray(members) || members.length === 0) return 0;
  let max = 0;
  for (const m of members) {
    const mAt = normalizeTimestamp(m?.at);
    if (mAt > max) {
      max = mAt;
    }
  }
  return max;
}

export function mergeFamilyStates(
  base: FamilyState,
  incoming: Partial<FamilyState>,
  forceIncomingAuthoritative: boolean = false
): FamilyState {
  const baseTime = normalizeTimestamp(base.updatedAt) || getLatestMemberTimestamp(base.members) || 0;
  const incTime = normalizeTimestamp(incoming.updatedAt) || getLatestMemberTimestamp(incoming.members) || 0;
  const incomingIsNewer = forceIncomingAuthoritative ? true : (incTime >= baseTime);

  const mergedMembers = deduplicateMembers(
    [
      ...(base.members || []),
      ...(incoming.members || [])
    ],
    forceIncomingAuthoritative
  );

  // Merge photos preferring clean /avatars/[id].jpg?v=[timestamp] paths while supporting newly uploaded Base64 before disk extraction
  const rawBasePhotos = cleanPhotosMap(base.photos);
  const rawIncPhotos = cleanPhotosMap(incoming.photos);
  const baselinePhotos = cleanPhotosMap(DEFAULT_FAMILY_DATA.photos);
  const mergedPhotos: Record<string, string> = { ...baselinePhotos, ...rawBasePhotos };

  for (const [k, incVal] of Object.entries(rawIncPhotos)) {
    if (incVal === '') {
      if (incomingIsNewer || forceIncomingAuthoritative) {
        delete mergedPhotos[k];
        if (DEFAULT_FAMILY_DATA?.photos) {
          delete DEFAULT_FAMILY_DATA.photos[k];
        }
      }
      continue;
    }
    if (typeof incVal !== 'string' || !incVal.trim()) {
      continue;
    }
    const cleanIncVal = incVal.trim();
    const baseVal = mergedPhotos[k];
    if (!baseVal || !baseVal.trim()) {
      mergedPhotos[k] = cleanIncVal;
    } else if (cleanIncVal.startsWith('/avatars/') && baseVal.startsWith('/avatars/')) {
      const baseV = getAvatarUrlVersion(baseVal);
      const incV = getAvatarUrlVersion(cleanIncVal);
      if (incV > baseV || (incV === baseV && (incomingIsNewer || forceIncomingAuthoritative))) {
        mergedPhotos[k] = cleanIncVal;
      }
    } else if (cleanIncVal.startsWith('/avatars/')) {
      if (incomingIsNewer || forceIncomingAuthoritative || baseVal.startsWith('data:image/')) {
        mergedPhotos[k] = cleanIncVal;
      }
    } else if (forceIncomingAuthoritative || incomingIsNewer) {
      mergedPhotos[k] = cleanIncVal;
    }
  }

  // Deep-merge each member override key; when forceIncomingAuthoritative is true, Firebase/Cloud always wins
  const allOverKeys = new Set([
    ...Object.keys(base.over || {}),
    ...Object.keys(incoming.over || {})
  ]);
  const mergedOver: Record<string, MemberOverrides> = {};
  for (const k of allOverKeys) {
    const bOv = base.over?.[k] || {};
    const iOv = incoming.over?.[k] || {};
    const bAt = normalizeTimestamp(bOv.at) || baseTime;
    const iAt = normalizeTimestamp(iOv.at) || incTime;
    const useInc = k in (incoming.over || {}) && (forceIncomingAuthoritative || iAt >= bAt || !(k in (base.over || {})));
    mergedOver[k] = useInc
      ? { ...bOv, ...iOv, at: Math.max(bAt, iAt) || undefined }
      : { ...iOv, ...bOv, at: Math.max(bAt, iAt) || undefined };
  }

  if (!mergedOver.o4 || !mergedOver.o4.parent || mergedOver.o4.parent === 'oF') {
    mergedOver.o4 = {
      ...(mergedOver.o4 || {}),
      isDeceased: true,
      parent: 'am_mvzm8u6pyafp'
    };
  }

  if (!mergedOver.o15 || !mergedOver.o15.parent || mergedOver.o15.parent === 'oF') {
    mergedOver.o15 = {
      ...(mergedOver.o15 || {}),
      isDeceased: true,
      parent: 'am_mvzm8u6pyafp'
    };
  }

  const mergedSpouses = incomingIsNewer
    ? { ...(base.spouses || {}), ...(incoming.spouses || {}) }
    : { ...(incoming.spouses || {}), ...(base.spouses || {}) };

  const mergedMothers = incomingIsNewer
    ? { ...(base.mothers || {}), ...(incoming.mothers || {}) }
    : { ...(incoming.mothers || {}), ...(base.mothers || {}) };

  const rawRemovedSet = new Set(
    forceIncomingAuthoritative && Array.isArray(incoming.removed)
      ? incoming.removed
      : [...(base.removed || []), ...(incoming.removed || [])]
  );
  // Sync removed set with explicit timestamped del flags on overrides and members
  for (const [k, ov] of Object.entries(mergedOver)) {
    if (ov.del === true) rawRemovedSet.add(k);
    else if (ov.del === false) rawRemovedSet.delete(k);
  }
  for (const m of mergedMembers) {
    const mKey = 'a' + m.id;
    if (m.del === true) {
      rawRemovedSet.add(mKey);
    } else if (m.del === false) {
      rawRemovedSet.delete(mKey);
      rawRemovedSet.delete(m.id);
    }
  }
  const mergedRemoved = Array.from(rawRemovedSet);

  const primaryArchival = incomingIsNewer
    ? (incoming.archivalPhotos && incoming.archivalPhotos.length > 0 ? incoming.archivalPhotos : (base.archivalPhotos || DEFAULT_ARCHIVAL_PHOTOS))
    : (base.archivalPhotos && base.archivalPhotos.length > 0 ? base.archivalPhotos : (incoming.archivalPhotos || DEFAULT_ARCHIVAL_PHOTOS));
  const secondaryArchival = incomingIsNewer ? (base.archivalPhotos || []) : (incoming.archivalPhotos || []);
  const archivalById = new Map<string, ArchivalPhoto>();
  for (const p of primaryArchival) {
    if (p && p.id && p.url) archivalById.set(p.id, p);
  }
  for (const p of secondaryArchival) {
    if (p && p.id && p.url && !archivalById.has(p.id)) {
      if (p.id.startsWith('arch_') && !incomingIsNewer) {
        archivalById.set(p.id, p);
      } else if (!p.id.startsWith('arch_')) {
        archivalById.set(p.id, p);
      }
    }
  }
  const mergedArchival = Array.from(archivalById.values());

  const mergedNotables = mergeNotableFiguresLists(
    base.notableFigures,
    incoming.notableFigures,
    incomingIsNewer
  );

  const mergedPrivacyModeEnabled = incomingIsNewer
    ? (typeof incoming.privacyModeEnabled === 'boolean'
        ? incoming.privacyModeEnabled
        : typeof base.privacyModeEnabled === 'boolean'
        ? base.privacyModeEnabled
        : true)
    : (typeof base.privacyModeEnabled === 'boolean'
        ? base.privacyModeEnabled
        : typeof incoming.privacyModeEnabled === 'boolean'
        ? incoming.privacyModeEnabled
        : true);

  return {
    members: mergedMembers,
    photos: mergedPhotos,
    over: mergedOver,
    removed: mergedRemoved,
    archivalPhotos: mergedArchival.length > 0 ? mergedArchival : DEFAULT_ARCHIVAL_PHOTOS,
    notableFigures: mergedNotables,
    spouses: mergedSpouses,
    mothers: mergedMothers,
    contactInfo: resolveContactInfo(incomingIsNewer ? (incoming.contactInfo || base.contactInfo) : (base.contactInfo || incoming.contactInfo)),
    privacyModeEnabled: mergedPrivacyModeEnabled,
    updatedAt: Math.max(baseTime, incTime) || BASELINE_SAFE_TS
  };
}

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  email: 'alfardan.family.bh@gmail.com',
  whatsapp: '97333118588',
  creditsLines: [
    'أستاذ / محمد عبدالله عبدالكريم الفردان',
    'حسن جعفر عبدالرؤوف الفردان',
    'أعداد وتصميم :  علي ملاحسين حسين الفردان'
  ],
  verifiedBy: 'الأستاذ / عبدالله عبدالكريم حسين الفردان'
};

export function resolveContactInfo(saved?: ContactInfo | null): ContactInfo {
  const whatsapp = (saved?.whatsapp && saved.whatsapp.trim()) || DEFAULT_CONTACT_INFO.whatsapp;
  const email = (saved?.email && saved.email.trim()) || DEFAULT_CONTACT_INFO.email;
  const verifiedBy = (saved?.verifiedBy && saved.verifiedBy.trim()) || DEFAULT_CONTACT_INFO.verifiedBy;

  let creditsLines = DEFAULT_CONTACT_INFO.creditsLines;
  if (saved?.creditsLines && Array.isArray(saved.creditsLines) && saved.creditsLines.some((l: string) => l && l.trim())) {
    creditsLines = [
      (saved.creditsLines[0] && saved.creditsLines[0].trim()) || DEFAULT_CONTACT_INFO.creditsLines![0],
      (saved.creditsLines[1] && saved.creditsLines[1].trim()) || DEFAULT_CONTACT_INFO.creditsLines![1],
      (saved.creditsLines[2] && saved.creditsLines[2].trim()) || DEFAULT_CONTACT_INFO.creditsLines![2]
    ];
  }

  return {
    email,
    whatsapp,
    creditsLines,
    verifiedBy
  };
}

export function loadSavedState(): FamilyState {
  const initialArchival =
    DEFAULT_FAMILY_DATA.archivalPhotos && DEFAULT_FAMILY_DATA.archivalPhotos.length > 0
      ? DEFAULT_FAMILY_DATA.archivalPhotos
      : DEFAULT_ARCHIVAL_PHOTOS;

  const baseDefault: FamilyState = {
    ...DEFAULT_FAMILY_DATA,
    photos: cleanPhotosMap(DEFAULT_FAMILY_DATA.photos),
    members: deduplicateMembers(DEFAULT_FAMILY_DATA.members || []),
    archivalPhotos: initialArchival,
    notableFigures: resolveNotableFigures(DEFAULT_FAMILY_DATA.notableFigures),
    contactInfo: resolveContactInfo(DEFAULT_FAMILY_DATA.contactInfo),
    privacyModeEnabled: typeof DEFAULT_FAMILY_DATA.privacyModeEnabled === 'boolean' ? DEFAULT_FAMILY_DATA.privacyModeEnabled : true,
    updatedAt: DEFAULT_FAMILY_DATA.updatedAt || getLatestMemberTimestamp(DEFAULT_FAMILY_DATA.members)
  };

  try {
    if (typeof window === 'undefined') {
      return baseDefault;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return baseDefault;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.members)) {
      return mergeFamilyStates(baseDefault, parsed);
    }
  } catch (err) {
    console.error('Failed to parse saved family state:', err);
  }
  return baseDefault;
}

/**
 * Saves an uploaded or selected avatar directly to public/avatars/[key].jpg on disk
 * and updates src/data/initialTreeData.json & public/fardan_family_tree_backup.json
 * with the clean path /avatars/[key].jpg?v=[timestamp].
 */
export async function uploadMemberAvatarToDisk(key: string, dataUrl: string): Promise<string> {
  const fallbackCleanPath = `/avatars/${key}.jpg?v=${getMonotonicTimestamp()}`;
  if (!key || !dataUrl) return fallbackCleanPath;
  if (dataUrl.startsWith('data:image/')) {
    saveCustomAvatarBackup(key, dataUrl);
  }
  if (DEFAULT_FAMILY_DATA?.photos) {
    DEFAULT_FAMILY_DATA.photos[key] = fallbackCleanPath;
  }
  if (typeof window === 'undefined') return fallbackCleanPath;
  try {
    const res = await fetch('/api/upload-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, dataUrl })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        if (DEFAULT_FAMILY_DATA?.photos) {
          DEFAULT_FAMILY_DATA.photos[key] = data.url;
        }
        return data.url;
      }
    }
  } catch {}
  return fallbackCleanPath;
}

/**
 * Permanently deletes a member's photo from public/avatars/[key].jpg on disk
 * and removes photos[key] (delete photos[id]) from initialTreeData.json & fardan_family_tree_backup.json.
 */
export async function deleteMemberAvatarFromDisk(key: string): Promise<boolean> {
  if (!key) return false;
  removeCustomAvatarBackup(key);
  if (DEFAULT_FAMILY_DATA?.photos) {
    delete DEFAULT_FAMILY_DATA.photos[key];
  }
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/delete-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SaveTreeToDiskResult {
  ok: boolean;
  filesWritten: string[];
  message: string;
}

/**
 * Physical Disk-Write Bridge (/api/save-tree):
 * Immediately writes the complete tree data to src/data/initialTreeData.json and
 * public/fardan_family_tree_backup.json on disk via /api/save-tree, while
 * extracting any Base64 photos into physical .jpg files inside public/avatars/[id].jpg
 * and removing any deleted photos from public/avatars/ and photos[id].
 */
export async function saveTreeToDisk(
  state: FamilyState,
  options?: { deletedPhotoKeys?: string[]; replacePhotos?: boolean; isPublishAction?: boolean }
): Promise<SaveTreeToDiskResult> {
  const warningMsg = 'لم تُكتب الملفات على المشروع. افتح الموقع من معاينة AI Studio';
  if (typeof window === 'undefined') {
    return { ok: false, filesWritten: [], message: warningMsg };
  }
  try {
    const cleanPhotos = cleanPhotosMap(state.photos);
    const deletedKeys = options?.deletedPhotoKeys ? [...options.deletedPhotoKeys] : [];
    for (const [k, v] of Object.entries(cleanPhotos)) {
      if (v === '') {
        deletedKeys.push(k);
        delete cleanPhotos[k];
      }
    }
    for (const dk of deletedKeys) {
      delete cleanPhotos[dk];
      if (DEFAULT_FAMILY_DATA?.photos) {
        delete DEFAULT_FAMILY_DATA.photos[dk];
      }
    }

    const fullPayload = {
      treeData: RAW_TREE,
      deletedPhotoKeys: Array.from(new Set(deletedKeys)),
      replacePhotos: options?.replacePhotos ?? true,
      isPublishAction: options?.isPublishAction ?? false,
      familyData: {
        ...state,
        members: deduplicateMembers(state.members || []),
        photos: cleanPhotos,
        privacyModeEnabled: typeof state.privacyModeEnabled === 'boolean' ? state.privacyModeEnabled : true,
        updatedAt: normalizeTimestamp(state.updatedAt) || Date.now()
      }
    };
    const res = await fetch('/api/save-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.photos && DEFAULT_FAMILY_DATA) {
        DEFAULT_FAMILY_DATA.photos = { ...json.photos };
      }
      const filesWritten: string[] = Array.isArray(json?.filesWritten) ? json.filesWritten : [];
      if (filesWritten.length > 0) {
        return {
          ok: true,
          filesWritten,
          message: `تم تحديث ${filesWritten.length} ملف: ${filesWritten.join('، ')}`
        };
      }
      return {
        ok: false,
        filesWritten: [],
        message: warningMsg
      };
    }
    return { ok: false, filesWritten: [], message: warningMsg };
  } catch {
    return { ok: false, filesWritten: [], message: warningMsg };
  }
}

export function saveStateToStorage(state: FamilyState): void {
  try {
    if (!state || typeof window === 'undefined') return;

    const compactPhotos: Record<string, string> = {};
    if (state.photos && typeof state.photos === 'object') {
      for (const [k, v] of Object.entries(state.photos)) {
        if (typeof v === 'string') {
          if (v === '' || v.startsWith('/avatars/')) {
            compactPhotos[k] = v;
          } else if (v.startsWith('data:image/') && v.length < 150000) {
            compactPhotos[k] = v;
          }
        }
      }
    }

    const stateToSave: FamilyState = {
      ...state,
      photos: compactPhotos,
      archivalPhotos: state.archivalPhotos || []
    };

    const serialized = JSON.stringify(stateToSave);

    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      cleanupObsoleteStorageKeys();
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch {
        try { localStorage.removeItem(CUSTOM_AVATARS_STORAGE_KEY); } catch {}
        try {
          const minimalState: FamilyState = {
            ...stateToSave,
            archivalPhotos: []
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
        } catch {}
      }
    }
  } catch {
    // Graceful no-op on complete storage unavailability
  }
}

// Flatten original tree
export const ORIG_MAP = new Map<string, { name: string; title?: string; note: string; parentKey: string | null; ord: number }>();

function flattenOrig(node: RawTreeNode, parentKey: string | null) {
  const key = 'o' + node.i;
  ORIG_MAP.set(key, {
    name: node.n,
    title: node.t,
    note: node.note || '',
    parentKey,
    ord: ORIG_MAP.size
  });
  if (node.c) {
    node.c.forEach(child => flattenOrig(child, key));
  }
}
flattenOrig(RAW_TREE, null);
// Grandfather Mohammad (o4) and Grandfather Hussain (o15) are linked directly under Grandfather Al-Fardan (am_mvzm8u6pyafp, son of Abdulhussain ot2)
if (ORIG_MAP.has('o4')) {
  ORIG_MAP.get('o4')!.parentKey = 'am_mvzm8u6pyafp';
}
if (ORIG_MAP.has('o15')) {
  ORIG_MAP.get('o15')!.parentKey = 'am_mvzm8u6pyafp';
}

export const BRANCH_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; accent: string; label: string }> = {
  b0: { bg: '#F1F5F2', text: '#2D3732', border: '#CBD5E1', badge: '#E2E8F0', accent: '#64748B', label: 'سلسلة الأجداد' },
  b1: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', badge: '#D1FAE5', accent: '#059669', label: 'ذرية محمد' },
  b2: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', badge: '#DBEAFE', accent: '#2563EB', label: 'ذرية عبدالله' },
  b3: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', badge: '#EDE9FE', accent: '#7C3AED', label: 'ذرية حسين' },
  b4: { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA', badge: '#FFEDD5', accent: '#EA580C', label: 'ذرية أحمد' },
  b5: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', badge: '#FEE2E2', accent: '#DC2626', label: 'ذرية حسين' },
  b6: { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC', badge: '#CFFAFE', accent: '#0891B2', label: 'ذرية عبد المحسن' },
  b7: { bg: '#FDF4FF', text: '#86198F', border: '#F5D0FE', badge: '#FAE8FF', accent: '#C026D3', label: 'ذرية جواد' },
};

const BRANCH_KEYS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];

export interface FamilyTreeProcessed {
  people: Map<string, ProcessedPerson>;
  fardanKey: string;
  rootKey: string;
  heads: ProcessedPerson[];
  stats: {
    totalCount: number;
    originalCount: number;
    addedCount: number;
    totalGenerations: number;
    maleCount: number;
    femaleCount: number;
    livingCount: number;
    deceasedCount: number;
    photosCount: number;
    branchesStats: { key: string; name: string; count: number; color: string }[];
  };
}

export function parseYearFromDate(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = String(val).match(/\b(18|19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Resolves the founding grandfather Fardan (son of Abdulhussain `ot2`,
 * father of Mohammad `o4` and Hussain `o15`), explicitly excluding Fardan bin Ayoub (`oF`).
 */
export function resolveMainFardanKey(people: Map<string, ProcessedPerson>): string {
  const direct = people.get('am_mvzm8u6pyafp');
  if (direct && !direct.deleted && direct.key !== 'oF') {
    return direct.key;
  }

  for (const person of people.values()) {
    if (person.deleted || person.key === 'oF') continue;
    const normName = normalizeArabic(person.name).trim();
    if (normName !== 'فردان' && normName !== 'الفردان') continue;

    const parent = person.parentKey ? people.get(person.parentKey) : undefined;
    const normParent = parent ? normalizeArabic(parent.name).trim() : '';
    const isChildOfAbdulhussain =
      person.parentKey === 'ot2' || normParent === 'عبد الحسين' || normParent === 'عبدالحسين';
    const hasMohammadOrHussain =
      person.childrenKeys.includes('o4') || person.childrenKeys.includes('o15');

    if (isChildOfAbdulhussain && hasMohammadOrHussain) {
      return person.key;
    }
  }

  for (const person of people.values()) {
    if (person.deleted || person.key === 'oF') continue;
    const normName = normalizeArabic(person.name).trim();
    if (normName !== 'فردان' && normName !== 'الفردان') continue;
    if (
      person.parentKey === 'ot2' ||
      person.childrenKeys.includes('o4') ||
      person.childrenKeys.includes('o15')
    ) {
      return person.key;
    }
  }

  return 'am_mvzm8u6pyafp';
}

export function buildFamilyRegistry(state: FamilyState): FamilyTreeProcessed {
  const safeState: FamilyState = state || ({} as FamilyState);
  const safeOver = safeState.over || {};
  const safeRemoved = safeState.removed || [];
  const safePhotos = cleanPhotosMap(safeState.photos);

  const people = new Map<string, ProcessedPerson>();

  // 1. Process original members
  ORIG_MAP.forEach((orig, key) => {
    const ov: MemberOverrides = safeOver[key] || {};
    const rawName = ov.name || (orig.title ? `${orig.title} ${orig.name}` : orig.name);
    const name = standardizeArabicSpelling(rawName);
    const isProtectedTrunk = ['ot0', 'ot1', 'ot2', 'ot3', 'oF'].includes(key);
    const deleted = isProtectedTrunk ? false : (ov.del !== undefined ? !!ov.del : safeRemoved.includes(key));

    const computedYear = ov.year !== undefined ? ov.year : (ov.birthDate ? parseYearFromDate(ov.birthDate) : null);
    const computedBirthDate = ov.birthDate ?? (computedYear ? String(computedYear) : null);

    const resolvedParentKey =
      key === 'o4' || key === 'o15'
        ? (ov.parent && ov.parent !== 'oF' ? ov.parent : 'am_mvzm8u6pyafp')
        : (ov.parent || orig.parentKey);

    const rawMother = state.mothers?.[key] ?? ov.motherInfo ?? null;
    const resolvedMother = rawMother && rawMother.name ? rawMother : null;

    people.set(key, {
      key,
      name,
      label: name,
      title: orig.title || null,
      gender: ov.gender || 'm',
      year: computedYear,
      birthDate: computedBirthDate,
      note: ov.note !== undefined ? ov.note : orig.note,
      isDeceased: ov.isDeceased ?? (orig.note?.includes('متوف') || orig.note?.includes('المرحوم') || orig.title?.includes('المرحوم') || false),
      deathYear: ov.deathYear ?? null,
      parentKey: resolvedParentKey,
      origParentKey: orig.parentKey,
      isNew: false,
      renamed: !!ov.name,
      moved: !!ov.parent && ov.parent !== orig.parentKey,
      deleted,
      childrenKeys: [],
      photo: safePhotos[key] || null,
      generation: 0,
      branch: 'b0',
      spouses: state.spouses?.[key] ?? ov.spouses ?? [],
      mother: resolvedMother,
      isSibtLineage: false
    });
  });

  // 2. Process added members (deduplicated by ID and parent + name)
  deduplicateMembers(state.members || []).forEach(m => {
    const key = 'a' + m.id;
    const isAlFardanFounder = m.id === 'm_mvzm8u6pyafp';
    const resolvedName = isAlFardanFounder ? 'فردان' : m.name;
    const resolvedParent = isAlFardanFounder ? 'ot2' : m.parent;
    const computedYear = m.year !== undefined ? m.year : (m.birthDate ? parseYearFromDate(m.birthDate) : null);
    const computedBirthDate = m.birthDate ?? (computedYear ? String(computedYear) : null);
    const isDeleted = isAlFardanFounder
      ? false
      : (m.del !== undefined ? !!m.del : (safeRemoved.includes(key) || safeRemoved.includes(m.id)));

    const rawMother = state.mothers?.[key] ?? m.motherInfo ?? null;
    const resolvedMother = rawMother && rawMother.name ? rawMother : null;

    people.set(key, {
      key,
      name: resolvedName,
      label: resolvedName,
      gender: m.gender || 'm',
      year: computedYear,
      birthDate: computedBirthDate,
      note: m.note || '',
      isDeceased: isAlFardanFounder ? true : (m.isDeceased ?? (m.note?.includes('متوف') || m.note?.includes('المرحوم') || false)),
      deathYear: m.deathYear ?? null,
      parentKey: resolvedParent,
      origParentKey: null,
      isNew: true,
      renamed: false,
      moved: false,
      deleted: isDeleted,
      at: m.at,
      childrenKeys: [],
      photo: safePhotos[key] || null,
      generation: 0,
      branch: 'b0',
      spouses: state.spouses?.[key] ?? m.spouses ?? [],
      mother: resolvedMother,
      isSibtLineage: false
    });
  });

  // 2.8 Ensure bi-directional spouse linking for all family-internal marriages (past, present, and future)
  people.forEach((p, personKey) => {
    if (p.deleted) return;
    (p.spouses || []).forEach(spouse => {
      // Auto-heal personKey by normalized name if missing or outdated
      if (spouse.isFromFamily && (!spouse.personKey || !people.has(spouse.personKey))) {
        const normSpouseName = normalizeArabic(spouse.name);
        for (const [candKey, cand] of people.entries()) {
          if (!cand.deleted && normalizeArabic(cand.name) === normSpouseName) {
            spouse.personKey = candKey;
            break;
          }
        }
      }

      if (spouse.isFromFamily && spouse.personKey && people.has(spouse.personKey)) {
        const partner = people.get(spouse.personKey)!;
        if (!partner.deleted) {
          partner.spouses = partner.spouses || [];
          const exists = partner.spouses.some(s => s.personKey === personKey);
          if (!exists) {
            partner.spouses.push({
              id: `recip_${personKey}_${partner.key}`,
              name: p.name,
              isFromFamily: true,
              personKey: personKey,
              familyOrigin: 'عائلة الفردان',
              notes: spouse.notes
            });
          }
        }
      }
    });
  });

  // Deduplicate any duplicate spouse entries per person (by personKey and normalized name)
  people.forEach(p => {
    if (!p.spouses || p.spouses.length <= 1) return;
    const seenKeys = new Set<string>();
    const seenNames = new Set<string>();
    const uniqueSpouses: typeof p.spouses = [];
    for (const s of p.spouses) {
      if (!s) continue;
      const norm = normalizeArabic(s.name);
      if (s.isFromFamily && s.personKey) {
        if (seenKeys.has(s.personKey)) continue;
        seenKeys.add(s.personKey);
        if (seenNames.has(norm)) {
          // If already encountered by name as external, replace with the linked family spouse
          const existingIdx = uniqueSpouses.findIndex(x => normalizeArabic(x.name) === norm);
          if (existingIdx >= 0) uniqueSpouses.splice(existingIdx, 1);
        }
        seenNames.add(norm);
        uniqueSpouses.push(s);
      } else {
        if (seenNames.has(norm)) continue;
        seenNames.add(norm);
        uniqueSpouses.push(s);
      }
    }
    p.spouses = uniqueSpouses;
  });

  // 3. Populate children
  people.forEach(p => {
    if (p.deleted) return;
    if (p.parentKey && people.has(p.parentKey)) {
      const parent = people.get(p.parentKey)!;
      if (!parent.deleted) {
        if (!parent.childrenKeys.includes(p.key)) {
          parent.childrenKeys.push(p.key);
        }
      }
    }
  });

  // 3.5 Infer mother from father's spouses ONLY if father has exactly one spouse and mother is not explicitly set or cleared
  people.forEach(p => {
    const explicitMother = state.mothers?.[p.key] ?? safeOver[p.key]?.motherInfo;
    if (explicitMother && explicitMother.name === '') return;
    if (!p.mother && p.parentKey && people.has(p.parentKey)) {
      const father = people.get(p.parentKey)!;
      // If father only has 1 spouse, child is unambiguously from that spouse
      if (father.spouses && father.spouses.length === 1) {
        const chosenSpouse = father.spouses[0];
        if (chosenSpouse) {
          p.mother = {
            name: chosenSpouse.name,
            isFromFamily: chosenSpouse.isFromFamily,
            personKey: chosenSpouse.personKey,
            familyOrigin: chosenSpouse.familyOrigin,
            notes: chosenSpouse.notes
          };
        }
      }
    }
  });

  // 4. Calculate generations & assign branches
  const fardanKey = 'oF';
  const rootKey = 'ot0';

  // Compute depth from root & propagate retroactive golden sibt lineage (التوريث اللوني الذهبي لذرية الأسباط)
  // Top-down traversal: once the path passes through a female node (mother),
  // propagate isSibtLineage = true to her children and all subsequent descending generations.
  const visitedTraversal = new Set<string>();
  function computeGeneration(k: string, currentGen = 1, inheritedSibt = false): void {
    if (visitedTraversal.has(k)) return;
    visitedTraversal.add(k);
    const p = people.get(k);
    if (!p) return;
    p.generation = currentGen;
    p.isSibtLineage = inheritedSibt;
    const nextSibt = inheritedSibt || p.gender === 'f';
    p.childrenKeys.forEach(childKey => {
      computeGeneration(childKey, currentGen + 1, nextSibt);
    });
  }
  computeGeneration(rootKey, 1, false);

  // Retroactive fallback for any node not reached from rootKey so all detached/orphan subtrees also inherit isSibtLineage
  people.forEach(p => {
    if (visitedTraversal.has(p.key)) return;
    let cur: ProcessedPerson | undefined = p;
    let guard = 0;
    let hasFemaleAncestor = false;
    while (cur && cur.parentKey && guard++ < 60) {
      const parent = people.get(cur.parentKey);
      if (!parent) break;
      if (parent.gender === 'f' || parent.isSibtLineage) {
        hasFemaleAncestor = true;
        break;
      }
      cur = parent;
    }
    p.isSibtLineage = hasFemaleAncestor;
  });

  // Identify main family branch heads:
  // 1) Direct children of Grandfather Al-Fardan (am_mvzm8u6pyafp) -> Grandfather Mohammad (o4, ذرية محمد) & Grandfather Hussain (o15, ذرية حسين)
  // 2) Direct children of Grandfather Fardan bin Ayoub (oF) -> Abdullah (o13, ذرية عبدالله)
  const alFardanFounder = people.get('am_mvzm8u6pyafp');
  const fardan = people.get(fardanKey);
  const heads: ProcessedPerson[] = [];

  const candidateHeadKeys: string[] = [
    ...(alFardanFounder ? alFardanFounder.childrenKeys : []),
    ...(fardan ? fardan.childrenKeys : [])
  ];

  const seenHeadKeys = new Set<string>();
  candidateHeadKeys.forEach((childKey) => {
    if (seenHeadKeys.has(childKey)) return;
    seenHeadKeys.add(childKey);
    const child = people.get(childKey);
    if (child && !child.deleted) {
      const idx = heads.length;
      const branchColorKey =
        childKey === 'o4'
          ? 'b1'
          : childKey === 'o13'
          ? 'b2'
          : childKey === 'o15'
          ? 'b3'
          : BRANCH_KEYS[idx % BRANCH_KEYS.length];
      child.branch = branchColorKey;
      child.branchName = `ذرية ${child.name}`;
      heads.push(child);

      // Propagate branch to all descendants
      function propagateBranch(k: string, b: string, bName: string) {
        const item = people.get(k);
        if (!item) return;
        item.branch = b;
        item.branchName = bName;
        item.childrenKeys.forEach(c => propagateBranch(c, b, bName));
      }
      child.childrenKeys.forEach(c => propagateBranch(c, branchColorKey, child.branchName!));
    }
  });

  // 4.1 Historical generations & default death status
  // Founding ancestors are deceased (رحمهم الله) unless an explicit override exists.
  // Since Grandfather Mohammad (o4, b1) and Grandfather Hussain (o15, b3) are at generation 5 (under Al-Fardan at gen 4),
  // their historical deceased cutoff is generation <= 6, preserving the exact living/deceased status of all their descendants.
  people.forEach(p => {
    if (p.deleted) return;
    const ov = state.over[p.key];
    if (ov && ov.isDeceased !== undefined) return;
    if (p.isNew && p.key !== 'am_mvzm8u6pyafp') {
      const rawMember = (state.members || []).find(m => 'a' + m.id === p.key);
      if (rawMember && rawMember.isDeceased !== undefined) return;
    }
    const maxHistoricalGen = p.branch === 'b1' || p.branch === 'b3' ? 6 : 7;
    if (p.key.startsWith('ot') || p.key === 'oF' || p.key === 'am_mvzm8u6pyafp' || (p.generation > 0 && p.generation <= maxHistoricalGen)) {
      p.isDeceased = true;
    }
  });

  // Calculate statistics
  let originalCount = 0;
  let addedCount = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let livingCount = 0;
  let deceasedCount = 0;
  let maxGen = 1;
  let photosCount = 0;

  people.forEach(p => {
    if (p.deleted) return;
    if (p.isNew) addedCount++;
    else originalCount++;

    if (p.gender === 'f') femaleCount++;
    else maleCount++;

    if (p.isDeceased) deceasedCount++;
    else livingCount++;

    if (p.generation > maxGen) maxGen = p.generation;
    if (p.photo) photosCount++;
  });

  const branchesStats = heads.map(h => {
    let count = 0;
    function countSubtree(k: string) {
      count++;
      const node = people.get(k);
      if (node) {
        node.childrenKeys.forEach(countSubtree);
      }
    }
    countSubtree(h.key);
    return {
      key: h.key,
      name: `ذرية ${h.name}`,
      count,
      color: BRANCH_COLORS[h.branch]?.accent || '#059669'
    };
  });

  return {
    people,
    fardanKey,
    rootKey,
    heads,
    stats: {
      totalCount: originalCount + addedCount,
      originalCount,
      addedCount,
      totalGenerations: maxGen,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
      photosCount,
      branchesStats
    }
  };
}

export const HISTORICAL_ROOT_KEYS = new Set<string>(['ot0', 'ot1', 'ot2']);
export const HISTORICAL_ROOTS_LINE = 'الجذور: بن عبد الحسين بن يوسف بن الشيخ علي';

export function isHistoricalRootPerson(key: string | null | undefined): boolean {
  return Boolean(key && HISTORICAL_ROOT_KEYS.has(key));
}

export function hasPatrilinealFemaleBreak(
  key: string | null | undefined,
  registry?: Map<string, ProcessedPerson>
): boolean {
  if (!key || !registry) return false;
  let cur = registry.get(key);
  let guard = 0;
  while (cur && guard++ < 50) {
    if (!cur.parentKey) return false;
    const parent = registry.get(cur.parentKey);
    if (!parent) return false;
    if (parent.gender === 'f') return true;
    cur = parent;
  }
  return false;
}

export function hasHistoricalRootsSubtitle(
  key: string | null | undefined,
  registry?: Map<string, ProcessedPerson>
): boolean {
  if (!key || HISTORICAL_ROOT_KEYS.has(key)) return false;
  if (registry && hasPatrilinealFemaleBreak(key, registry)) return false;
  return true;
}

export function getHistoricalRootsSubtitle(
  key: string | null | undefined,
  registry?: Map<string, ProcessedPerson>
): string | null {
  return hasHistoricalRootsSubtitle(key, registry) ? HISTORICAL_ROOTS_LINE : null;
}

// Compute complete patrilineal lineage chain up to the founding root ('ot0' الشيخ علي),
// strictly stopping immediately when encountering any female parent node (never climb through mother or grandmother).
export function getFullLineageChain(key: string, registry: Map<string, ProcessedPerson>): ProcessedPerson[] {
  const chain: ProcessedPerson[] = [];
  let cur = registry.get(key);
  let guard = 0;
  while (cur && guard++ < 50) {
    chain.push(cur);
    if (!cur.parentKey) break;
    const parent = registry.get(cur.parentKey);
    if (!parent || parent.gender === 'f') break;
    cur = parent;
  }
  return chain;
}

// Compute primary Arabic patrilineal lineage chain ending at "فردان" (for Fardan bin Abdulhussain descendants)
// or "أيوب" (for Ayoub descendants), stopping before the 3 founding historical roots ('ot2', 'ot1', 'ot0')
// AND strictly stopping before any female parent node.
export function getLineageChain(key: string, registry: Map<string, ProcessedPerson>): ProcessedPerson[] {
  const fullChain = getFullLineageChain(key, registry);
  if (HISTORICAL_ROOT_KEYS.has(key)) {
    return fullChain;
  }
  const filtered = fullChain.filter(p => !HISTORICAL_ROOT_KEYS.has(p.key));
  return filtered.length > 0 ? filtered : fullChain;
}

export function getPatrilinealLineageString(key: string, registry: Map<string, ProcessedPerson>): string {
  const person = registry.get(key);
  if (!person) return '';

  const parent = person.parentKey ? registry.get(person.parentKey) : null;
  const isChildOfFemale = parent?.gender === 'f';
  const connector = person.gender === 'f' ? 'بنت' : 'بن';

  if (!parent) {
    return person.name;
  }

  if (isChildOfFemale) {
    const spouses = parent.spouses || [];
    let matchedSpouse: SpouseInfo | undefined;
    if (spouses.length > 0) {
      if (person.mother?.name && normalizeArabic(person.mother.name) !== normalizeArabic(parent.name)) {
        matchedSpouse = spouses.find(s => normalizeArabic(s.name) === normalizeArabic(person.mother!.name));
      }
      if (!matchedSpouse) {
        matchedSpouse = spouses[0];
      }
    }

    const fatherPerson =
      matchedSpouse?.isFromFamily && matchedSpouse.personKey
        ? registry.get(matchedSpouse.personKey)
        : undefined;

    if (fatherPerson && !fatherPerson.deleted && fatherPerson.key !== person.key && fatherPerson.gender !== 'f') {
      const fatherLineage = getLineageChain(fatherPerson.key, registry);
      const fatherChainStr = fatherLineage
        .map((p, idx) => {
          if (idx === 0) return p.name;
          const prev = fatherLineage[idx - 1];
          const conn = prev.gender === 'f' ? 'بنت' : 'بن';
          return `${conn} ${p.name}`;
        })
        .join(' ');
      return `${person.name} ${connector} ${fatherChainStr}`;
    }

    const fatherName = getFatherName(key, registry);
    if (!fatherName || fatherName === 'من خارج العائلة') {
      return person.name;
    }
    return `${person.name} ${connector} ${fatherName}`;
  } else {
    const chain = getLineageChain(key, registry);
    return chain
      .map((p, idx) => {
        if (idx === 0) return p.name;
        const childPerson = chain[idx - 1];
        const conn = childPerson.gender === 'f' ? 'بنت' : 'بن';
        return `${conn} ${p.name}`;
      })
      .join(' ');
  }
}

export function formatLineageString(key: string, registry: Map<string, ProcessedPerson>): string {
  return getPatrilinealLineageString(key, registry);
}

// Unified primary lineage string across all dropdowns, directory cards, certificates, and sections:
// Always returns the complete primary lineage ending with "فردان" or "أيوب" (or natural root name for ot0/ot1/ot2).
export function getQuadLineageName(
  key: string,
  registry: Map<string, ProcessedPerson>,
  _maxGenerations: number = 4
): string {
  return formatLineageString(key, registry);
}

// Normalizes Arabic text for flexible genealogy search while preserving titles (ملا، الشيخ، أبو، الحاج)
// and unifying compound prefixes/names whether written with or without spaces.
export function normalizeForGenealogySearch(text: string): string {
  if (!text) return '';
  return text
    .replace(/[ًٌٍَُِّْـ]/g, '') // remove tashkeel and tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[،,.;:()[\]{}"'«»\-_/\\]/g, ' ')
    // Unify compound prefixes so spaced and unspaced forms become identical
    .replace(/(^|\s)عبد\s+/g, '$1عبد')
    .replace(/(^|\s)(?:ال)?ملا\s+/g, '$1ملا')
    .replace(/(^|\s)الملا(?=\S)/g, '$1ملا')
    .replace(/(^|\s)ابو\s+/g, '$1ابو')
    .replace(/(^|\s)ابا\s+/g, '$1ابا')
    .replace(/(^|\s)ابي\s+/g, '$1ابي')
    .replace(/(^|\s)ام\s+/g, '$1ام')
    .replace(/(^|\s)(?:ال)?شيخ\s+/g, '$1شيخ')
    .replace(/(^|\s)الشيخ(?=\S)/g, '$1شيخ')
    .replace(/(^|\s)(?:ال)?حاج\s+/g, '$1حاج')
    .replace(/(^|\s)الحاج(?=\S)/g, '$1حاج')
    .replace(/(^|\s)(?:ال)?سيد\s+/g, '$1سيد')
    .replace(/(^|\s)السيد(?=\S)/g, '$1سيد')
    .replace(/(^|\s)(?:ال)?شهيد\s+/g, '$1شهيد')
    .replace(/(^|\s)الشهيد(?=\S)/g, '$1شهيد')
    .replace(/(^|\s)(?:ال)?مرحوم\s+/g, '$1مرحوم')
    .replace(/(^|\s)المرحوم(?=\S)/g, '$1مرحوم')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripPatronymicConnectors(text: string): string {
  if (!text) return '';
  return text
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/(^|\s)(?:بن|ابن|بنت|ابنه|ابنة)(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenMatchesAncestorEntry(
  token: string,
  anc: { full: string; bare: string; compact: string; bareCompact: string }
): boolean {
  if (!token) return false;
  if (
    anc.full === token ||
    anc.bare === token ||
    anc.compact === token ||
    anc.bareCompact === token
  ) {
    return true;
  }
  if (
    anc.full.startsWith(token) ||
    anc.bare.startsWith(token) ||
    anc.compact.startsWith(token) ||
    anc.bareCompact.startsWith(token)
  ) {
    return true;
  }
  if (anc.full.split(/\s+/).some(w => w.startsWith(token))) {
    return true;
  }
  const tokenNoAl = token.replace(/^ال/, '');
  if (tokenNoAl.length >= 3) {
    const ancNoAl = anc.bare.replace(/(^|\s)ال/g, '$1');
    if (ancNoAl === tokenNoAl || ancNoAl.startsWith(tokenNoAl)) {
      return true;
    }
  }
  return false;
}

// Intelligent and prioritized search function matching from the first letters, compound names, and full lineage chains
export function searchFamilyMembers(
  query: string,
  people: Map<string, ProcessedPerson>,
  limit: number = 60,
  options?: { excludeFemales?: boolean }
): ProcessedPerson[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const excludeFemales = !!options?.excludeFemales;
  const qNoBin = normalizeForGenealogySearch(stripPatronymicConnectors(trimmed));
  if (!qNoBin) return [];

  const qCompact = qNoBin.replace(/\s+/g, '');
  const qTokens = qNoBin.split(/\s+/).filter(Boolean);
  const kunyaChildQuery =
    qTokens.length === 1 && qNoBin.startsWith('ابو') && qNoBin.length > 4
      ? qNoBin.slice(3).trim()
      : '';

  interface AncestorNormEntry {
    full: string;
    bare: string;
    compact: string;
    bareCompact: string;
  }

  // Precompute normalized entry per person for fast lineage traversal
  const personNormCache = new Map<string, AncestorNormEntry>();
  people.forEach((p, key) => {
    const combinedName =
      p.title && !p.name.includes(p.title) ? `${p.title} ${p.name}` : p.name;
    const full = normalizeForGenealogySearch(combinedName);
    const bare = normalizeForGenealogySearch(normalizeArabic(p.name));
    personNormCache.set(key, {
      full,
      bare,
      compact: full.replace(/\s+/g, ''),
      bareCompact: bare.replace(/\s+/g, ''),
    });
  });

  interface ScoredMatch {
    person: ProcessedPerson;
    score: number;
  }

  const results: ScoredMatch[] = [];

  people.forEach((p) => {
    if (p.deleted) return;
    if (excludeFemales && p.gender === 'f') return;

    const selfNorm = personNormCache.get(p.key)!;
    const rawName = p.name;
    const titleNorm = p.title ? normalizeForGenealogySearch(p.title) : '';
    const noteNorm = p.note ? normalizeForGenealogySearch(p.note) : '';
    const noteCompact = noteNorm.replace(/\s+/g, '');

    // Build full ancestor chain [self, father, grandfather, ..., root]
    const chain = getLineageChain(p.key, people);
    const ancList: AncestorNormEntry[] = chain.map(
      anc => personNormCache.get(anc.key) || {
        full: normalizeForGenealogySearch(anc.name),
        bare: normalizeForGenealogySearch(normalizeArabic(anc.name)),
        compact: normalizeForGenealogySearch(anc.name).replace(/\s+/g, ''),
        bareCompact: normalizeForGenealogySearch(normalizeArabic(anc.name)).replace(/\s+/g, ''),
      }
    );

    const lineageFullNoBin = ancList.map(a => a.full).join(' ');
    const lineageBareNoBin = ancList.map(a => a.bare).join(' ');
    const lineageFullCompact = ancList.map(a => a.compact).join('');
    const lineageBareCompact = ancList.map(a => a.bareCompact).join('');

    let score = 0;

    // 1. Single-person name matching (with or without spaces / titles)
    if (selfNorm.full === qNoBin) {
      score += 1400;
    } else if (selfNorm.compact === qCompact && qCompact.length >= 2) {
      score += 1350;
    } else if (selfNorm.bare === qNoBin) {
      score += 1050;
    } else if (selfNorm.bareCompact === qCompact && qCompact.length >= 2) {
      score += 1000;
    } else if (selfNorm.full.startsWith(qNoBin) || rawName.startsWith(trimmed)) {
      score += 650;
    } else if (selfNorm.compact.startsWith(qCompact) && qCompact.length >= 2) {
      score += 600;
    } else if (selfNorm.bare.startsWith(qNoBin)) {
      score += 550;
    } else if (selfNorm.full.split(/\s+/).some(w => w.startsWith(qNoBin))) {
      score += 350;
    } else if (
      selfNorm.full.includes(qNoBin) ||
      (qCompact.length >= 3 && selfNorm.compact.includes(qCompact)) ||
      rawName.includes(trimmed)
    ) {
      score += 200;
    }

    // 2. Full Lineage Chain matching (ignoring 'بن / ابن' and missing spaces)
    if (lineageFullNoBin === qNoBin) {
      score += 1600;
    } else if (lineageFullNoBin.startsWith(qNoBin + ' ')) {
      score += 1250;
    } else if (lineageFullNoBin.startsWith(qNoBin)) {
      score += 1100;
    } else if (lineageBareNoBin.startsWith(qNoBin + ' ')) {
      score += 1050;
    } else if (lineageBareNoBin.startsWith(qNoBin)) {
      score += 920;
    } else if (qCompact.length >= 3 && lineageFullCompact.startsWith(qCompact)) {
      score += 880;
    } else if (qCompact.length >= 3 && lineageBareCompact.startsWith(qCompact)) {
      score += 800;
    }

    // 3. Multi-token ordered patronymic chain matching (e.g. "حسين حسين", "حسين بن حسين", "ملا حسين محمد")
    if (qTokens.length > 1) {
      // 3a. Match starting from the person himself (ancList[0])
      if (tokenMatchesAncestorEntry(qTokens[0], ancList[0])) {
        let ancIdx = 0;
        let matchedCount = 1;
        let totalGaps = 0;
        const anc0Words = ancList[0].full.split(/\s+/);
        let wordIdxInAnc = anc0Words.findIndex(w => w.startsWith(qTokens[0]));

        for (let ti = 1; ti < qTokens.length; ti++) {
          const tok = qTokens[ti];
          const curAncWords = ancList[ancIdx].full.split(/\s+/);
          const nextWordIdx = curAncWords.findIndex((w, idx) => idx > wordIdxInAnc && w.startsWith(tok));
          if (nextWordIdx !== -1) {
            wordIdxInAnc = nextWordIdx;
            matchedCount++;
            continue;
          }

          let foundAnc = -1;
          for (let ai = ancIdx + 1; ai < ancList.length; ai++) {
            if (tokenMatchesAncestorEntry(tok, ancList[ai])) {
              foundAnc = ai;
              break;
            }
          }

          if (foundAnc !== -1) {
            totalGaps += foundAnc - (ancIdx + 1);
            ancIdx = foundAnc;
            wordIdxInAnc = ancList[ancIdx].full.split(/\s+/).findIndex(w => w.startsWith(tok));
            matchedCount++;
          } else {
            break;
          }
        }

        if (matchedCount === qTokens.length) {
          const gapPenalty = Math.min(totalGaps * 120, 450);
          score += Math.max(950 - gapPenalty, 450);
          if (ancList[0].full === qTokens[0] || ancList[0].bare === qTokens[0]) {
            score += 120;
          }
        }
      }
      // 3b. Match starting from the direct father (ancList[1]) so children of the queried lineage also appear below
      else if (ancList.length > 1 && tokenMatchesAncestorEntry(qTokens[0], ancList[1])) {
        let ancIdx = 1;
        let matchedCount = 1;
        let totalGaps = 0;
        const anc1Words = ancList[1].full.split(/\s+/);
        let wordIdxInAnc = anc1Words.findIndex(w => w.startsWith(qTokens[0]));

        for (let ti = 1; ti < qTokens.length; ti++) {
          const tok = qTokens[ti];
          const curAncWords = ancList[ancIdx].full.split(/\s+/);
          const nextWordIdx = curAncWords.findIndex((w, idx) => idx > wordIdxInAnc && w.startsWith(tok));
          if (nextWordIdx !== -1) {
            wordIdxInAnc = nextWordIdx;
            matchedCount++;
            continue;
          }

          let foundAnc = -1;
          for (let ai = ancIdx + 1; ai < ancList.length; ai++) {
            if (tokenMatchesAncestorEntry(tok, ancList[ai])) {
              foundAnc = ai;
              break;
            }
          }

          if (foundAnc !== -1) {
            totalGaps += foundAnc - (ancIdx + 1);
            ancIdx = foundAnc;
            wordIdxInAnc = ancList[ancIdx].full.split(/\s+/).findIndex(w => w.startsWith(tok));
            matchedCount++;
          } else {
            break;
          }
        }

        if (matchedCount === qTokens.length && totalGaps <= 1) {
          score += Math.max(260 - totalGaps * 80, 120);
        }
      }
    } else {
      // Single-token query: also check parent and 4-gen lineage
      if (ancList.length > 1) {
        const parentNorm = ancList[1];
        if (parentNorm.full === qNoBin || parentNorm.compact === qCompact) {
          score += 320;
        } else if (parentNorm.full.startsWith(qNoBin) || parentNorm.bare.startsWith(qNoBin)) {
          score += 120;
        } else if (parentNorm.full.includes(qNoBin)) {
          score += 60;
        }
      }
      if (ancList.length > 2) {
        const grandNorm = ancList[2];
        if (grandNorm.full === qNoBin || grandNorm.compact === qCompact) {
          score += 180;
        } else if (grandNorm.full.startsWith(qNoBin)) {
          score += 50;
        }
      }
    }

    // 4. Kunya / Nickname matching (e.g. "ابو احمد / أبو أحمد") in title, notes, or eldest son
    if (titleNorm && (titleNorm.includes(qNoBin) || titleNorm.replace(/\s+/g, '').includes(qCompact))) {
      score += 450;
    }
    if (noteNorm && (noteNorm.includes(qNoBin) || (qCompact.length >= 3 && noteCompact.includes(qCompact)))) {
      score += 280;
    }
    if (kunyaChildQuery && p.gender === 'm' && p.childrenKeys.length > 0) {
      const sonsNorm = p.childrenKeys
        .map(ck => people.get(ck))
        .filter((c): c is ProcessedPerson => !!c && !c.deleted && c.gender === 'm')
        .map(c => personNormCache.get(c.key));
      if (sonsNorm.length > 0 && sonsNorm[0] && (sonsNorm[0].full === kunyaChildQuery || sonsNorm[0].bare === kunyaChildQuery)) {
        score += 340;
      } else if (sonsNorm.some(s => s && (s.full === kunyaChildQuery || s.bare === kunyaChildQuery))) {
        score += 150;
      }
    }

    // 5. Matching spouse name (الزوج / الزوجة) — disabled in public visitor privacy mode
    if (!excludeFemales && p.spouses && p.spouses.length > 0) {
      for (const sp of p.spouses) {
        if (!sp.name) continue;
        const normSp = normalizeForGenealogySearch(stripPatronymicConnectors(sp.name));
        if (normSp.includes(qNoBin) || (qCompact.length >= 3 && normSp.replace(/\s+/g, '').includes(qCompact))) {
          score += 180;
          break;
        }
      }
    }

    // 6. Matching mother name (نسب الأم) — disabled in public visitor privacy mode
    if (!excludeFemales && p.mother && p.mother.name) {
      const normMom = normalizeForGenealogySearch(stripPatronymicConnectors(p.mother.name));
      if (normMom.includes(qNoBin) || (qCompact.length >= 3 && normMom.replace(/\s+/g, '').includes(qCompact))) {
        score += 160;
      }
    }

    if (score > 0) {
      results.push({ person: p, score });
    }
  });

  // Sort descending by score, then by generation
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.person.generation - b.person.generation;
  });

  return results.slice(0, limit).map(r => r.person);
}

/**
 * Calculates the children (sons and daughters) resulting from the union of a person and a given spouse.
 * Works seamlessly whether viewing from the husband's perspective or the wife's perspective,
 * supporting multiple marriages and external/internal spouses.
 */
export function getChildrenOfSpouse(
  personKey: string,
  spouse: SpouseInfo,
  people: Map<string, ProcessedPerson>
): { sons: ProcessedPerson[]; daughters: ProcessedPerson[]; all: ProcessedPerson[] } {
  const person = people.get(personKey);
  if (!person) return { sons: [], daughters: [], all: [] };

  const matched: ProcessedPerson[] = [];
  const matchedKeys = new Set<string>();

  const isMale = person.gender === 'm';

  if (isMale) {
    // Current person is the Father, spouse is the Wife/Mother
    const children = (person.childrenKeys || [])
      .map(k => people.get(k))
      .filter((c): c is ProcessedPerson => !!c && !c.deleted);

    const fatherSpouses = person.spouses || [];
    const hasOnlyOneSpouse = fatherSpouses.length <= 1;

    for (const child of children) {
      if (child.mother) {
        if (spouse.isFromFamily && spouse.personKey && child.mother.personKey === spouse.personKey) {
          if (!matchedKeys.has(child.key)) {
            matchedKeys.add(child.key);
            matched.push(child);
          }
          continue;
        }
        if (child.mother.name && normalizeArabic(child.mother.name) === normalizeArabic(spouse.name)) {
          if (!matchedKeys.has(child.key)) {
            matchedKeys.add(child.key);
            matched.push(child);
          }
          continue;
        }
      } else if (hasOnlyOneSpouse) {
        // Unspecified mother with single wife belongs to this wife
        if (!matchedKeys.has(child.key)) {
          matchedKeys.add(child.key);
          matched.push(child);
        }
      }
    }
  } else {
    // Current person is the Mother/Wife, spouse is the Husband/Father
    const husbandKey = spouse.personKey;
    const husband = husbandKey ? people.get(husbandKey) : null;

    // A. Check husband's children if husband is in the tree
    if (husband) {
      const husbandChildren = (husband.childrenKeys || [])
        .map(k => people.get(k))
        .filter((c): c is ProcessedPerson => !!c && !c.deleted);

      const husbandSpouses = husband.spouses || [];
      const husbandHasOnlyThisWife =
        husbandSpouses.length <= 1 ||
        (husbandSpouses.length === 1 && (husbandSpouses[0].personKey === person.key || normalizeArabic(husbandSpouses[0].name) === normalizeArabic(person.name)));

      for (const child of husbandChildren) {
        if (child.mother) {
          if (child.mother.personKey === person.key || normalizeArabic(child.mother.name) === normalizeArabic(person.name)) {
            if (!matchedKeys.has(child.key)) {
              matchedKeys.add(child.key);
              matched.push(child);
            }
          }
        } else if (husbandHasOnlyThisWife) {
          if (!matchedKeys.has(child.key)) {
            matchedKeys.add(child.key);
            matched.push(child);
          }
        }
      }
    }

    // B. Search anywhere in people where mother is this person and father is this spouse
    people.forEach(p => {
      if (p.deleted || matchedKeys.has(p.key)) return;
      if (p.mother) {
        const isExactMother = p.mother.personKey === person.key;
        const isNameMatch = p.mother.name && normalizeArabic(p.mother.name) === normalizeArabic(person.name);

        if (isExactMother) {
          if (!husbandKey || p.parentKey === husbandKey) {
            matchedKeys.add(p.key);
            matched.push(p);
          }
        } else if (isNameMatch && husbandKey && p.parentKey === husbandKey) {
          // Name match is ONLY accepted if child's father is confirmed to be this specific husband
          matchedKeys.add(p.key);
          matched.push(p);
        }
      }

      // Or if child was registered directly under her childrenKeys
      if (person.childrenKeys.includes(p.key) && !matchedKeys.has(p.key)) {
        if (p.parentKey === person.key) {
          // Attached directly to mother: if she has 1 spouse or matching note, attribute to this spouse
          if ((person.spouses || []).length <= 1) {
            matchedKeys.add(p.key);
            matched.push(p);
          } else if (p.note && normalizeArabic(p.note).includes(normalizeArabic(spouse.name))) {
            matchedKeys.add(p.key);
            matched.push(p);
          }
        } else if (!husbandKey || p.parentKey === husbandKey) {
          matchedKeys.add(p.key);
          matched.push(p);
        }
      }
    });
  }

  // Deduplicate and sort sons first, then daughters
  const sons = matched.filter(c => c.gender !== 'f');
  const daughters = matched.filter(c => c.gender === 'f');

  return { sons, daughters, all: [...sons, ...daughters] };
}

/**
 * 1. Defines whether a person is a "sabt" (descendant through female/sabt line).
 * A person is a sabt if:
 * a) Their mother is a female from the family/trunk, or
 * b) They are descendants of a sabt (parent along ancestry chain is female).
 */
export function isSabt(personKey: string, people: Map<string, ProcessedPerson>): boolean {
  const person = people.get(personKey);
  if (!person) return false;
  if (person.mother && person.mother.personKey) {
    if (isSabt(person.mother.personKey, people)) return true;
  }
  let cur: ProcessedPerson | undefined = person;
  while (cur && cur.parentKey) {
    const parent = people.get(cur.parentKey);
    if (!parent) break;
    if (parent.gender === 'f') return true;
    cur = parent;
  }
  return false;
}

export function isOriginalTrunk(personKey: string, people: Map<string, ProcessedPerson>): boolean {
  return !isSabt(personKey, people);
}

/**
 * 2. Resolves the father's name for a person (attributes child to father always).
 * If added under a female (parent.gender === 'f'), searches for her husband and returns his name.
 */
export function getFatherName(personKey: string, people: Map<string, ProcessedPerson>): string {
  const person = people.get(personKey);
  if (!person) return 'من خارج العائلة';
  if (!person.parentKey) return 'من خارج العائلة';
  const parent = people.get(person.parentKey);
  if (!parent) return 'من خارج العائلة';

  if (parent.gender === 'f') {
    const spouses = parent.spouses || [];
    if (spouses.length > 0) {
      if (
        person.mother?.name &&
        person.mother.personKey !== parent.key &&
        normalizeArabic(person.mother.name) !== normalizeArabic(parent.name)
      ) {
        const matchedSpouse = spouses.find(s => normalizeArabic(s.name) === normalizeArabic(person.mother!.name));
        if (matchedSpouse) return matchedSpouse.name;
      }
      return spouses[0].name || 'من خارج العائلة';
    }
    if (
      person.mother?.name &&
      person.mother.personKey !== parent.key &&
      normalizeArabic(person.mother.name) !== normalizeArabic(parent.name)
    ) {
      return person.mother.name;
    }
    return 'من خارج العائلة';
  } else {
    return parent.name;
  }
}

/**
 * 3. Formats mother's name: adds (آل فردان) only if from original trunk,
 * and strictly prohibits it for sabt mothers.
 */
export function getMotherNameFormatted(personKey: string, people: Map<string, ProcessedPerson>): string {
  const person = people.get(personKey);
  if (!person) return '';
  const parent = person.parentKey ? people.get(person.parentKey) : null;
  const isChildOfFemale = parent?.gender === 'f';

  if (isChildOfFemale && parent) {
    const motherSabt = isSabt(parent.key, people);
    if (!motherSabt) {
      return `${parent.name} (آل فردان)`;
    }
    return parent.name;
  }

  if (person.mother) {
    const mName = person.mother.name;
    if (!mName) return '';
    const mPersonKey = person.mother.personKey;
    const mPerson = mPersonKey ? people.get(mPersonKey) : null;
    const motherSabt = mPerson ? isSabt(mPerson.key, people) : (!person.mother.isFromFamily);

    if (person.mother.isFromFamily && !motherSabt) {
      return `${mName} (آل فردان)`;
    }
    return mName + (person.mother.familyOrigin ? ` (${person.mother.familyOrigin})` : '');
  }

  return '';
}



