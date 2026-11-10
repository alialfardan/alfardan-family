import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, setLogLevel } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize server-side Firestore client so backend API saves also guarantee instant Firestore sync
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
    const compactPhotos: Record<string, string> = {};
    let totalPhotoBytes = 0;
    for (const [k, v] of Object.entries(familyData.photos || {})) {
      if (v === '') {
        compactPhotos[k] = '';
        continue;
      }
      if (isValidServerPhotoEntry(k, v) && v.length < 90000) {
        const cleanVal = v.trim();
        if (totalPhotoBytes + cleanVal.length < 600000) {
          compactPhotos[k] = cleanVal;
          totalPhotoBytes += cleanVal.length;
        }
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
      archivalPhotos: familyData.archivalPhotos || [],
      notableFigures: familyData.notableFigures || [],
      contactInfo: familyData.contactInfo || {},
      updatedAt: safeUpdatedAt
    });
    await setDoc(doc(serverDb, 'family_tree', 'state'), payload, { merge: true });

    if (Array.isArray(familyData.notableFigures)) {
      for (const nf of familyData.notableFigures) {
        if (nf && nf.id) {
          setDoc(
            doc(serverDb, 'notable_figures', nf.id),
            sanitizeForFirestore({
              ...nf,
              deleted: nf.deleted === true,
              updatedAt: nf.updatedAt || safeUpdatedAt
            }),
            { merge: true }
          ).catch(() => {});
        }
      }
    }
    for (const legacyId of SERVER_LEGACY_REMOVED_NOTABLE_IDS) {
      setDoc(
        doc(serverDb, 'notable_figures', legacyId),
        { id: legacyId, deleted: true, updatedAt: 1743850000000 },
        { merge: true }
      ).catch(() => {});
    }
  } catch {
    // Silent fallback if quota is temporarily reached
  }
}

const GITHUB_TOKEN_FILE = path.resolve(__dirname, '.github_token');

function getGitHubToken(): string {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    if (fs.existsSync(GITHUB_TOKEN_FILE)) {
      const t = fs.readFileSync(GITHUB_TOKEN_FILE, 'utf-8').trim();
      if (t) return t;
    }
  } catch {}
  return '';
}

function getGitHubRemoteUrl(): string {
  const token = getGitHubToken();
  if (token) {
    return `https://${encodeURIComponent(token)}@github.com/alialfardan/alfardan-family.git`;
  }
  return 'https://github.com/alialfardan/alfardan-family.git';
}

// Mutex & Debounce queue to serialize GitHub push operations when a custom token is configured
let isGitSyncRunning = false;
let pendingGitSyncMsg: string | null = null;
let gitSyncDebounceTimer: NodeJS.Timeout | null = null;

function scheduleAutoGitSync(msg: string, delayMs = 1500): void {
  if (!getGitHubToken()) {
    // Leave files modified in working tree so AI Studio's built-in GitHub sync detects them immediately!
    return;
  }
  pendingGitSyncMsg = msg;
  if (gitSyncDebounceTimer) {
    clearTimeout(gitSyncDebounceTimer);
  }
  gitSyncDebounceTimer = setTimeout(() => {
    executeNextGitSync().catch(() => {});
  }, delayMs);
}

async function executeNextGitSync(): Promise<string> {
  if (isGitSyncRunning) {
    return 'sync_in_progress_queued';
  }
  const token = getGitHubToken();
  if (!token) {
    pendingGitSyncMsg = null;
    return 'NO_TOKEN_CONFIGURED';
  }
  if (!pendingGitSyncMsg) {
    return 'idle';
  }

  isGitSyncRunning = true;
  const msg = pendingGitSyncMsg;
  pendingGitSyncMsg = null;

  try {
    const remote = getGitHubRemoteUrl();
    const pushCmd = `git push --force "${remote}" main:main || true
git push --force "${remote}" main:master || true`;

    const script = `git config --global --add safe.directory '*' 2>/dev/null || true
if [ ! -d .git ]; then
  git init -b main
  git config user.name "alialfardan"
  git config user.email "alfardan.family.bh@gmail.com"
  git remote add origin "${remote}" 2>/dev/null || git remote set-url origin "${remote}"
else
  git config user.name "alialfardan" 2>/dev/null || true
  git config user.email "alfardan.family.bh@gmail.com" 2>/dev/null || true
  git remote set-url origin "${remote}" 2>/dev/null || git remote add origin "${remote}" 2>/dev/null || true
fi
git add -A
git commit -m "${msg.replace(/"/g, '\\"')}" 2>/dev/null || true
${pushCmd}`;

    const result = await new Promise<string>((resolve) => {
      exec(script, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err && !err.message.includes('nothing to commit')) {
          console.warn('Git sync notice:', err.message, stderr);
          resolve(stdout || stderr || err.message);
        } else {
          resolve(stdout || 'success');
        }
      });
    });

    return result;
  } catch (err: any) {
    console.warn('Auto-git sync execution error:', err?.message || err);
    return 'error';
  } finally {
    isGitSyncRunning = false;
    if (pendingGitSyncMsg) {
      setTimeout(() => {
        executeNextGitSync().catch(() => {});
      }, 1500);
    }
  }
}

function autoGitCommitAndPush(msg: string): Promise<string> {
  scheduleAutoGitSync(msg, 1500);
  return Promise.resolve('scheduled');
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

  // Body parser with 50MB limit for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS so alfardanfamily.com can fetch live real-time updates and avatars from AI Studio
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

  function removeAvatarFileFromDiskServer(key: string): void {
    const cleanKey = String(key || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanKey || !fs.existsSync(avatarsDir)) return;
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const filePath = path.join(avatarsDir, `${cleanKey}.${ext}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
  }

  // Helper to extract any Base64 image to public/avatars/[key].jpg and return its clean /avatars/[key].jpg?v=[timestamp] path
  function savePhotoToAvatarsDirAndGetCleanPath(key: string, val: string, vStamp: number): string | null {
    if (!key || !val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (!trimmed) return null;
    const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanKey) return null;

    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    if (trimmed.startsWith('data:image/')) {
      const m = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
      const rawBase64 = m ? m[1] : trimmed.split(',')[1];
      if (rawBase64) {
        const filename = `${cleanKey}.jpg`;
        const fullAvatarPath = path.join(avatarsDir, filename);
        fs.writeFileSync(fullAvatarPath, Buffer.from(rawBase64, 'base64'));
        return `/avatars/${filename}?v=${vStamp}`;
      }
      return null;
    }

    if (trimmed.startsWith('/avatars/')) {
      const cleanFile = trimmed.split('?')[0].replace(/^\/avatars\//, '');
      const sourcePath = path.join(avatarsDir, cleanFile);
      const targetFilename = `${cleanKey}.jpg`;
      const targetPath = path.join(avatarsDir, targetFilename);

      // If another avatar file was selected from the gallery for this person, copy it to public/avatars/[cleanKey].jpg
      if (cleanFile !== targetFilename && fs.existsSync(sourcePath)) {
        try {
          fs.copyFileSync(sourcePath, targetPath);
          return `/avatars/${targetFilename}?v=${vStamp}`;
        } catch {}
      }

      return trimmed.includes('?v=') ? trimmed : `/avatars/${cleanFile}?v=${vStamp}`;
    }

    return trimmed;
  }

  function updateAvatarsManifest(vStamp: number): void {
    try {
      if (!fs.existsSync(avatarsDir)) return;
      const files = fs.readdirSync(avatarsDir)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const manifest = files.map((filename) => ({
        filename,
        url: `/avatars/${filename}?v=${vStamp}`,
      }));
      const manifestPath = path.resolve(__dirname, 'public/avatars-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  // 1. API: Upload Avatar — saves file directly to public/avatars/[key].jpg and records /avatars/[key].jpg?v=[timestamp] in JSON files
  app.post('/api/upload-avatar', (req, res) => {
    try {
      const { key, dataUrl } = req.body;
      if (!key || !dataUrl) {
        return res.status(400).json({ error: 'Missing key or dataUrl' });
      }

      const vStamp = getServerSafeTimestamp();
      const cleanAvatarPath = savePhotoToAvatarsDirAndGetCleanPath(key, dataUrl, vStamp);
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
            if (key.startsWith('arch_') || key.startsWith('photo_')) {
              if (Array.isArray(targetObj.archivalPhotos)) {
                targetObj.archivalPhotos = targetObj.archivalPhotos.map((ap: any) =>
                  ap && ap.id === key ? { ...ap, url: cleanAvatarPath } : ap
                );
              }
            } else {
              if (!targetObj.photos) targetObj.photos = {};
              targetObj.photos[key] = cleanAvatarPath;
            }
            targetObj.updatedAt = getServerSafeTimestamp(vStamp, targetObj.updatedAt);
            latestFamilyData = targetObj;
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch (e) {
            console.error(`Error updating ${p}:`, e);
          }
        }
      }

      updateAvatarsManifest(vStamp);

      if (latestFamilyData) {
        syncToFirestoreFromServer(latestFamilyData).catch(() => {});
      }

      autoGitCommitAndPush(`feat(media): auto-update image ${key} in public/avatars and publish`).catch(() => {});

      return res.json({ success: true, url: cleanAvatarPath });
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
      removeAvatarFileFromDiskServer(key);

      let latestFamilyData: any = null;
      for (const p of TARGET_JSON_FILES) {
        const fullPath = path.resolve(__dirname, p);
        if (fs.existsSync(fullPath)) {
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const targetObj = parsed.familyData ? parsed.familyData : parsed;
            if (targetObj.photos && typeof targetObj.photos === 'object') {
              delete targetObj.photos[key];
            }
            targetObj.updatedAt = getServerSafeTimestamp(vStamp, targetObj.updatedAt);
            latestFamilyData = targetObj;
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch (e) {
            console.error(`Error deleting avatar in ${p}:`, e);
          }
        }
      }

      updateAvatarsManifest(vStamp);

      if (latestFamilyData) {
        syncToFirestoreFromServer({
          ...latestFamilyData,
          photos: { ...(latestFamilyData.photos || {}), [key]: '' }
        }).catch(() => {});
      }

      autoGitCommitAndPush(`feat(media): delete image ${key} from public/avatars and JSON files`).catch(() => {});

      return res.json({ success: true, deletedKey: key, updatedAt: vStamp });
    } catch (err: any) {
      console.error('Error in /api/delete-avatar:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete avatar' });
    }
  });

  // Helper to apply and persist incoming state across all 3 JSON files (initialTreeData.json, initialTreeData.backup.json, fardan_family_tree_backup.json)
  function persistStateToTargetJsonFiles(rawPayload: any): { syncedFamilyData: any; updatedAt: number } {
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

    const processedArchivalPhotos = Array.isArray(state?.archivalPhotos)
      ? state.archivalPhotos.map((ap: any) => {
          if (ap && ap.id && typeof ap.url === 'string' && ap.url.startsWith('data:image/')) {
            const cleanUrl = savePhotoToAvatarsDirAndGetCleanPath(ap.id, ap.url, vStamp);
            if (cleanUrl) return { ...ap, url: cleanUrl };
          }
          return ap;
        })
      : null;

    const processedNotableFigures = Array.isArray(state?.notableFigures)
      ? state.notableFigures.map((nf: any) => {
          if (!nf || !nf.id) return nf;
          let updatedPhoto = nf.photo;
          if (typeof updatedPhoto === 'string' && updatedPhoto.startsWith('data:image/')) {
            updatedPhoto = savePhotoToAvatarsDirAndGetCleanPath(nf.id, updatedPhoto, vStamp) || updatedPhoto;
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

        for (const delKey of explicitlyDeletedPhotoKeys) {
          removeAvatarFileFromDiskServer(delKey);
        }

        const mergedMembers = deduplicateServerMembers(
          [
            ...(existingData?.members || []),
            ...(state?.members || [])
          ],
          true
        );

        // Strictly preserve all existing valid photos as /avatars/[id].jpg?v=[timestamp], extract any incoming Base64 to public/avatars/, and only delete explicitly removed photos
        const mergedPhotos: Record<string, string> = {};
        for (const [ek, ev] of Object.entries(existingData?.photos || {})) {
          if (explicitlyDeletedPhotoKeys.has(ek)) {
            delete mergedPhotos[ek];
            continue;
          }
          if (isValidServerPhotoEntry(ek, ev)) {
            const cleanPath = savePhotoToAvatarsDirAndGetCleanPath(ek, ev, finalUpdatedAt);
            if (cleanPath) mergedPhotos[ek] = cleanPath;
          }
        }
        for (const [pk, pv] of Object.entries(incomingPhotos)) {
          if (explicitlyDeletedPhotoKeys.has(pk) || pv === '' || pv === null) {
            delete mergedPhotos[pk];
            continue;
          }
          if (isValidServerPhotoEntry(pk, pv)) {
            const cleanPath = savePhotoToAvatarsDirAndGetCleanPath(pk, pv, finalUpdatedAt);
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

        // Merge overrides authoritatively from incoming state
        const allOverKeys = new Set([
          ...Object.keys(existingData?.over || {}),
          ...Object.keys(state?.over || {})
        ]);
        const mergedOver: Record<string, any> = {};
        for (const k of allOverKeys) {
          const bOv = existingData?.over?.[k] || {};
          const iOv = state?.over?.[k] || {};
          const bAt = normalizeServerTimestamp(bOv.at) || baseTime;
          const iAt = normalizeServerTimestamp(iOv.at) || incTime;
          const useInc = k in (state?.over || {});
          mergedOver[k] = useInc
            ? { ...bOv, ...iOv, at: Math.max(bAt, iAt, finalUpdatedAt) || undefined }
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

        const updatedData = {
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
          contactInfo: state?.contactInfo ? state.contactInfo : (existingData?.contactInfo || {}),
          updatedAt: finalUpdatedAt
        };

        if (parsed.familyData) {
          parsed.familyData = updatedData;
        } else {
          Object.assign(parsed, updatedData);
        }

        syncedFamilyData = updatedData;
        fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    }

    updateAvatarsManifest(finalUpdatedAt);
    return { syncedFamilyData, updatedAt: finalUpdatedAt };
  }

  // Direct Disk Write Bridge: /api/save-tree and /__save_tree_to_disk
  const handleSaveTreeEndpoint = (req: express.Request, res: express.Response) => {
    try {
      const state = req.body;
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'Invalid tree state' });
      }
      const { syncedFamilyData, updatedAt } = persistStateToTargetJsonFiles(state);
      if (syncedFamilyData) {
        syncToFirestoreFromServer(syncedFamilyData).catch(() => {});
      }
      autoGitCommitAndPush('feat(tree): direct disk save to initialTreeData.json and fardan_family_tree_backup.json').catch(() => {});
      return res.json({
        success: true,
        updatedAt,
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

  // 2. API: Save full family state to source files, sync to Firestore, and push to GitHub immediately
  app.post('/api/save-family-data', handleSaveTreeEndpoint);

  // Real-time Server-Side Firestore Listener
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
                autoGitCommitAndPush('feat(cloud-sync): auto-commit admin updates from Firestore to GitHub').catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Server Firestore mirror notice:', e);
          }
        },
        () => {}
      );

      // Also listen to family_tree/custom_avatars so any photo uploaded on alfardanfamily.com or another device
      // is automatically extracted to public/avatars/[key].jpg on Google AI Studio's disk and recorded in initialTreeData.json!
      onSnapshot(
        doc(serverDb, 'family_tree', 'custom_avatars'),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (!data || typeof data.avatars !== 'object') return;
          const avatarsMap = data.avatars as Record<string, string>;
          const vStamp = normalizeServerTimestamp(data.updatedAt) || Date.now();
          let anyExtracted = false;
          const extractedPhotos: Record<string, string> = {};

          for (const [key, val] of Object.entries(avatarsMap)) {
            if (typeof val === 'string' && val.startsWith('data:image/')) {
              const cleanPath = savePhotoToAvatarsDirAndGetCleanPath(key, val, vStamp);
              if (cleanPath) {
                extractedPhotos[key] = cleanPath;
                anyExtracted = true;
              }
            }
          }

          if (anyExtracted) {
            try {
              persistStateToTargetJsonFiles({
                photos: extractedPhotos,
                updatedAt: vStamp
              });
            } catch {}
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

  // 5. API: Direct Admin Sync & Publish to GitHub (deploying directly to alfardanfamily.com)
  app.post('/api/publish-to-github', async (req, res) => {
    try {
      const { token } = req.body || {};
      if (token && typeof token === 'string' && token.trim()) {
        fs.writeFileSync(GITHUB_TOKEN_FILE, token.trim(), 'utf-8');
      }
      pendingGitSyncMsg = 'feat(publish): manual admin publish to alfardanfamily.com';
      if (gitSyncDebounceTimer) clearTimeout(gitSyncDebounceTimer);
      const stdout = await executeNextGitSync();
      const hasToken = !!getGitHubToken();
      const isPushed = hasToken && !stdout.includes('fatal:') && !stdout.includes('error:') && !stdout.includes('NO_TOKEN_CONFIGURED');
      return res.json({
        success: true,
        isPushed,
        hasToken,
        message: isPushed
          ? 'تم اعتماد ونشر كافة التعديلات والصور إلى GitHub بنجاح! يتم الآن بناء ونشر الموقع الرسمي alfardanfamily.com تلقائياً 🚀'
          : (hasToken
              ? 'تم الحفظ والالتزام محلياً، ولكن تعذر الدفع لـ GitHub. يرجى مراجعة صلاحيات الرمز (PAT repo scope)'
              : 'تم حفظ كافة التعديلات والصور محلياً في ملفات المشروع و public/avatars/ بنجاح. يمكنك الآن الضغط على أداة GitHub بأعلى AI Studio لعمل Commit & Push.'),
        stdout
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Get GitHub sync status
  app.get('/api/github-sync-status', (_req, res) => {
    try {
      const hasToken = !!getGitHubToken();
      exec('git log origin/main..HEAD --oneline', { cwd: __dirname }, (err, stdout) => {
        const unpushedCount = (!err && stdout && stdout.trim()) ? stdout.trim().split('\n').length : 0;
        return res.json({
          hasToken,
          unpushedCount,
          isConfigured: true,
          repository: 'alialfardan/alfardan-family'
        });
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // API: Save GitHub Token and immediately push
  app.post('/api/save-github-token', async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ error: 'Token is required' });
      }
      fs.writeFileSync(GITHUB_TOKEN_FILE, token.trim(), 'utf-8');
      pendingGitSyncMsg = 'feat(sync): publish updates to alfardanfamily.com via GitHub Token';
      if (gitSyncDebounceTimer) clearTimeout(gitSyncDebounceTimer);
      const stdout = await executeNextGitSync();
      const success = !stdout.includes('fatal:') && !stdout.includes('error:') && !stdout.includes('NO_TOKEN_CONFIGURED');
      return res.json({
        success,
        output: stdout,
        message: success
          ? 'تم حفظ الرمز ونشر التعديلات إلى GitHub بنجاح! ستظهر التحديثات على alfardanfamily.com خلال دقائق معدودة 🚀'
          : 'تم حفظ الرمز، ولكن واجه GitHub مشكلة في صلاحية الرمز. يرجى التأكد من أن الرمز يحمل صلاحية (repo scope)'
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
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
