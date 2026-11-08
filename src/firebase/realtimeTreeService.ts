import { doc, collection, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirestoreQuotaExhausted, tripFirestoreCircuitBreaker } from './config';
import { FamilyState, ContactInfo, ArchivalPhoto, NotableFigure } from '../types/family';
import { deduplicateMembers, resolveContactInfo, resolveNotableFigures, normalizeTimestamp, LEGACY_REMOVED_NOTABLE_IDS } from '../data/treeManager';

const STATE_DOC_REF = doc(db, 'family_tree', 'state');
const SETTINGS_CONTACT_REF = doc(db, 'settings', 'contactInfo');
const ARCHIVAL_PHOTOS_COL = collection(db, 'archival_photos');
const NOTABLE_FIGURES_COL = collection(db, 'notable_figures');

export function markQuotaExhausted() {
  tripFirestoreCircuitBreaker();
}

function isQuotaError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    err?.code === 'resource-exhausted' ||
    err?.code === 8 ||
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota') ||
    msg.includes('quota')
  );
}

// Remove any undefined values so Firestore does not throw errors
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Subscribe to real-time updates from Firestore.
 * Fires whenever any admin adds, edits, or deletes an individual, marriage, or mother.
 */
export function subscribeToFamilyState(
  onUpdate: (cloudState: Partial<FamilyState>) => void,
  onError?: (err: any) => void
): () => void {
  let unsub: (() => void) | null = null;
  try {
    unsub = onSnapshot(
      STATE_DOC_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onUpdate({
            members: Array.isArray(data.members) ? deduplicateMembers(data.members) : undefined,
            photos: data.photos || undefined,
            over: data.over || undefined,
            removed: Array.isArray(data.removed) ? data.removed : undefined,
            spouses: data.spouses || undefined,
            mothers: data.mothers || undefined,
            archivalPhotos: Array.isArray(data.archivalPhotos) ? data.archivalPhotos : undefined,
            notableFigures: Array.isArray(data.notableFigures) ? resolveNotableFigures(data.notableFigures) : undefined,
            contactInfo: data.contactInfo ? resolveContactInfo(data.contactInfo) : undefined,
            updatedAt: typeof data.updatedAt === 'number' ? normalizeTimestamp(data.updatedAt) : undefined
          });
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          tripFirestoreCircuitBreaker();
        }
        if (onError) onError(err);
      }
    );
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Subscribe directly to the dedicated archival_photos collection so newly uploaded
 * archival photos and documents sync instantaneously across all websites (<300ms)
 * without ever hitting the 1MB single-document limit.
 */
export function subscribeToArchivalPhotos(
  onUpdate: (cloudPhotos: ArchivalPhoto[], deletedIds: string[]) => void,
  onError?: (err: any) => void
): () => void {
  let unsub: (() => void) | null = null;
  try {
    unsub = onSnapshot(
      ARCHIVAL_PHOTOS_COL,
      (snapshot) => {
        const photos: ArchivalPhoto[] = [];
        const deletedIds: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data?.deleted) {
            deletedIds.push(docSnap.id);
          } else if (data && data.id && data.title && data.url) {
            photos.push({
              id: data.id,
              title: data.title,
              url: data.url,
              notes: data.notes || '',
              era: data.era || undefined,
              location: data.location || undefined,
              category: data.category || 'documents',
              taggedPersonKeys: Array.isArray(data.taggedPersonKeys) ? data.taggedPersonKeys : [],
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
              addedBy: data.addedBy || 'إدارة الأرشيف'
            });
          }
        });
        if (photos.length > 0 || deletedIds.length > 0) {
          onUpdate(photos, deletedIds);
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          tripFirestoreCircuitBreaker();
        }
        if (onError) onError(err);
      }
    );
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Save a single archival photo or document directly to Firestore archival_photos/{id}
 * so even high-resolution compressed images sync immediately across all websites.
 */
export async function syncArchivalPhotoToCloud(photo: ArchivalPhoto): Promise<void> {
  if (isFirestoreQuotaExhausted() || !photo?.id) return;
  try {
    // Firestore single document limit is 1MB; ensure url is within safe bounds (<750KB)
    if (photo.url && photo.url.length > 780000) {
      console.warn('Archival photo URL exceeds safe Firestore single-doc size:', photo.id);
      return;
    }
    const payload = sanitizeForFirestore({
      ...photo,
      deleted: false,
      updatedAt: Date.now()
    });
    const writePromise = setDoc(doc(db, 'archival_photos', photo.id), payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 6000)
    );
    await Promise.race([writePromise, timeoutPromise]);
  } catch (err: any) {
    if (isQuotaError(err)) {
      tripFirestoreCircuitBreaker();
    }
  }
}

/**
 * Delete or mark an archival photo as deleted in Firestore archival_photos/{id}.
 */
export async function deleteArchivalPhotoFromCloud(photoId: string): Promise<void> {
  if (isFirestoreQuotaExhausted() || !photoId) return;
  try {
    await setDoc(doc(db, 'archival_photos', photoId), {
      id: photoId,
      deleted: true,
      updatedAt: Date.now()
    });
    await deleteDoc(doc(db, 'archival_photos', photoId)).catch(() => {});
  } catch (err: any) {
    if (isQuotaError(err)) {
      tripFirestoreCircuitBreaker();
    }
  }
}

/**
 * Subscribe directly to the dedicated notable_figures collection so admin additions/edits/deletions
 * in "أعلام العائلة" sync instantaneously across all websites (<300ms).
 */
export function subscribeToNotableFigures(
  onUpdate: (cloudNotables: NotableFigure[], deletedIds: string[]) => void,
  onError?: (err: any) => void
): () => void {
  let unsub: (() => void) | null = null;
  try {
    unsub = onSnapshot(
      NOTABLE_FIGURES_COL,
      (snapshot) => {
        const figures: NotableFigure[] = [];
        const deletedIds: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docTs = typeof data?.updatedAt === 'number' ? data.updatedAt : (data?.createdAt || 0);
          if (data?.deleted || (LEGACY_REMOVED_NOTABLE_IDS.has(docSnap.id) && docTs <= 1704067300000)) {
            deletedIds.push(docSnap.id);
          } else if (data && data.id && data.name) {
            figures.push({
              id: data.id,
              personKey: data.personKey || 'oF',
              name: data.name,
              title: data.title || '',
              branch: data.branch || 'عائلة الفردان',
              birthDeath: data.birthDeath || '',
              era: data.era || undefined,
              biography: data.biography || '',
              achievements: Array.isArray(data.achievements) ? data.achievements : [],
              photo: data.photo || undefined,
              manuscripts: Array.isArray(data.manuscripts) ? data.manuscripts : [],
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
              updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
              deleted: false
            });
          }
        });
        if (figures.length > 0 || deletedIds.length > 0) {
          onUpdate(figures, deletedIds);
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          tripFirestoreCircuitBreaker();
        }
        if (onError) onError(err);
      }
    );
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  } catch {
    return () => {};
  }
}

export async function syncNotableFigureToCloud(figure: NotableFigure): Promise<void> {
  if (isFirestoreQuotaExhausted() || !figure?.id) return;
  try {
    const payload = sanitizeForFirestore({
      ...figure,
      deleted: figure.deleted === true,
      updatedAt: figure.updatedAt || Date.now()
    });
    const writePromise = setDoc(doc(db, 'notable_figures', figure.id), payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 6000)
    );
    await Promise.race([writePromise, timeoutPromise]);
  } catch (err: any) {
    if (isQuotaError(err)) {
      tripFirestoreCircuitBreaker();
    }
  }
}

export async function deleteNotableFigureFromCloud(figureId: string, deletedAt?: number): Promise<void> {
  if (isFirestoreQuotaExhausted() || !figureId) return;
  try {
    const writePromise = setDoc(
      doc(db, 'notable_figures', figureId),
      {
        id: figureId,
        deleted: true,
        updatedAt: deletedAt || Date.now()
      },
      { merge: true }
    );
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 6000)
    );
    await Promise.race([writePromise, timeoutPromise]);
  } catch (err: any) {
    if (isQuotaError(err)) {
      tripFirestoreCircuitBreaker();
    }
  }
}

/**
 * Subscribe directly to the dedicated settings/contactInfo Firestore document.
 */
export function subscribeToContactInfo(
  onUpdate: (info: ContactInfo) => void,
  onError?: (err: any) => void
): () => void {
  let unsub: (() => void) | null = null;
  try {
    unsub = onSnapshot(
      SETTINGS_CONTACT_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ContactInfo;
          if (data) {
            onUpdate(resolveContactInfo(data));
          }
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          tripFirestoreCircuitBreaker();
        }
        if (onError) onError(err);
      }
    );
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Fetch dedicated contactInfo from settings/contactInfo Firestore document.
 */
export async function getCloudContactInfo(): Promise<ContactInfo | null> {
  if (isFirestoreQuotaExhausted()) return null;
  try {
    const snap = await getDoc(SETTINGS_CONTACT_REF);
    if (snap.exists()) {
      return resolveContactInfo(snap.data() as ContactInfo);
    }
  } catch (e: any) {
    if (isQuotaError(e)) {
      tripFirestoreCircuitBreaker();
    }
  }
  return null;
}

/**
 * Save dedicated contact info to settings/contactInfo in Firestore.
 */
export async function syncContactInfoToCloud(info: ContactInfo): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const payload = sanitizeForFirestore({
      ...resolveContactInfo(info),
      updatedAt: Date.now()
    });

    const writePromise = setDoc(SETTINGS_CONTACT_REF, payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 5000)
    );

    await Promise.race([writePromise, timeoutPromise]);
  } catch (err: any) {
    if (isQuotaError(err)) {
      tripFirestoreCircuitBreaker();
    }
  }
}

let pendingCloudWriteTimer: ReturnType<typeof setTimeout> | null = null;
let latestPendingState: FamilyState | null = null;

/**
 * Save current state to Firestore so all connected devices update in real-time.
 * Coalesces rapid back-to-back calls within 200ms to prevent duplicate write bursts.
 */
export async function syncFamilyStateToCloud(state: FamilyState): Promise<void> {
  latestPendingState = state;
  if (pendingCloudWriteTimer) {
    clearTimeout(pendingCloudWriteTimer);
  }

  return new Promise((resolve) => {
    pendingCloudWriteTimer = setTimeout(async () => {
      pendingCloudWriteTimer = null;
      const targetState = latestPendingState;
      if (!targetState || isFirestoreQuotaExhausted()) {
        resolve();
        return;
      }

      try {
        const safeContact = resolveContactInfo(targetState.contactInfo);
        // Keep Firestore document compact by avoiding huge >120KB raw base64 strings while /api/upload-avatar converts them
        const compactPhotos: Record<string, string> = {};
        for (const [k, v] of Object.entries(targetState.photos || {})) {
          if (typeof v === 'string' && v.length < 120000) {
            compactPhotos[k] = v;
          }
        }

        // Also keep archivalPhotos in family_tree/state compact (<90KB per item) while syncing full items to archival_photos/{id}
        const compactArchivalPhotos: ArchivalPhoto[] = [];
        for (const ap of targetState.archivalPhotos || []) {
          if (!ap || !ap.id) continue;
          if (typeof ap.url === 'string' && ap.url.startsWith('data:image/')) {
            syncArchivalPhotoToCloud(ap).catch(() => {});
            if (ap.url.length < 90000) {
              compactArchivalPhotos.push(ap);
            }
          } else {
            compactArchivalPhotos.push(ap);
          }
        }

        // Keep notableFigures in family_tree/state compact (<90KB per item) while syncing full items to notable_figures/{id}
        const compactNotableFigures: NotableFigure[] = [];
        for (const nf of targetState.notableFigures || []) {
          if (!nf || !nf.id) continue;
          const sanitizedManuscripts = (nf.manuscripts || []).map((ms) => {
            if (ms && typeof ms.url === 'string' && ms.url.startsWith('data:image/') && ms.url.length >= 90000) {
              return { ...ms, url: `/avatars/${ms.id}.jpg` };
            }
            return ms;
          });
          const sanitizedPhoto =
            nf.photo && nf.photo.startsWith('data:image/') && nf.photo.length >= 90000
              ? `/avatars/${nf.id}.jpg`
              : nf.photo;
          compactNotableFigures.push({
            ...nf,
            photo: sanitizedPhoto,
            manuscripts: sanitizedManuscripts
          });
        }

        const payload = sanitizeForFirestore({
          members: deduplicateMembers(targetState.members || []),
          photos: compactPhotos,
          over: targetState.over || {},
          removed: targetState.removed || [],
          spouses: targetState.spouses || {},
          mothers: targetState.mothers || {},
          archivalPhotos: compactArchivalPhotos,
          notableFigures: compactNotableFigures,
          contactInfo: safeContact,
          updatedAt: normalizeTimestamp(targetState.updatedAt) || normalizeTimestamp(Date.now())
        });

        const writePromise = setDoc(STATE_DOC_REF, payload, { merge: true });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 6000)
        );

        await Promise.race([writePromise, timeoutPromise]);
      } catch (err: any) {
        if (isQuotaError(err)) {
          tripFirestoreCircuitBreaker();
        }
      }
      resolve();
    }, 25);
  });
}

/**
 * Check if initial Firestore state exists or if local state has newer members (e.g. 1307 names).
 */
export async function ensureCloudInitialized(localState: FamilyState): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const snap = await getDoc(STATE_DOC_REF);
    if (!snap.exists()) {
      await syncFamilyStateToCloud(localState);
    } else {
      const data = snap.data();
      const cloudTs = typeof data?.updatedAt === 'number' ? normalizeTimestamp(data.updatedAt) : 0;
      const localTs = typeof localState?.updatedAt === 'number' ? normalizeTimestamp(localState.updatedAt) : 0;
      const cloudMembersCount = Array.isArray(data?.members) ? data.members.length : 0;
      const localMembersCount = Array.isArray(localState?.members) ? localState.members.length : 0;
      if (localTs > cloudTs || localMembersCount > cloudMembersCount) {
        await syncFamilyStateToCloud(localState);
      }
    }
  } catch (e: any) {
    if (isQuotaError(e)) {
      tripFirestoreCircuitBreaker();
    }
  }
}
