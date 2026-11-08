export interface RawTreeNode {
  i: string;
  n: string;
  t?: string;
  note?: string;
  c?: RawTreeNode[];
}

export interface SpouseInfo {
  id: string;
  name: string;
  isFromFamily: boolean;
  personKey?: string;
  familyOrigin?: string;
  notes?: string;
  year?: number | null;
}

export interface MotherInfo {
  name: string;
  isFromFamily: boolean;
  personKey?: string;
  familyOrigin?: string;
  notes?: string;
}

export interface AddedMember {
  id: string;
  name: string;
  gender: 'm' | 'f';
  parent: string; // e.g. "o451" or "a123"
  year?: number | null;
  birthDate?: string | null;
  note?: string;
  isDeceased?: boolean;
  deathYear?: number | null;
  at?: number;
  del?: boolean;
  spouses?: SpouseInfo[];
  motherInfo?: MotherInfo;
}

export interface MemberOverrides {
  name?: string;
  gender?: 'm' | 'f';
  year?: number | null;
  birthDate?: string | null;
  note?: string;
  parent?: string;
  isDeceased?: boolean;
  deathYear?: number | null;
  spouses?: SpouseInfo[];
  motherInfo?: MotherInfo;
  del?: boolean;
  at?: number;
}

export interface ArchivalPhoto {
  id: string;
  title: string;
  url: string;
  notes: string;
  era?: string;
  location?: string;
  category?: 'historical' | 'events' | 'portraits' | 'documents' | 'heritage' | 'general';
  taggedPersonKeys?: string[];
  createdAt: number;
  addedBy?: string;
}

export interface NotableManuscript {
  id: string;
  title: string;
  url: string;
  description?: string;
  era?: string;
}

export interface NotableFigure {
  id: string;
  personKey: string; // ID in the interactive family tree (e.g. "ot0", "o4", "o15", "am_...")
  name: string;
  title: string;
  branch: string;
  birthDeath: string;
  era?: string;
  photo?: string;
  branchName?: string;
  birthYear?: string | number | null;
  deathYear?: string | number | null;
  eraText?: string;
  photoUrl?: string | null;
  biography: string;
  achievements?: string[];
  manuscripts?: NotableManuscript[];
  order?: number;
  createdAt?: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface ContactInfo {
  email?: string;
  whatsapp?: string;
  creditsLines?: string[];
  verifiedBy?: string;
}

export interface FamilyState {
  members: AddedMember[];
  photos: Record<string, string>;
  over: Record<string, MemberOverrides>;
  removed: string[];
  archivalPhotos?: ArchivalPhoto[];
  notableFigures?: NotableFigure[];
  spouses?: Record<string, SpouseInfo[]>;
  mothers?: Record<string, MotherInfo>;
  contactInfo?: ContactInfo;
  updatedAt?: number;
}

export interface ProcessedPerson {
  key: string; // "ot0", "o4", "a..."
  name: string;
  label: string; // with title if applicable
  title?: string | null;
  gender: 'm' | 'f';
  year: number | null;
  birthDate?: string | null;
  note: string;
  isDeceased?: boolean;
  deathYear?: number | null;
  parentKey: string | null;
  origParentKey: string | null;
  isNew: boolean;
  renamed: boolean;
  moved: boolean;
  deleted: boolean;
  at?: number;
  childrenKeys: string[];
  photo?: string | null;
  generation: number;
  branch: string; // branch code for color theme e.g. "b1", "b2", ...
  branchName?: string;
  spouses?: SpouseInfo[];
  mother?: MotherInfo | null;
}

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

export type ActiveTab = 'home' | 'tree' | 'directory' | 'notables' | 'photos' | 'doc' | 'about' | 'certificate' | 'contact';
