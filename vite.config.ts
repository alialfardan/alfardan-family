import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function extractBase64ToAvatarFile(
  key: string,
  val: string,
  avatarsDir: string,
  vStamp: number
): string {
  const trimmed = val.trim();
  const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanKey) return trimmed;

  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    const rawBase64 = match ? match[1] : trimmed.split(',')[1];
    if (rawBase64) {
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }
      const filename = `${cleanKey}.jpg`;
      const filePath = path.join(avatarsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(rawBase64, 'base64'));
      return `/avatars/${filename}?v=${vStamp}`;
    }
  }

  if (trimmed.startsWith('/avatars/')) {
    const cleanFile = trimmed.split('?')[0].replace(/^\/avatars\//, '');
    return trimmed.includes('?v=') ? trimmed : `/avatars/${cleanFile}?v=${vStamp}`;
  }

  return trimmed;
}

function updateAvatarsManifestOnDisk(rootDir: string, avatarsDir: string, vStamp: number): void {
  try {
    if (!fs.existsSync(avatarsDir)) return;
    const files = fs.readdirSync(avatarsDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b));
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
      server.middlewares.use('/__save_tree_to_disk', (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const parsedBody = JSON.parse(body || '{}');
            const incomingFamilyData = parsedBody.familyData || parsedBody;
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

            const rawMergedPhotos: Record<string, string> = {
              ...(existingFamilyData.photos || {}),
              ...(incomingFamilyData.photos || {})
            };

            const cleanPhotos: Record<string, string> = {};
            for (const [k, val] of Object.entries(rawMergedPhotos)) {
              if (!val || typeof val !== 'string' || !val.trim()) {
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
      });
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
