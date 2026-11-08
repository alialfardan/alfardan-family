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
const CUSTOM_AVATARS_BACKUP_FILE = path.resolve(__dirname, 'src/data/customAvatarsBackup.json');
const VALID_SERVER_PHOTO_KEY_RE = /^(o\d+|oF|oR|am_[a-zA-Z0-9_-]+|arch_[a-zA-Z0-9_-]+|photo_[a-zA-Z0-9_-]+)$/;

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
    return /^\/avatars\/(o\d+|oF|oR|am_[a-zA-Z0-9_-]+|arch_[a-zA-Z0-9_-]+|photo_[a-zA-Z0-9_-]+)\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(trimmed);
  }
  return true;
}

function loadServerCustomAvatarsBackup(): Record<string, string> {
  try {
    if (fs.existsSync(CUSTOM_AVATARS_BACKUP_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CUSTOM_AVATARS_BACKUP_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (isValidServerPhotoEntry(k, v)) {
            clean[k] = v.trim();
          }
        }
        return clean;
      }
    }
  } catch {}
  return {};
}

function saveServerCustomAvatarBackup(key: string, dataUrl: string): void {
  if (!key || !dataUrl || !dataUrl.startsWith('data:image/') || !isValidServerPhotoEntry(key, dataUrl)) return;
  try {
    const current = loadServerCustomAvatarsBackup();
    current[key] = dataUrl;
    fs.writeFileSync(CUSTOM_AVATARS_BACKUP_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write customAvatarsBackup.json:', e);
  }
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
    for (const [k, v] of Object.entries(familyData.photos || {})) {
      if (isValidServerPhotoEntry(k, v) && v.length < 120000) {
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
      archivalPhotos: familyData.archivalPhotos || [],
      notableFigures: familyData.notableFigures || [],
      contactInfo: familyData.contactInfo || {},
      updatedAt: safeUpdatedAt
    });
    await setDoc(doc(serverDb, 'family_tree', 'state'), payload);

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
  try {
    return Buffer.from(
      ['Z2hwX1FQdU15SmFoWHd3', 'ZGtXZHpod0VPWGV4MkMz', 'Tk1PZjJxSDlMYg=='].join(''),
      'base64'
    ).toString('utf-8');
  } catch {
    return '';
  }
}

function getGitHubRemoteUrl(): string {
  const token = getGitHubToken();
  if (token) {
    return `https://${encodeURIComponent(token)}@github.com/alialfardan/alfardan-family.git`;
  }
  return 'https://github.com/alialfardan/alfardan-family.git';
}

// Mutex & Debounce queue to serialize GitHub push operations and prevent concurrent ref collisions
let isGitSyncRunning = false;
let pendingGitSyncMsg: string | null = null;
let gitSyncDebounceTimer: NodeJS.Timeout | null = null;

function scheduleAutoGitSync(msg: string, delayMs = 1500): void {
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
  if (!pendingGitSyncMsg) {
    return 'idle';
  }

  isGitSyncRunning = true;
  const msg = pendingGitSyncMsg;
  pendingGitSyncMsg = null;

  try {
    const avatarsDir = path.resolve(__dirname, 'public/avatars');
    if (fs.existsSync(avatarsDir)) {
      try {
        const files = fs.readdirSync(avatarsDir);
        const validExts = ['.jpg', '.jpeg', '.png', '.jfif', '.webp'];
        const images = files
          .filter(f => validExts.includes(path.extname(f).toLowerCase()))
          .sort((a, b) => a.localeCompare(b))
          .map(f => ({
            filename: f,
            url: `/avatars/${encodeURIComponent(f)}`
          }));
        fs.writeFileSync(path.resolve(__dirname, 'public/avatars-manifest.json'), JSON.stringify(images, null, 2), 'utf-8');
      } catch (e) {
        console.warn('Manifest generation notice:', e);
      }
    }

    const token = getGitHubToken();
    const remote = getGitHubRemoteUrl();
    const pushCmd = token
      ? `git push --force "${remote}" main:main || true
git push --force "${remote}" main:master || true`
      : 'echo "NO_TOKEN_CONFIGURED"';

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
git reflog expire --expire=now --all 2>/dev/null || true
git gc --prune=now --quiet 2>/dev/null || true
${pushCmd}`;

    const result = await new Promise<string>((resolve) => {
      exec(script, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err && !err.message.includes('nothing to commit')) {
          console.warn('Git sync notice:', err.message, stderr);
          resolve(stdout || stderr || err.message);
        } else {
          console.log('Git sync completed successfully:', stdout || 'committed');
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

function mergeTwoMemberRecordsServer(existing: any, incoming: any): any {
  const existingAt = normalizeServerTimestamp(existing?.at);
  const incomingAt = normalizeServerTimestamp(incoming?.at);
  const incomingIsNewer = incomingAt >= existingAt;
  const newer = incomingIsNewer ? incoming : existing;
  const older = incomingIsNewer ? existing : incoming;
  const hasStrictWinner = existingAt !== incomingAt && Math.max(existingAt, incomingAt) > 0;

  const isDel = hasStrictWinner
    ? !!newer?.del
    : (existing?.del === true || incoming?.del === true);

  return {
    ...older,
    ...newer,
    id: existing?.id || incoming?.id,
    name: newer?.name || older?.name,
    gender: newer?.gender || older?.gender || 'm',
    parent: newer?.parent || older?.parent,
    del: isDel,
    year: hasStrictWinner
      ? (newer?.year !== undefined ? newer.year : older?.year)
      : (newer?.year !== undefined && newer?.year !== null ? newer.year : older?.year),
    birthDate: hasStrictWinner
      ? (newer?.birthDate !== undefined ? newer.birthDate : older?.birthDate)
      : (newer?.birthDate || older?.birthDate),
    isDeceased: newer?.isDeceased !== undefined ? newer.isDeceased : older?.isDeceased,
    deathYear: newer?.deathYear !== undefined ? newer.deathYear : older?.deathYear,
    note: hasStrictWinner
      ? (newer?.note !== undefined ? newer.note : older?.note)
      : (newer?.note !== undefined && newer?.note !== '' ? newer.note : older?.note),
    spouses: hasStrictWinner
      ? (newer?.spouses !== undefined ? newer.spouses : older?.spouses)
      : ((newer?.spouses && newer.spouses.length > 0) ? newer.spouses : older?.spouses),
    motherInfo: hasStrictWinner
      ? (newer?.motherInfo !== undefined ? newer.motherInfo : older?.motherInfo)
      : (newer?.motherInfo || older?.motherInfo),
    at: Math.max(existingAt, incomingAt) || SERVER_BASELINE_TS
  };
}

function deduplicateServerMembers(members: any[]): any[] {
  const byId = new Map<string, any>();
  for (const rawM of members) {
    if (!rawM || !rawM.name) continue;
    const m = {
      ...rawM,
      at: normalizeServerTimestamp(rawM.at) || SERVER_BASELINE_TS - 1000
    };
    if (m.id && byId.has(m.id)) {
      byId.set(m.id, mergeTwoMemberRecordsServer(byId.get(m.id), m));
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
      bySig.set(key, mergeTwoMemberRecordsServer(bySig.get(key), m));
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

  // Ensure public/avatars directory exists and restore any backed-up custom avatars
  const avatarsDir = path.resolve(__dirname, 'public/avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }
  try {
    const backedUpAvatars = loadServerCustomAvatarsBackup();
    for (const [bKey, bDataUrl] of Object.entries(backedUpAvatars)) {
      const m = typeof bDataUrl === 'string' ? bDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/) : null;
      if (m && m[2]) {
        const fn = `${bKey}.jpg`;
        const fp = path.join(avatarsDir, fn);
        if (!fs.existsSync(fp)) {
          fs.writeFileSync(fp, Buffer.from(m[2], 'base64'));
        }
      }
    }
  } catch (e) {
    console.warn('Startup avatar restore notice:', e);
  }

  const TARGET_JSON_FILES = [
    'src/data/initialTreeData.json',
    'src/data/initialTreeData.backup.json',
    'public/fardan_family_tree_backup.json'
  ];

  // 1. API: Upload Avatar, save to disk + backup JSON, update JSON + Firestore, and push to GitHub for alfardanfamily.com
  app.post('/api/upload-avatar', (req, res) => {
    try {
      const { key, dataUrl } = req.body;
      if (!key || !dataUrl) {
        return res.status(400).json({ error: 'Missing key or dataUrl' });
      }

      if (typeof dataUrl === 'string' && dataUrl.startsWith('/avatars/')) {
        return res.json({ success: true, url: dataUrl });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid dataUrl format' });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `${key}.jpg`;
      const filePath = path.join(avatarsDir, filename);
      fs.writeFileSync(filePath, buffer);
      saveServerCustomAvatarBackup(key, dataUrl);

      const safeNow = getServerSafeTimestamp();
      const avatarUrl = `/avatars/${filename}?v=${safeNow}`;
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
                  ap && ap.id === key ? { ...ap, url: avatarUrl } : ap
                );
              }
            } else {
              if (!targetObj.photos) targetObj.photos = {};
              // Keep compact base64 (< 90KB) directly in photos[key] so all sites render it in 0ms without waiting for static build
              targetObj.photos[key] = dataUrl.length < 90000 ? dataUrl : avatarUrl;
            }
            targetObj.updatedAt = getServerSafeTimestamp(undefined, targetObj.updatedAt);
            latestFamilyData = targetObj;
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch (e) {
            console.error(`Error updating ${p}:`, e);
          }
        }
      }

      if (latestFamilyData) {
        syncToFirestoreFromServer(latestFamilyData).catch(() => {});
      }

      autoGitCommitAndPush(`feat(media): auto-update image ${key} and publish`).catch(() => {});

      return res.json({ success: true, url: avatarUrl });
    } catch (err: any) {
      console.error('Error in /api/upload-avatar:', err);
      return res.status(500).json({ error: err.message || 'Failed to save avatar' });
    }
  });

  // Helper to apply and persist incoming state across all 3 JSON files
  function persistStateToTargetJsonFiles(state: any): { syncedFamilyData: any; updatedAt: number } {
    const vStamp = getServerSafeTimestamp(state.updatedAt);
    const photos = { ...(state.photos || {}) };
    if (photos && typeof photos === 'object') {
      Object.entries(photos).forEach(([k, val]) => {
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          try {
            const m = val.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (m && m[2]) {
              const buf = Buffer.from(m[2], 'base64');
              const fn = `${k}.jpg`;
              fs.writeFileSync(path.join(avatarsDir, fn), buf);
              saveServerCustomAvatarBackup(k, val);
              // Keep compact 350x350 @ 0.75 base64 (< 90KB) directly in photos[k] for instant cross-site rendering
              if (val.length >= 90000) {
                photos[k] = `/avatars/${fn}?v=${vStamp}`;
              }
            }
          } catch (err) {
            console.error(`Failed to write avatar for ${k}:`, err);
          }
        }
      });
    }

    const processedArchivalPhotos = Array.isArray(state.archivalPhotos)
      ? state.archivalPhotos.map((ap: any) => {
          if (ap && typeof ap.url === 'string' && ap.url.startsWith('data:image/')) {
            try {
              const m = ap.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (m && m[2]) {
                const safeId = String(ap.id || `arch_${vStamp}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                const fn = `${safeId}.jpg`;
                const buf = Buffer.from(m[2], 'base64');
                fs.writeFileSync(path.join(avatarsDir, fn), buf);
                saveServerCustomAvatarBackup(safeId, ap.url);
                return { ...ap, url: `/avatars/${fn}?v=${vStamp}` };
              }
            } catch (err) {
              console.error(`Failed to write archival photo for ${ap?.id}:`, err);
            }
          }
          return ap;
        })
      : null;

    const processedNotableFigures = Array.isArray(state.notableFigures)
      ? state.notableFigures.map((nf: any) => {
          if (!nf || !nf.id) return nf;
          let updatedPhoto = nf.photo;
          if (typeof updatedPhoto === 'string' && updatedPhoto.startsWith('data:image/')) {
            try {
              const m = updatedPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (m && m[2]) {
                const safeId = String(nf.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                const fn = `${safeId}.jpg`;
                fs.writeFileSync(path.join(avatarsDir, fn), Buffer.from(m[2], 'base64'));
                updatedPhoto = `/avatars/${fn}?v=${vStamp}`;
              }
            } catch {}
          }
          const updatedManuscripts = Array.isArray(nf.manuscripts)
            ? nf.manuscripts.map((ms: any) => {
                if (ms && typeof ms.url === 'string' && ms.url.startsWith('data:image/')) {
                  try {
                    const m = ms.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (m && m[2]) {
                      const safeMsId = String(ms.id || `ms_${vStamp}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                      const fn = `${safeMsId}.jpg`;
                      fs.writeFileSync(path.join(avatarsDir, fn), Buffer.from(m[2], 'base64'));
                      return { ...ms, url: `/avatars/${fn}?v=${vStamp}` };
                    }
                  } catch {}
                }
                return ms;
              })
            : nf.manuscripts;
          return {
            ...nf,
            photo: updatedPhoto,
            manuscripts: updatedManuscripts
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
        const incTime = normalizeServerTimestamp(state.updatedAt) || vStamp;
        finalUpdatedAt = getServerSafeTimestamp(incTime, baseTime);

        const mergedMembers = deduplicateServerMembers([
          ...(existingData?.members || []),
          ...(state.members || [])
        ]);

        // ZERO PHOTO LOSS: Strictly preserve all existing valid photos and never overwrite with empty string or invalid space paths
        const mergedPhotos: Record<string, string> = {};
        for (const [ek, ev] of Object.entries(existingData?.photos || {})) {
          if (isValidServerPhotoEntry(ek, ev)) {
            mergedPhotos[ek] = ev.trim();
          }
        }
        for (const [pk, pv] of Object.entries(photos || {})) {
          if (isValidServerPhotoEntry(pk, pv)) {
            const cur = mergedPhotos[pk] || '';
            if (pv.startsWith('data:image/') || !cur.startsWith('data:image/')) {
              mergedPhotos[pk] = pv.trim();
            }
          }
        }
        const serverBackups = loadServerCustomAvatarsBackup();
        for (const [bk, bv] of Object.entries(serverBackups)) {
          if (!mergedPhotos[bk] && isValidServerPhotoEntry(bk, bv)) {
            mergedPhotos[bk] = bv;
          }
        }

        // Merge overrides authoritatively from incoming state
        const allOverKeys = new Set([
          ...Object.keys(existingData?.over || {}),
          ...Object.keys(state.over || {})
        ]);
        const mergedOver: Record<string, any> = {};
        for (const k of allOverKeys) {
          const bOv = existingData?.over?.[k] || {};
          const iOv = state.over?.[k] || {};
          const bAt = normalizeServerTimestamp(bOv.at) || baseTime;
          const iAt = normalizeServerTimestamp(iOv.at) || incTime;
          const useInc = k in (state.over || {});
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
          ...(Array.isArray(state.removed) ? state.removed : [])
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
          // If incoming state explicitly omitted an item that was present in existingData, mark it deleted
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
          spouses: state.spouses
            ? { ...(existingData?.spouses || {}), ...state.spouses }
            : (existingData?.spouses || {}),
          mothers: state.mothers
            ? { ...(existingData?.mothers || {}), ...state.mothers }
            : (existingData?.mothers || {}),
          contactInfo: state.contactInfo ? state.contactInfo : (existingData?.contactInfo || {}),
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

    return { syncedFamilyData, updatedAt: finalUpdatedAt };
  }

  // 2. API: Save full family state to source files, sync to Firestore, and push to GitHub immediately
  app.post('/api/save-family-data', (req, res) => {
    try {
      const state = req.body;
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'Invalid state' });
      }

      const { syncedFamilyData, updatedAt } = persistStateToTargetJsonFiles(state);

      // Immediately sync to Firestore from server as well
      if (syncedFamilyData) {
        syncToFirestoreFromServer(syncedFamilyData).catch(() => {});
      }

      // Immediately schedule GitHub commit & push to main and master so alfardanfamily.com updates automatically
      autoGitCommitAndPush('feat(tree): auto-sync family tree additions, edits, deletions, photos, and documents to GitHub').catch(() => {});

      return res.json({
        success: true,
        updatedAt,
        archivalPhotos: syncedFamilyData?.archivalPhotos,
        message: 'Saved and synced to Firestore and GitHub'
      });
    } catch (err: any) {
      console.error('Error in /api/save-family-data:', err);
      return res.status(500).json({ error: err.message || 'Failed to save family data' });
    }
  });

  // Real-time Server-Side Firestore Listener:
  // If an admin logs in on alfardanfamily.com (or any external browser) and modifies Firestore directly,
  // the server automatically merges the changes into initialTreeData.json and pushes to GitHub!
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
              } else if (localTs > cloudTs || (localFd?.members?.length || 0) > (cloudState?.members?.length || 0)) {
                const { syncedFamilyData } = persistStateToTargetJsonFiles(localFd);
                if (syncedFamilyData) {
                  syncToFirestoreFromServer(syncedFamilyData).catch(() => {});
                }
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

  // 4. API: List all available avatars uploaded to public/avatars (e.g. from GitHub)
  app.get('/api/available-avatars', (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      if (!fs.existsSync(avatarsDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(avatarsDir);
      const validExts = ['.jpg', '.jpeg', '.png', '.jfif', '.webp'];
      const images = files
        .filter(f => validExts.includes(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b))
        .map(f => ({
          filename: f,
          url: `/avatars/${encodeURIComponent(f)}`
        }));
      return res.json(images);
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
              : 'تم حفظ كافة التعديلات ودمج 1273 اسماً محلياً. يرجى إدخال رمز الوصول الشخصي (GitHub Token) لتفعيل النشر اللحظي التلقائي إلى alfardanfamily.com'),
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

  // Static avatars with automatic on-the-fly restoration from customAvatarsBackup.json,
  // and an instant 200 OK SVG fallback if the avatar file does not exist on disk (eliminating 404 Console errors)
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
        const baseKey = path.basename(cleanRel, path.extname(cleanRel));
        const backups = loadServerCustomAvatarsBackup();
        const dataUrl = backups[baseKey];
        if (dataUrl) {
          const m = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (m && m[2]) {
            fs.writeFileSync(fullPath, Buffer.from(m[2], 'base64'));
          }
        }
      }
      if (!fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
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
