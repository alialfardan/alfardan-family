import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function removeAvatarFileFromDisk(key: string, avatarsDir: string): void {
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

function extractBase64ToAvatarFile(
  key: string,
  val: string,
  avatarsDir: string,
  vStamp: number
): string {
  const trimmed = val.trim();
  const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanKey) return trimmed;

  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    const rawBase64 = match ? match[1] : trimmed.split(',')[1];
    if (rawBase64) {
      const filename = `${cleanKey}.jpg`;
      const filePath = path.join(avatarsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(rawBase64, 'base64'));
      return `/avatars/${filename}?v=${vStamp}`;
    }
  }

  if (trimmed.startsWith('/avatars/')) {
    const cleanFile = trimmed.split('?')[0].replace(/^\/avatars\//, '');
    const sourcePath = path.join(avatarsDir, cleanFile);
    const targetFilename = `${cleanKey}.jpg`;
    const targetPath = path.join(avatarsDir, targetFilename);

    // If a gallery image from another key was assigned to this person, copy it to public/avatars/[cleanKey].jpg
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

function updateAvatarsManifestOnDisk(rootDir: string, avatarsDir: string, vStamp: number): void {
  try {
    if (!fs.existsSync(avatarsDir)) return;
    const files = fs.readdirSync(avatarsDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const manifest = files.map((filename) => ({
      filename,
      url: `/avatars/${filename}?v=${vStamp}`,
    }));
    const manifestPath = path.resolve(rootDir, 'public/avatars-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch {}
}

function saveTreeToDiskPlugin(): Plugin {
  return {
    name: 'save-tree-to-disk-bridge',
    configureServer(server) {
      // Handle /api/delete-avatar directly
      server.middlewares.use('/api/delete-avatar', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { key } = JSON.parse(body || '{}');
            if (!key) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing key' }));
              return;
            }
            const rootDir = import.meta.dirname;
            const avatarsDir = path.resolve(rootDir, 'public/avatars');
            const initialTreePath = path.resolve(rootDir, 'src/data/initialTreeData.json');
            const backupTreePath = path.resolve(rootDir, 'src/data/initialTreeData.backup.json');
            const publicBackupPath = path.resolve(rootDir, 'public/fardan_family_tree_backup.json');
            const vStamp = Date.now();

            // 1. Delete physical file from public/avatars/[key].jpg
            removeAvatarFileFromDisk(key, avatarsDir);

            // 2. Delete photos[key] from all JSON files
            for (const filePath of [initialTreePath, backupTreePath, publicBackupPath]) {
              if (fs.existsSync(filePath)) {
                try {
                  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                  const targetObj = parsed.familyData ? parsed.familyData : parsed;
                  if (targetObj.photos && typeof targetObj.photos === 'object') {
                    delete targetObj.photos[key];
                  }
                  targetObj.updatedAt = Math.max(targetObj.updatedAt || 0, vStamp);
                  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
                } catch {}
              }
            }

            updateAvatarsManifestOnDisk(rootDir, avatarsDir, vStamp);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, deletedKey: key, updatedAt: vStamp }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Failed to delete avatar' }));
          }
        });
      });

      // Handle /api/save-tree and /__save_tree_to_disk
      const handleSaveTreeMiddleware = (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          return next();
        }
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const parsedBody = JSON.parse(body || '{}');
            const incomingFamilyData = parsedBody.familyData || parsedBody;
            const explicitDeletedKeys = new Set<string>(
              Array.isArray(parsedBody.deletedPhotoKeys) ? parsedBody.deletedPhotoKeys : []
            );
            const replacePhotos = Boolean(parsedBody.replacePhotos);

            const rootDir = import.meta.dirname;
            const initialTreePath = path.resolve(rootDir, 'src/data/initialTreeData.json');
            const backupTreePath = path.resolve(rootDir, 'src/data/initialTreeData.backup.json');
            const publicBackupPath = path.resolve(rootDir, 'public/fardan_family_tree_backup.json');
            const avatarsDir = path.resolve(rootDir, 'public/avatars');

            if (!fs.existsSync(avatarsDir)) {
              fs.mkdirSync(avatarsDir, { recursive: true });
            }

            let existingWrapper: any = { treeData: {}, familyData: {} };
            if (fs.existsSync(initialTreePath)) {
              try {
                existingWrapper = JSON.parse(fs.readFileSync(initialTreePath, 'utf-8'));
              } catch {}
            }

            const existingFamilyData = existingWrapper.familyData || {};
            const vStamp = incomingFamilyData.updatedAt || Date.now();

            const incomingPhotos = incomingFamilyData.photos || {};
            for (const [k, val] of Object.entries(incomingPhotos)) {
              if (val === '' || val === null) {
                explicitDeletedKeys.add(k);
              }
            }

            // If replacePhotos is true, any key that existed previously but was deleted from incomingPhotos is also removed
            if (replacePhotos && existingFamilyData.photos && typeof existingFamilyData.photos === 'object') {
              for (const existingKey of Object.keys(existingFamilyData.photos)) {
                if (!(existingKey in incomingPhotos)) {
                  explicitDeletedKeys.add(existingKey);
                }
              }
            }

            // Delete physical avatar files for all deleted keys
            for (const delKey of explicitDeletedKeys) {
              removeAvatarFileFromDisk(delKey, avatarsDir);
            }

            const rawMergedPhotos: Record<string, string> = replacePhotos
              ? { ...incomingPhotos }
              : {
                  ...(existingFamilyData.photos || {}),
                  ...incomingPhotos
                };

            const cleanPhotos: Record<string, string> = {};
            for (const [k, val] of Object.entries(rawMergedPhotos)) {
              if (explicitDeletedKeys.has(k) || !val || typeof val !== 'string' || !val.trim()) {
                delete cleanPhotos[k];
                continue;
              }
              cleanPhotos[k] = extractBase64ToAvatarFile(k, val, avatarsDir, vStamp);
            }

            const rawArchival = Array.isArray(incomingFamilyData.archivalPhotos) && incomingFamilyData.archivalPhotos.length > 0
              ? incomingFamilyData.archivalPhotos
              : (existingFamilyData.archivalPhotos || []);
            const processedArchival = rawArchival.map((ap: any) => {
              if (ap && ap.id && typeof ap.url === 'string' && ap.url.startsWith('data:image/')) {
                return {
                  ...ap,
                  url: extractBase64ToAvatarFile(ap.id, ap.url, avatarsDir, vStamp),
                };
              }
              return ap;
            });

            const rawNotables = Array.isArray(incomingFamilyData.notableFigures) && incomingFamilyData.notableFigures.length > 0
              ? incomingFamilyData.notableFigures
              : (existingFamilyData.notableFigures || []);
            const processedNotables = rawNotables.map((nf: any) => {
              if (!nf || !nf.id) return nf;
              const nextPhoto = typeof nf.photo === 'string' && nf.photo.startsWith('data:image/')
                ? extractBase64ToAvatarFile(nf.id, nf.photo, avatarsDir, vStamp)
                : nf.photo;
              return {
                ...nf,
                photo: nextPhoto,
              };
            });

            const updatedFamilyData = {
              ...existingFamilyData,
              ...incomingFamilyData,
              members: Array.isArray(incomingFamilyData.members) && incomingFamilyData.members.length > 0
                ? incomingFamilyData.members
                : (existingFamilyData.members || []),
              photos: cleanPhotos,
              over: {
                ...(existingFamilyData.over || {}),
                ...(incomingFamilyData.over || {})
              },
              removed: Array.isArray(incomingFamilyData.removed)
                ? incomingFamilyData.removed
                : (existingFamilyData.removed || []),
              spouses: {
                ...(existingFamilyData.spouses || {}),
                ...(incomingFamilyData.spouses || {})
              },
              mothers: {
                ...(existingFamilyData.mothers || {}),
                ...(incomingFamilyData.mothers || {})
              },
              archivalPhotos: processedArchival,
              notableFigures: processedNotables,
              contactInfo: incomingFamilyData.contactInfo || existingFamilyData.contactInfo,
              updatedAt: vStamp
            };

            const fullTreePayload = {
              treeData: parsedBody.treeData || existingWrapper.treeData,
              familyData: updatedFamilyData
            };

            const serializedFull = JSON.stringify(fullTreePayload, null, 2);
            fs.writeFileSync(initialTreePath, serializedFull, 'utf-8');
            fs.writeFileSync(backupTreePath, serializedFull, 'utf-8');
            fs.writeFileSync(publicBackupPath, JSON.stringify(updatedFamilyData, null, 2), 'utf-8');
            updateAvatarsManifestOnDisk(rootDir, avatarsDir, vStamp);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              updatedAt: updatedFamilyData.updatedAt,
              photos: cleanPhotos
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Failed to write tree to disk' }));
          }
        });
      };

      server.middlewares.use('/api/save-tree', handleSaveTreeMiddleware);
      server.middlewares.use('/__save_tree_to_disk', handleSaveTreeMiddleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [saveTreeToDiskPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      sourcemap: false,
    },
  };
});
