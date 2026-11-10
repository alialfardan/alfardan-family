import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, setLogLevel } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Remove legacy .github_token file if it exists
try {
  const legacyTokenFile = path.resolve(__dirname, '.github_token');
  if (fs.existsSync(legacyTokenFile)) {
    fs.unlinkSync(legacyTokenFile);
  }
} catch {}

// Initialize server-side Firestore client so backend API saves also guarantee instant Firestore metadata sync
let serverDb: ReturnType<typeof getFirestore> | null = null;
try {
  setLogLevel('silent');
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    const fbApp = getApps().length > 0 ? getApp() : initializeApp(cfg);
    serverDb = cfg.firestoreDatabaseId ? getFirestore(fbApp, cfg.firestoreDatabaseId) : getFirestore(fbApp);
  }
} catch (e) {
  console.warn('Server Firestore init notice:', e);
}

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = sanitizeForFirestore(v);
    }
    return clean;
  }
  return obj;
}

const SERVER_BASELINE_TS = 1743850000000;
const VALID_SERVER_PHOTO_KEY_RE = /^[a-zA-Z0-9_-]+$/;

function getServerAvatarVersion(url?: string): number {
  if (!url || typeof url !== 'string') return 0;
  const m = url.match(/[?&]v=(\d+)/);
  return m ? parseInt(m[1], 10) || 0 : 0;
}

function isValidServerPhotoEntry(key: string, val: unknown): val is string {
  if (!key || !VALID_SERVER_PHOTO_KEY_RE.test(key)) return false;
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
  if (trimmed.startsWith('/avatars/')) {
    return /^\/avatars\/([a-zA-Z0-9_-]+)\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(trimmed);
  }
  return true;
}

function normalizeServerTimestamp(ts?: number | null): number {
  if (!ts || typeof ts !== 'number' || ts <= 0) return 0;
  return ts;
}

function getServerSafeTimestamp(incomingTime?: number, existingTime?: number): number {
  const inc = normalizeServerTimestamp(incomingTime);
  const ex = normalizeServerTimestamp(existingTime);
  const rawNow = Date.now();
  const highest = Math.max(inc, ex, SERVER_BASELINE_TS);
  if (inc > ex) return Math.max(inc, rawNow);
  return Math.max(rawNow, highest + 100);
}

let lastServerFirestoreWriteAt = 0;

const SERVER_LEGACY_REMOVED_NOTABLE_IDS = new Set<string>([
  'notable_sheikh_ali',
  'notable_al_fardan_founder',
  'notable_fardan_ayoub',
  'notable_mohammad_founder',
  'notable_hussain_founder',
  'notable_abdullah_founder',
  'notable_mulla_hussain'
]);

async function syncToFirestoreFromServer(familyData: any): Promise<void> {
  if (!serverDb || !familyData) return;
  try {
    // Never store Base64 images in Firebase; only sync clean /avatars/ or http(s) URLs
    const compactPhotos: Record<string, string> = {};
    for (const [k, v] of Object.entries(familyData.photos || {})) {
      if (v === '') {
        compactPhotos[k] = '';
        continue;
      }
      if (
        isValidServerPhotoEntry(k, v) &&
        !v.trim().startsWith('data:image/') &&
        (v.trim().startsWith('/avatars/') || v.trim().startsWith('http://') || v.trim().startsWith('https://'))
      ) {
        compactPhotos[k] = v.trim();
      }
    }
    const safeUpdatedAt = normalizeServerTimestamp(familyData.updatedAt) || getServerSafeTimestamp();
    lastServerFirestoreWriteAt = safeUpdatedAt;
    const payload = sanitizeForFirestore({
      members: familyData.members || [],
      photos: compactPhotos,
      over: familyData.over || {},
      removed: familyData.removed || [],
      spouses: familyData.spouses || {},
      mothers: familyData.mothers || {},
      archivalPhotos: (familyData.archivalPhotos || []).filter(
        (ap: any) => ap && typeof ap.url === 'string' && !ap.url.startsWith('data:image/')
      ),
      notableFigures: (familyData.notableFigures || []).map((nf: any) => ({
        ...nf,
        photo: nf?.photo && typeof nf.photo === 'string' && nf.photo.startsWith('data:image/') ? undefined : nf?.photo
      })),
      contactInfo: familyData.contactInfo || {},
      updatedAt: safeUpdatedAt
    });
    await setDoc(doc(serverDb, 'family_tree', 'state'), payload, { merge: true });
  } catch {
    // Silent fallback if quota is temporarily reached
  }
}

function mergeTwoMemberRecordsServer(existing: any, incoming: any, forceIncoming = true): any {
  const existingAt = normalizeServerTimestamp(existing?.at);
  const incomingAt = normalizeServerTimestamp(incoming?.at);
  const incomingIsNewer = forceIncoming ? true : (incomingAt >= existingAt);
  const newer = incomingIsNewer ? incoming : existing;
  const older = incomingIsNewer ? existing : incoming;

  const isDel = newer?.del !== undefined ? !!newer.del : !!older?.del;

  return {
    ...older,
    ...newer,
    id: existing?.id || incoming?.id,
    name: newer?.name || older?.name,
    gender: newer?.gender || older?.gender || 'm',
    parent: newer?.parent || older?.parent,
    del: isDel,
    year: newer?.year !== undefined ? newer.year : older?.year,
    birthDate: newer?.birthDate !== undefined ? newer.birthDate : older?.birthDate,
    isDeceased: newer?.isDeceased !== undefined ? newer.isDeceased : older?.isDeceased,
    deathYear: newer?.deathYear !== undefined ? newer.deathYear : older?.deathYear,
    note: newer?.note !== undefined ? newer.note : older?.note,
    spouses: newer?.spouses !== undefined ? newer.spouses : older?.spouses,
    motherInfo: newer?.motherInfo !== undefined ? newer.motherInfo : older?.motherInfo,
    at: Math.max(existingAt, incomingAt) || SERVER_BASELINE_TS
  };
}

function deduplicateServerMembers(members: any[], forceIncoming = true): any[] {
  const byId = new Map<string, any>();
  for (const rawM of members) {
    if (!rawM || !rawM.name) continue;
    const m = {
      ...rawM,
      at: normalizeServerTimestamp(rawM.at) || SERVER_BASELINE_TS - 1000
    };
    if (m.id && byId.has(m.id)) {
      byId.set(m.id, mergeTwoMemberRecordsServer(byId.get(m.id), m, forceIncoming));
    } else if (m.id) {
      byId.set(m.id, m);
    } else {
      byId.set(`${m.parent}_${m.name}_${m.gender || 'm'}`, m);
    }
  }

  const bySig = new Map<string, any>();
  for (const m of byId.values()) {
    const cleanNameWithTitle = String(m.name || '')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
    const motherKey = m.motherInfo?.personKey || m.motherInfo?.name || '';
    const key = `${m.parent || ''}_${cleanNameWithTitle}_${m.gender || 'm'}_${motherKey}`;
    if (!bySig.has(key)) {
      bySig.set(key, m);
    } else {
      bySig.set(key, mergeTwoMemberRecordsServer(bySig.get(key), m, forceIncoming));
    }
  }
  return Array.from(bySig.values());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Track files whose content actually changed on disk
  const sessionFilesWritten = new Set<string>();

  // Body parser with 50MB limit for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure public/avatars directory exists
  const avatarsDir = path.resolve(__dirname, 'public/avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  const TARGET_JSON_FILES = [
    'src/data/initialTreeData.json',
    'src/data/initialTreeData.backup.json',
    'public/fardan_family_tree_backup.json'
  ];

  // Helper: write file ONLY if its content actually changed
  function writeFileIfChanged(relPath: string, newContent: string | Buffer): boolean {
    const fullPath = path.resolve(__dirname, relPath);
    const newBuf = typeof newContent === 'string' ? Buffer.from(newContent, 'utf-8') : newContent;
    if (fs.existsSync(fullPath)) {
      try {
        const existingBuf = fs.readFileSync(fullPath);
        if (existingBuf.equals(newBuf)) {
          return false;
        }
      } catch {}
    } else {
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }
    fs.writeFileSync(fullPath, newBuf);
    sessionFilesWritten.add(relPath);
    return true;
  }

  function removeAvatarFileFromDiskServer(key: string): string[] {
    const removedFiles: string[] = [];
    const cleanKey = String(key || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanKey || !fs.existsSync(avatarsDir)) return removedFiles;
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const relPath = `public/avatars/${cleanKey}.${ext}`;
      const filePath = path.resolve(__dirname, relPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          removedFiles.push(relPath);
          sessionFilesWritten.add(relPath);
        } catch {}
      }
    }
    return removedFiles;
  }

  // Helper to extract any Base64 image to public/avatars/[key].jpg (only writing if content changed)
  // and return its clean /avatars/[key].jpg?v=[timestamp] path + filesWritten
  function savePhotoToAvatarsDirAndGetCleanPath(
    key: string,
    val: string,
    vStamp: number
  ): { cleanPath: string | null; filesWritten: string[] } {
    const filesWritten: string[] = [];
    if (!key || !val || typeof val !== 'string') return { cleanPath: null, filesWritten };
    const trimmed = val.trim();
    if (!trimmed) return { cleanPath: null, filesWritten };
    const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanKey) return { cleanPath: null, filesWritten };

    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    if (trimmed.startsWith('data:image/')) {
      const m = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
      const rawBase64 = m ? m[1] : trimmed.split(',')[1];
      if (rawBase64) {
        const filename = `${cleanKey}.jpg`;
        const relAvatarPath = `public/avatars/${filename}`;
        const imgBuf = Buffer.from(rawBase64, 'base64');
        if (writeFileIfChanged(relAvatarPath, imgBuf)) {
          filesWritten.push(relAvatarPath);
        }
        return { cleanPath: `/avatars/${filename}?v=${vStamp}`, filesWritten };
      }
      return { cleanPath: null, filesWritten };
    }

    if (trimmed.startsWith('/avatars/')) {
      const cleanFile = trimmed.split('?')[0].replace(/^\/avatars\//, '');
      const sourcePath = path.join(avatarsDir, cleanFile);
      const targetFilename = `${cleanKey}.jpg`;
      const relTargetPath = `public/avatars/${targetFilename}`;

      // If another avatar file was selected from the gallery for this person, copy it to public/avatars/[cleanKey].jpg if content differs
      if (cleanFile !== targetFilename && fs.existsSync(sourcePath)) {
        try {
          const srcBuf = fs.readFileSync(sourcePath);
          if (writeFileIfChanged(relTargetPath, srcBuf)) {
            filesWritten.push(relTargetPath);
          }
          return { cleanPath: `/avatars/${targetFilename}?v=${vStamp}`, filesWritten };
        } catch {}
      }

      return { cleanPath: trimmed, filesWritten };
    }

    return { cleanPath: trimmed, filesWritten };
  }

  function updateAvatarsManifest(updatedFileUrls?: Record<string, string>): string[] {
    const written: string[] = [];
    try {
      if (!fs.existsSync(avatarsDir)) return written;
      const manifestRelPath = 'public/avatars-manifest.json';
      const manifestFullPath = path.resolve(__dirname, manifestRelPath);
      const existingUrlByFilename = new Map<string, string>();
      if (fs.existsSync(manifestFullPath)) {
        try {
          const existingArr = JSON.parse(fs.readFileSync(manifestFullPath, 'utf-8'));
          if (Array.isArray(existingArr)) {
            for (const item of existingArr) {
              if (item && typeof item.filename === 'string' && typeof item.url === 'string') {
                existingUrlByFilename.set(item.filename, item.url);
              }
            }
          }
        } catch {}
      }

      const files = fs.readdirSync(avatarsDir)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const manifest = files.map((filename) => {
        const overrideUrl = updatedFileUrls?.[filename];
        const prevUrl = existingUrlByFilename.get(filename);
        return {
          filename,
          url: overrideUrl || prevUrl || `/avatars/${filename}`
        };
      });

      const nextContent = JSON.stringify(manifest, null, 2);
      if (writeFileIfChanged(manifestRelPath, nextContent)) {
        written.push(manifestRelPath);
      }
    } catch {}
    return written;
  }

  // 1. API: Upload Avatar — saves file directly to public/avatars/[key].jpg and records /avatars/[key].jpg?v=[timestamp] in JSON files
  app.post('/api/upload-avatar', (req, res) => {
    try {
      const { key, dataUrl } = req.body;
      if (!key || !dataUrl) {
        return res.status(400).json({ error: 'Missing key or dataUrl' });
      }

      const vStamp = getServerSafeTimestamp();
      const { cleanPath: cleanAvatarPath, filesWritten } = savePhotoToAvatarsDirAndGetCleanPath(key, dataUrl, vStamp);
      if (!cleanAvatarPath) {
        return res.status(400).json({ error: 'Invalid dataUrl format' });
      }

      let latestFamilyData: any = null;

      for (const p of TARGET_JSON_FILES) {
        const fullPath = path.resolve(__dirname, p);
        if (fs.existsSync(fullPath)) {
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const targetObj = parsed.familyData ? parsed.familyData : parsed;
            let entryChanged = filesWritten.length > 0;

            if (key.startsWith('arch_') || key.startsWith('photo_')) {
              if (Array.isArray(targetObj.archivalPhotos)) {
                targetObj.archivalPhotos = targetObj.archivalPhotos.map((ap: any) => {
                  if (ap && ap.id === key && ap.url !== cleanAvatarPath) {
                    entryChanged = true;
                    return { ...ap, url: cleanAvatarPath };
                  }
                  return ap;
                });
              }
            } else {
              if (!targetObj.photos) targetObj.photos = {};
              if (targetObj.photos[key] !== cleanAvatarPath) {
                targetObj.photos[key] = cleanAvatarPath;
                entryChanged = true;
              }
            }

            if (entryChanged) {
              targetObj.updatedAt = getServerSafeTimestamp(vStamp, targetObj.updatedAt);
            }
            latestFamilyData = targetObj;
            const nextSerialized = JSON.stringify(parsed, null, 2);
            if (writeFileIfChanged(p, nextSerialized)) {
              filesWritten.push(p);
            }
          } catch (e) {
            console.error(`Error updating ${p}:`, e);
          }
        }
      }

      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
      const manifestWritten = updateAvatarsManifest(
        filesWritten.length > 0 ? { [`${cleanKey}.jpg`]: cleanAvatarPath } : undefined
      );
      filesWritten.push(...manifestWritten);

      if (latestFamilyData && filesWritten.length > 0) {
        syncToFirestoreFromServer(latestFamilyData).catch(() => {});
      }

      return res.json({ success: true, url: cleanAvatarPath, filesWritten });
    } catch (err: any) {
      console.error('Error in /api/upload-avatar:', err);
      return res.status(500).json({ error: err.message || 'Failed to save avatar' });
    }
  });

  // 1b. API: Delete Avatar — permanently deletes public/avatars/[key].jpg and removes photos[key] from JSON files
  app.post('/api/delete-avatar', (req, res) => {
    try {
      const { key } = req.body || {};
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'Missing key' });
      }

      const vStamp = getServerSafeTimestamp();
      const filesWritten = removeAvatarFileFromDiskServer(key);

      let latestFamilyData: any = null;
      for (const p of TARGET_JSON_FILES) {
        const fullPath = path.resolve(__dirname, p);
        if (fs.existsSync(fullPath)) {
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const targetObj = parsed.familyData ? parsed.familyData : parsed;
            let entryDeleted = filesWritten.length > 0;
            if (targetObj.photos && typeof targetObj.photos === 'object' && key in targetObj.photos) {
              delete targetObj.photos[key];
              entryDeleted = true;
            }
            if (entryDeleted) {
              targetObj.updatedAt = getServerSafeTimestamp(vStamp, targetObj.updatedAt);
            }
            latestFamilyData = targetObj;
            const nextSerialized = JSON.stringify(parsed, null, 2);
            if (writeFileIfChanged(p, nextSerialized)) {
              filesWritten.push(p);
            }
          } catch (e) {
            console.error(`Error deleting avatar in ${p}:`, e);
          }
        }
      }

      const manifestWritten = updateAvatarsManifest();
      filesWritten.push(...manifestWritten);

      if (latestFamilyData && filesWritten.length > 0) {
        syncToFirestoreFromServer({
          ...latestFamilyData,
          photos: { ...(latestFamilyData.photos || {}), [key]: '' }
        }).catch(() => {});
      }

      return res.json({ success: true, deletedKey: key, updatedAt: vStamp, filesWritten });
    } catch (err: any) {
      console.error('Error in /api/delete-avatar:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete avatar' });
    }
  });

  // Helper to apply and persist incoming state across all 3 JSON files (only writing when content changes)
  function persistStateToTargetJsonFiles(
    rawPayload: any,
    opts?: { ignoreTimestampOnly?: boolean }
  ): {
    syncedFamilyData: any;
    updatedAt: number;
    filesWritten: string[];
  } {
    const filesWrittenSet = new Set<string>();
    const state = rawPayload?.familyData ? rawPayload.familyData : rawPayload;
    const vStamp = getServerSafeTimestamp(state?.updatedAt);
    const incomingPhotos = state?.photos || {};
    const explicitlyDeletedPhotoKeys = new Set<string>(
      Array.isArray(rawPayload?.deletedPhotoKeys) ? rawPayload.deletedPhotoKeys : []
    );

    if (incomingPhotos && typeof incomingPhotos === 'object') {
      for (const [k, val] of Object.entries(incomingPhotos)) {
        if (val === '' || val === null) {
          explicitlyDeletedPhotoKeys.add(k);
        }
      }
    }

    for (const delKey of explicitlyDeletedPhotoKeys) {
      const removed = removeAvatarFileFromDiskServer(delKey);
      removed.forEach((f) => filesWrittenSet.add(f));
    }

    const updatedManifestUrls: Record<string, string> = {};

    const processedArchivalPhotos = Array.isArray(state?.archivalPhotos)
      ? state.archivalPhotos.map((ap: any) => {
          if (ap && ap.id && typeof ap.url === 'string' && ap.url.startsWith('data:image/')) {
            const { cleanPath, filesWritten: fw } = savePhotoToAvatarsDirAndGetCleanPath(ap.id, ap.url, vStamp);
            fw.forEach((f) => filesWrittenSet.add(f));
            if (cleanPath) {
              updatedManifestUrls[`${ap.id.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`] = cleanPath;
              return { ...ap, url: cleanPath };
            }
          }
          return ap;
        })
      : null;

    const processedNotableFigures = Array.isArray(state?.notableFigures)
      ? state.notableFigures.map((nf: any) => {
          if (!nf || !nf.id) return nf;
          let updatedPhoto = nf.photo;
          if (typeof updatedPhoto === 'string' && updatedPhoto.startsWith('data:image/')) {
            const { cleanPath, filesWritten: fw } = savePhotoToAvatarsDirAndGetCleanPath(nf.id, updatedPhoto, vStamp);
            fw.forEach((f) => filesWrittenSet.add(f));
            if (cleanPath) {
              updatedManifestUrls[`${nf.id.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`] = cleanPath;
              updatedPhoto = cleanPath;
            }
          }
          return {
            ...nf,
            photo: updatedPhoto,
          };
        })
      : null;

    let syncedFamilyData: any = null;
    let finalUpdatedAt = vStamp;

    for (const p of TARGET_JSON_FILES) {
      const fullPath = path.resolve(__dirname, p);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const existingData = parsed.familyData ? parsed.familyData : parsed;
        const baseTime = normalizeServerTimestamp(existingData?.updatedAt);
        const incTime = normalizeServerTimestamp(state?.updatedAt) || vStamp;
        finalUpdatedAt = getServerSafeTimestamp(incTime, baseTime);

        const mergedMembers = deduplicateServerMembers(
          [
            ...(existingData?.members || []),
            ...(state?.members || [])
          ],
          true
        );

        // Preserve all existing valid photos without altering unchanged URLs, extract incoming Base64 to public/avatars/, and only delete explicitly removed photos
        const mergedPhotos: Record<string, string> = {};
        for (const [ek, ev] of Object.entries(existingData?.photos || {})) {
          if (explicitlyDeletedPhotoKeys.has(ek)) {
            continue;
          }
          if (isValidServerPhotoEntry(ek, ev)) {
            if (ev.trim().startsWith('data:image/')) {
              const { cleanPath, filesWritten: fw } = savePhotoToAvatarsDirAndGetCleanPath(ek, ev, finalUpdatedAt);
              fw.forEach((f) => filesWrittenSet.add(f));
              if (cleanPath) {
                updatedManifestUrls[`${ek.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`] = cleanPath;
                mergedPhotos[ek] = cleanPath;
              }
            } else {
              mergedPhotos[ek] = ev.trim();
            }
          }
        }
        for (const [pk, pv] of Object.entries(incomingPhotos)) {
          if (explicitlyDeletedPhotoKeys.has(pk) || pv === '' || pv === null) {
            delete mergedPhotos[pk];
            continue;
          }
          if (isValidServerPhotoEntry(pk, pv)) {
            if (pv.trim().startsWith('data:image/')) {
              const { cleanPath, filesWritten: fw } = savePhotoToAvatarsDirAndGetCleanPath(pk, pv, finalUpdatedAt);
              fw.forEach((f) => filesWrittenSet.add(f));
              if (cleanPath) {
                updatedManifestUrls[`${pk.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`] = cleanPath;
                mergedPhotos[pk] = cleanPath;
              }
            } else {
              const { cleanPath, filesWritten: fw } = savePhotoToAvatarsDirAndGetCleanPath(pk, pv, finalUpdatedAt);
              fw.forEach((f) => filesWrittenSet.add(f));
              if (cleanPath) {
                const existingUrl = mergedPhotos[pk];
                if (existingUrl && existingUrl.startsWith('/avatars/') && cleanPath.startsWith('/avatars/')) {
                  const exV = getServerAvatarVersion(existingUrl);
                  const inV = getServerAvatarVersion(cleanPath);
                  mergedPhotos[pk] = inV >= exV ? cleanPath : existingUrl;
                } else {
                  mergedPhotos[pk] = cleanPath;
                }
              }
            }
          }
        }

        // Merge overrides authoritatively without bumping `at` when an override did not change
        const allOverKeys = new Set([
          ...Object.keys(existingData?.over || {}),
          ...Object.keys(state?.over || {})
        ]);
        const mergedOver: Record<string, any> = {};
        for (const k of allOverKeys) {
          const bOv = existingData?.over?.[k] || {};
          const iOv = state?.over?.[k] || {};
          const bAt = normalizeServerTimestamp(bOv.at);
          const iAt = normalizeServerTimestamp(iOv.at);
          const useInc = k in (state?.over || {});
          const candidate = useInc ? { ...bOv, ...iOv } : { ...iOv, ...bOv };
          const bWithoutAt = { ...bOv, at: undefined };
          const candWithoutAt = { ...candidate, at: undefined };
          const overContentChanged = JSON.stringify(bWithoutAt) !== JSON.stringify(candWithoutAt);
          const resolvedAt = overContentChanged
            ? (Math.max(bAt, iAt, finalUpdatedAt) || undefined)
            : (iAt || bAt || undefined);
          if (resolvedAt !== undefined) {
            mergedOver[k] = { ...candidate, at: resolvedAt };
          } else {
            const { at: _unusedAt, ...rest } = candidate;
            mergedOver[k] = rest;
          }
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

        // Sync removed set with timestamped del flags on overrides and members
        const rawRemovedSet = new Set<string>([
          ...(existingData?.removed || []),
          ...(Array.isArray(state?.removed) ? state.removed : [])
        ]);
        for (const [k, ov] of Object.entries(mergedOver)) {
          if (ov?.del === true) rawRemovedSet.add(k);
          else if (ov?.del === false) rawRemovedSet.delete(k);
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

        // Merge notableFigures by ID and timestamp, honoring soft-delete tombstones (deleted: true)
        const notablesMap = new Map<string, any>();
        for (const exNf of existingData?.notableFigures || []) {
          if (!exNf || !exNf.id) continue;
          const exTs = normalizeServerTimestamp(exNf.updatedAt || exNf.createdAt);
          if (SERVER_LEGACY_REMOVED_NOTABLE_IDS.has(exNf.id) && exTs <= 1704067300000) {
            notablesMap.set(exNf.id, { ...exNf, deleted: true, updatedAt: 1743850000000 });
          } else {
            notablesMap.set(exNf.id, exNf);
          }
        }
        if (Array.isArray(processedNotableFigures)) {
          const incIds = new Set(processedNotableFigures.map((x: any) => x?.id).filter(Boolean));
          for (const incNf of processedNotableFigures) {
            if (!incNf || !incNf.id) continue;
            const incTs = normalizeServerTimestamp(incNf.updatedAt || incNf.createdAt);
            if (SERVER_LEGACY_REMOVED_NOTABLE_IDS.has(incNf.id) && incTs <= 1704067300000) {
              notablesMap.set(incNf.id, { ...incNf, deleted: true, updatedAt: 1743850000000 });
              continue;
            }
            const prev = notablesMap.get(incNf.id);
            const prevTs = normalizeServerTimestamp(prev?.updatedAt || prev?.createdAt);
            if (!prev || incTs >= prevTs) {
              notablesMap.set(incNf.id, {
                ...(prev || {}),
                ...incNf,
                deleted: incNf.deleted === true,
                updatedAt: Math.max(prevTs, incTs) || finalUpdatedAt
              });
            }
          }
          for (const [id, cur] of notablesMap.entries()) {
            if (!incIds.has(id) && !cur.deleted) {
              notablesMap.set(id, { ...cur, deleted: true, updatedAt: finalUpdatedAt });
            }
          }
        }
        const mergedNotableFigures = Array.from(notablesMap.values());

        const candidateWithoutTs = {
          members: mergedMembers,
          photos: mergedPhotos,
          over: mergedOver,
          removed: Array.from(rawRemovedSet),
          archivalPhotos: (processedArchivalPhotos && processedArchivalPhotos.length > 0)
            ? processedArchivalPhotos
            : (existingData?.archivalPhotos || []),
          notableFigures: mergedNotableFigures,
          spouses: state?.spouses
            ? { ...(existingData?.spouses || {}), ...state.spouses }
            : (existingData?.spouses || {}),
          mothers: state?.mothers
            ? { ...(existingData?.mothers || {}), ...state.mothers }
            : (existingData?.mothers || {}),
          contactInfo: state?.contactInfo ? state.contactInfo : (existingData?.contactInfo || {})
        };

        const existingWithoutTs = {
          members: existingData?.members || [],
          photos: existingData?.photos || {},
          over: existingData?.over || {},
          removed: existingData?.removed || [],
          archivalPhotos: existingData?.archivalPhotos || [],
          notableFigures: existingData?.notableFigures || [],
          spouses: existingData?.spouses || {},
          mothers: existingData?.mothers || {},
          contactInfo: existingData?.contactInfo || {}
        };

        const dataBodyChanged =
          filesWrittenSet.size > 0 ||
          JSON.stringify(candidateWithoutTs) !== JSON.stringify(existingWithoutTs);

        const resolvedUpdatedAt = dataBodyChanged ? finalUpdatedAt : (existingData?.updatedAt || finalUpdatedAt);

        const updatedData = {
          ...candidateWithoutTs,
          updatedAt: resolvedUpdatedAt
        };

        if (parsed.familyData) {
          parsed.familyData = updatedData;
        } else {
          Object.assign(parsed, updatedData);
        }

        syncedFamilyData = updatedData;
        const nextSerialized = JSON.stringify(parsed, null, 2);
        if (writeFileIfChanged(p, nextSerialized)) {
          filesWrittenSet.add(p);
        }
      }
    }

    const manifestWritten = updateAvatarsManifest(
      Object.keys(updatedManifestUrls).length > 0 ? updatedManifestUrls : undefined
    );
    manifestWritten.forEach((f) => filesWrittenSet.add(f));

    return {
      syncedFamilyData,
      updatedAt: syncedFamilyData?.updatedAt || finalUpdatedAt,
      filesWritten: Array.from(filesWrittenSet)
    };
  }

  // Direct Disk Write Bridge: /api/save-tree and /__save_tree_to_disk
  const handleSaveTreeEndpoint = (req: express.Request, res: express.Response) => {
    try {
      const state = req.body;
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'Invalid tree state' });
      }
      const { syncedFamilyData, updatedAt, filesWritten } = persistStateToTargetJsonFiles(state);
      if (syncedFamilyData && filesWritten.length > 0) {
        syncToFirestoreFromServer(syncedFamilyData).catch(() => {});
      }
      const effectiveFilesWritten =
        filesWritten.length > 0
          ? filesWritten
          : (state.isPublishAction && sessionFilesWritten.size > 0 ? Array.from(sessionFilesWritten) : []);
      return res.json({
        success: true,
        updatedAt,
        filesWritten: effectiveFilesWritten,
        membersCount: syncedFamilyData?.members?.length || 0,
        photosCount: Object.keys(syncedFamilyData?.photos || {}).length,
        photos: syncedFamilyData?.photos || {}
      });
    } catch (err: any) {
      console.error('Error in /api/save-tree:', err);
      return res.status(500).json({ error: err.message || 'Failed to save tree to disk' });
    }
  };

  app.post('/api/save-tree', handleSaveTreeEndpoint);
  app.post('/__save_tree_to_disk', handleSaveTreeEndpoint);
  app.post('/api/save-family-data', handleSaveTreeEndpoint);

  // Real-time Server-Side Firestore Listener (syncs metadata without running any git commands)
  if (serverDb) {
    try {
      onSnapshot(
        doc(serverDb, 'family_tree', 'state'),
        (snap) => {
          if (!snap.exists()) return;
          const cloudState = snap.data();
          if (!cloudState || typeof cloudState !== 'object') return;
          const cloudTs = normalizeServerTimestamp(cloudState.updatedAt);
          if (cloudTs > 0 && cloudTs === lastServerFirestoreWriteAt) {
            return; // Ignore our own server echo
          }
          try {
            const treeDataPath = path.resolve(__dirname, 'src/data/initialTreeData.json');
            if (fs.existsSync(treeDataPath)) {
              const raw = JSON.parse(fs.readFileSync(treeDataPath, 'utf-8'));
              const localFd = raw.familyData || raw;
              const localTs = normalizeServerTimestamp(localFd?.updatedAt);
              if (cloudTs > localTs) {
                persistStateToTargetJsonFiles(cloudState);
              }
            }
          } catch (e) {
            console.warn('Server Firestore mirror notice:', e);
          }
        },
        () => {}
      );
    } catch {
      // Ignore listener setup errors
    }
  }

  // 3. API: Fetch family data from source file (always fresh, never cached)
  app.get('/api/family-data', (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const treeDataPath = path.resolve(__dirname, 'src/data/initialTreeData.json');
      if (fs.existsSync(treeDataPath)) {
        const raw = fs.readFileSync(treeDataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json(parsed.familyData || null);
      }
      return res.status(404).json({ error: 'Tree data file not found' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. API: List all available avatars from public/avatars/
  app.get('/api/available-avatars', (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      if (fs.existsSync(avatarsDir)) {
        const files = fs.readdirSync(avatarsDir)
          .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .sort((a, b) => a.localeCompare(b));
        const images = files.map((filename) => ({
          filename,
          url: `/avatars/${filename}`
        }));
        return res.json(images);
      }
      return res.json([]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. API: Return the list of files actually changed on disk (executes NO git commands)
  app.post('/api/publish-to-github', (req, res) => {
    try {
      let currentWritten: string[] = [];
      if (req.body && typeof req.body === 'object' && (req.body.familyData || req.body.members)) {
        const result = persistStateToTargetJsonFiles(req.body);
        currentWritten = result.filesWritten;
      }
      const allChangedFiles = Array.from(new Set([...sessionFilesWritten, ...currentWritten]));
      return res.json({
        success: true,
        filesWritten: allChangedFiles
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, filesWritten: [] });
    }
  });

  // Static avatars with instant 200 OK SVG fallback if the avatar file does not exist on disk
  const FALLBACK_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ecfdf5" />
        <stop offset="100%" stop-color="#d1fae5" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#bg)" stroke="#6ee7b7" stroke-width="2" />
    <circle cx="60" cy="44" r="18" fill="#065f46" fill-opacity="0.16" />
    <path d="M28 104 C28 80 92 80 92 104" fill="#065f46" fill-opacity="0.16" />
  </svg>`;

  app.use('/avatars', (req, res, next) => {
    try {
      const cleanRel = decodeURIComponent(req.path.replace(/^\//, ''));
      const fullPath = path.join(avatarsDir, cleanRel);
      if (!fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(200).send(FALLBACK_AVATAR_SVG);
      }
    } catch {}
    next();
  }, express.static(avatarsDir));

  // Development vs Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
