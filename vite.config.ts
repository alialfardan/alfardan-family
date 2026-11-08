import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

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

            let existingWrapper: any = { treeData: {}, familyData: {} };
            if (fs.existsSync(initialTreePath)) {
              try {
                existingWrapper = JSON.parse(fs.readFileSync(initialTreePath, 'utf-8'));
              } catch {}
            }

            const existingFamilyData = existingWrapper.familyData || {};
            const mergedPhotos: Record<string, string> = {
              ...(existingFamilyData.photos || {}),
              ...(incomingFamilyData.photos || {})
            };

            // Convert any /avatars/ path into inline Base64 and honor explicit '' deletions
            for (const [k, val] of Object.entries(mergedPhotos)) {
              if (!val || typeof val !== 'string' || !val.trim()) {
                delete mergedPhotos[k];
                continue;
              }
              const trimmed = val.trim();
              if (trimmed.startsWith('/avatars/')) {
                const cleanFile = trimmed.split('?')[0].replace(/^\/avatars\//, '');
                const avatarFilePath = path.join(avatarsDir, cleanFile);
                if (fs.existsSync(avatarFilePath)) {
                  const buf = fs.readFileSync(avatarFilePath);
                  mergedPhotos[k] = `data:image/jpeg;base64,${buf.toString('base64')}`;
                } else {
                  delete mergedPhotos[k];
                }
              } else {
                mergedPhotos[k] = trimmed;
              }
            }

            const updatedFamilyData = {
              ...existingFamilyData,
              ...incomingFamilyData,
              members: Array.isArray(incomingFamilyData.members) && incomingFamilyData.members.length > 0
                ? incomingFamilyData.members
                : (existingFamilyData.members || []),
              photos: mergedPhotos,
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
              archivalPhotos: Array.isArray(incomingFamilyData.archivalPhotos) && incomingFamilyData.archivalPhotos.length > 0
                ? incomingFamilyData.archivalPhotos
                : (existingFamilyData.archivalPhotos || []),
              notableFigures: Array.isArray(incomingFamilyData.notableFigures) && incomingFamilyData.notableFigures.length > 0
                ? incomingFamilyData.notableFigures
                : (existingFamilyData.notableFigures || []),
              contactInfo: incomingFamilyData.contactInfo || existingFamilyData.contactInfo,
              updatedAt: incomingFamilyData.updatedAt || Date.now()
            };

            const fullTreePayload = {
              treeData: parsedBody.treeData || existingWrapper.treeData,
              familyData: updatedFamilyData
            };

            const serializedFull = JSON.stringify(fullTreePayload, null, 2);
            fs.writeFileSync(initialTreePath, serializedFull, 'utf-8');
            fs.writeFileSync(backupTreePath, serializedFull, 'utf-8');
            fs.writeFileSync(publicBackupPath, JSON.stringify(updatedFamilyData, null, 2), 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, updatedAt: updatedFamilyData.updatedAt }));
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
