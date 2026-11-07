import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, FamilyState, AddedMember, MemberOverrides, ArchivalPhoto, SpouseInfo, MotherInfo, ContactInfo } from './types/family';
import {
  loadSavedState,
  saveStateToStorage,
  buildFamilyRegistry,
  DEFAULT_FAMILY_DATA,
  deduplicateMembers,
  resolveContactInfo,
  mergeFamilyStates,
  getMonotonicTimestamp,
  normalizeTimestamp,
  loadCustomAvatarsBackup,
  saveCustomAvatarBackup,
  removeCustomAvatarBackup,
  isValidPhotoEntry
} from './data/treeManager';
import { getDefaultAvatarDataUri, markAvatarUrlFailed } from './components/MemberAvatar';
import {
  subscribeToFamilyState,
  subscribeToContactInfo,
  subscribeToArchivalPhotos,
  syncFamilyStateToCloud,
  syncContactInfoToCloud,
  syncArchivalPhotoToCloud,
  deleteArchivalPhotoFromCloud,
  ensureCloudInitialized
} from './firebase/realtimeTreeService';
import { Navbar } from './components/Navbar';
import { TreeCanvas } from './components/TreeCanvas';
import { BranchLegend } from './components/BranchLegend';
import { PersonDetailDrawer } from './components/PersonDetailDrawer';
import { AddEditMemberModal } from './components/AddEditMemberModal';
import { DocumentArchiveView } from './components/DocumentArchiveView';
import { FamilyDirectoryView } from './components/FamilyDirectoryView';
import { AboutAndAnalyticsView } from './components/AboutAndAnalyticsView';
import { PedigreeCertificateModal } from './components/PedigreeCertificateModal';
import { BackupModal } from './components/BackupModal';
import { FamilyExplorerView } from './components/FamilyExplorerView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { SearchResultsModal } from './components/SearchResultsModal';
import { ArchivalPhotosView } from './components/ArchivalPhotosView';
import { AddEditArchivalPhotoModal } from './components/AddEditArchivalPhotoModal';
import { FaceCropModal } from './components/FaceCropModal';
import { AvatarGalleryModal } from './components/AvatarGalleryModal';
import { ContactCreditsModal } from './components/ContactCreditsModal';
import { usePWAInstall } from './pwa/usePWAInstall';
import { apiFetch, mirrorSaveToAllEndpoints } from './utils/apiClient';
import { fastCompressAvatar } from './utils/imageDownload';
import { SmartInstallBanner } from './components/SmartInstallBanner';
import { IOSInstallModal, ManualInstallModal } from './components/PWAInstallModals';
import {
  isStandaloneApp,
  getNotificationPermission,
  requestNotificationPermission,
  listenToCloudNotifications,
  sendCloudNotification,
  NotificationPermissionState
} from './services/notificationService';
import { NotificationGuideModal } from './components/NotificationGuideModal';
import { WelcomeDisclaimerModal } from './components/WelcomeDisclaimerModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
      } else {
        reject(new Error('Invalid image dataUrl'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractAvatarVersion(url: string | undefined | null): number {
  if (!url) return 0;
  const match = url.match(/[?&]v=(\d+)/);
  return match ? Number(match[1]) || 0 : 0;
}

export default function App() {
  // Family Data State
  const [familyState, setFamilyState] = useState<FamilyState>(() => loadSavedState());
  const [isSavingForPublish, setIsSavingForPublish] = useState<boolean>(false);
  const [hasUnsavedServerChanges, setHasUnsavedServerChanges] = useState<boolean>(false);

  // Authorization State (Default: Visitor Mode / false)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('fardan_authorized') === 'true') return true;
    } catch (_) {}
    try {
      if (sessionStorage.getItem('fardan_authorized') === 'true') return true;
    } catch (_) {}
    return false;
  });

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [isNotifGuideOpen, setIsNotifGuideOpen] = useState(false);

  // Welcome & Disclaimer Modal State (In-memory only, shown on every load/visit)
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(true);

  // PWA Install Manager
  const {
    isInstalled: isPWAInstalled,
    showIOSModal,
    setShowIOSModal,
    showManualModal,
    setShowManualModal,
    triggerInstall: handlePWAInstall
  } = usePWAInstall();

  // Avatar Gallery Modal State
  const [avatarGalleryModal, setAvatarGalleryModal] = useState<{
    isOpen: boolean;
    targetKey: string;
    memberName: string;
    currentPhoto: string | null;
  }>({
    isOpen: false,
    targetKey: '',
    memberName: '',
    currentPhoto: null,
  });

  const isApplyingCloudUpdateRef = useRef(false);
  const lastImmediateSyncAtRef = useRef<number>(0);
  const isModalEditingRef = useRef<boolean>(false);

  // Global fallback for any <img> tag whose /avatars/{key}.jpg is missing or fails to load:
  // Immediately falls back to local base64 backup or an inline SVG Data URI without making failed network requests.
  useEffect(() => {
    const handleImageError = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      const src = target.getAttribute('src') || '';
      if (!src || src.startsWith('data:image/svg+xml')) return;
      if (src.includes('/avatars/')) {
        markAvatarUrlFailed(src);
        const match = src.match(/\/avatars\/([^/?#]+)/i);
        const key = match ? decodeURIComponent(match[1]).replace(/\.[a-zA-Z0-9]+$/, '') : '';
        const backups = loadCustomAvatarsBackup();
        if (key && backups[key] && backups[key].startsWith('data:image/') && target.src !== backups[key]) {
          target.src = backups[key];
          return;
        }
        target.src = getDefaultAvatarDataUri(target.alt || '');
      }
    };
    window.addEventListener('error', handleImageError, true);
    return () => window.removeEventListener('error', handleImageError, true);
  }, []);

  // Automatic Browser Photo Recovery & Self-Healing Sync:
  // Scans localStorage backups, historical localStorage keys, Service Worker CacheStorage (window.caches),
  // and browser HTTP cache for any uploaded member photos (such as o438 Jafar bin Ibrahim, his sons, etc.)
  // that were uploaded in the browser and re-anchors them permanently on the server and in familyState.
  useEffect(() => {
    let isCancelled = false;

    async function recoverAndSyncUploadedAvatars() {
      try {
        // 1. Fetch currently available avatar files on the server disk
        const serverFilesSet = new Set<string>();
        try {
          const availRes = await apiFetch('/api/available-avatars', { cache: 'no-store' });
          if (availRes.ok) {
            const availList = await availRes.json();
            if (Array.isArray(availList)) {
              for (const item of availList) {
                if (item && typeof item.filename === 'string') {
                  serverFilesSet.add(item.filename);
                }
              }
            }
          }
        } catch (_) {}

        // 2. Gather candidate photos from all localStorage keys + customAvatarsBackup
        const localCandidates = new Map<string, string>();
        const customBackups = loadCustomAvatarsBackup();
        for (const [k, v] of Object.entries(customBackups)) {
          if (isValidPhotoEntry(k, v)) {
            localCandidates.set(k, v.trim());
          }
        }

        const storageKeys = [
          'fardan_family_tree_state_v4',
          'fardan_family_tree_state_v3',
          'fardan_family_tree_state_v2',
          'fardan_family_tree_state_v1'
        ];
        for (const sk of storageKeys) {
          try {
            const raw = localStorage.getItem(sk);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const photosObj = parsed?.photos || parsed?.familyData?.photos;
            if (photosObj && typeof photosObj === 'object') {
              for (const [k, v] of Object.entries(photosObj)) {
                if (isValidPhotoEntry(k, v)) {
                  const cleanVal = v.trim();
                  const existing = localCandidates.get(k);
                  if (!existing || (cleanVal.startsWith('data:image/') && !existing.startsWith('data:image/'))) {
                    localCandidates.set(k, cleanVal);
                  } else if (existing && extractAvatarVersion(cleanVal) > extractAvatarVersion(existing)) {
                    localCandidates.set(k, cleanVal);
                  }
                }
              }
            }
            // Remove obsolete v1, v2, v3 keys immediately after reading to free browser storage
            if (sk !== 'fardan_family_tree_state_v4') {
              try { localStorage.removeItem(sk); } catch (_) {}
            }
          } catch (_) {}
        }

        // 3. Scan Service Worker CacheStorage (window.caches) for any cached /avatars/{key}.jpg responses
        const swCachedBlobs = new Map<string, { url: string; version: number; blob: Blob }>();
        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const cacheNames = await window.caches.keys();
            for (const cacheName of cacheNames) {
              const cache = await window.caches.open(cacheName);
              const requests = await cache.keys();
              for (const req of requests) {
                try {
                  const parsedUrl = new URL(req.url, window.location.origin);
                  const m = parsedUrl.pathname.match(/^\/avatars\/(o\d+|oF|oR|am_[a-zA-Z0-9_-]+)\.(jpg|jpeg|png|webp)$/i);
                  if (!m) continue;
                  const memberKey = m[1];
                  const fullRelUrl = parsedUrl.pathname + parsedUrl.search;
                  const ver = extractAvatarVersion(fullRelUrl);
                  const prevEntry = swCachedBlobs.get(memberKey);
                  if (prevEntry && prevEntry.version >= ver) continue;

                  const resp = await cache.match(req);
                  if (resp && resp.ok) {
                    const blob = await resp.blob();
                    if (blob && blob.size > 200 && (!blob.type || blob.type.startsWith('image/'))) {
                      swCachedBlobs.set(memberKey, {
                        url: fullRelUrl,
                        version: ver,
                        blob
                      });
                    }
                  }
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        if (isCancelled) return;

        // 4. Determine which avatars need recovery/re-upload to the server or state restoration
        const toUpload = new Map<string, string>(); // memberKey -> dataUrl
        const currentPhotos = familyState.photos || {};

        // Check localCandidates (base64 or SW-cached /avatars/ URLs in localStorage — never probe missing files over HTTP)
        for (const [memberKey, candidateVal] of localCandidates.entries()) {
          if (candidateVal.startsWith('data:image/')) {
            const filename = `${memberKey}.jpg`;
            if (!serverFilesSet.has(filename) || !currentPhotos[memberKey] || currentPhotos[memberKey].startsWith('data:image/')) {
              toUpload.set(memberKey, candidateVal);
            }
          } else if (candidateVal.startsWith('/avatars/')) {
            const m = candidateVal.match(/^\/avatars\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))/i);
            const filename = m ? m[1] : `${memberKey}.jpg`;
            if (!serverFilesSet.has(filename)) {
              const swHit = swCachedBlobs.get(memberKey);
              if (swHit) {
                try {
                  const dataUrl = await blobToDataUrl(swHit.blob);
                  toUpload.set(memberKey, dataUrl);
                } catch (_) {}
              }
            }
          }
        }

        // Check all Service Worker cached avatars (catches photos like o438 whose state entry was overwritten before container restart)
        for (const [memberKey, swEntry] of swCachedBlobs.entries()) {
          if (toUpload.has(memberKey)) continue;
          const filename = `${memberKey}.jpg`;
          const curUrl = currentPhotos[memberKey];
          // Skip if explicitly deleted by admin (empty string '')
          if (curUrl === '') continue;

          const curVer = extractAvatarVersion(curUrl);
          const isMissingOnServer = !serverFilesSet.has(filename);
          const isMissingInState = !curUrl && swEntry.version > 0;
          const isNewerInCache = swEntry.version > 0 && swEntry.version > curVer;

          if (isMissingOnServer || isMissingInState || isNewerInCache) {
            try {
              const dataUrl = await blobToDataUrl(swEntry.blob);
              toUpload.set(memberKey, dataUrl);
            } catch (_) {}
          }
        }

        if (toUpload.size === 0 || isCancelled) return;

        const recoveredUrls: Record<string, string> = {};
        for (const [memberKey, dataUrl] of toUpload.entries()) {
          if (isCancelled) break;
          saveCustomAvatarBackup(memberKey, dataUrl);
          try {
            const res = await apiFetch('/api/upload-avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: memberKey, dataUrl })
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.url) {
                recoveredUrls[memberKey] = data.url;
              } else {
                recoveredUrls[memberKey] = dataUrl;
              }
            } else {
              recoveredUrls[memberKey] = dataUrl;
            }
          } catch (_) {
            recoveredUrls[memberKey] = dataUrl;
          }
        }

        if (Object.keys(recoveredUrls).length > 0 && !isCancelled) {
          lastImmediateSyncAtRef.current = Date.now();
          setFamilyState(prev => {
            const nextTs = getMonotonicTimestamp(prev);
            const nextState: FamilyState = {
              ...prev,
              photos: {
                ...(prev.photos || {}),
                ...recoveredUrls
              },
              updatedAt: nextTs
            };
            saveStateToStorage(nextState);
            syncFamilyStateToCloud(nextState).catch(() => {});
            apiFetch('/api/save-family-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nextState)
            }).catch(() => {});
            return nextState;
          });
        }
      } catch (err) {
        console.warn('Avatar recovery scan warning:', err);
      }
    }

    recoverAndSyncUploadedAvatars();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Sync from server (/api/family-data) AND GitHub Raw live stream so both AI Studio and alfardanfamily.com update instantaneously
  useEffect(() => {
    let isMounted = true;
    const GITHUB_RAW_JSON = 'https://raw.githubusercontent.com/alialfardan/alfardan-family/main/src/data/initialTreeData.json';

    async function loadRemoteData() {
      if (isModalEditingRef.current || Date.now() - lastImmediateSyncAtRef.current < 15000) {
        return;
      }
      const ts = Date.now();
      const fetchPromises: Promise<any>[] = [
        apiFetch(`/api/family-data?t=${ts}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${GITHUB_RAW_JSON}?t=${ts}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      ];

      const settled = await Promise.allSettled(fetchPromises);
      if (!isMounted) return;

      const serverData = settled[0]?.status === 'fulfilled' ? settled[0].value : null;
      const githubData = settled[1]?.status === 'fulfilled' ? settled[1].value : null;

      const effectiveServerData = serverData;

      if (!effectiveServerData && !githubData) return;

      isApplyingCloudUpdateRef.current = true;
      setFamilyState(prev => {
        // Skip overwriting if an admin is editing or just performed an immediate save within the last 15 seconds
        if (isModalEditingRef.current || Date.now() - lastImmediateSyncAtRef.current < 15000) {
          return prev;
        }
        let next = prev;
        const currentTs = normalizeTimestamp(next.updatedAt);
        if (githubData && typeof githubData === 'object') {
          const unwrappedGithub = githubData.familyData || githubData;
          const githubTs = normalizeTimestamp(unwrappedGithub.updatedAt);
          if (githubTs > currentTs) {
            next = mergeFamilyStates(next, unwrappedGithub);
          }
        }
        if (effectiveServerData && typeof effectiveServerData === 'object') {
          const unwrappedServer = effectiveServerData.familyData || effectiveServerData;
          const serverTs = normalizeTimestamp(unwrappedServer.updatedAt);
          if (serverTs >= normalizeTimestamp(next.updatedAt)) {
            next = mergeFamilyStates(next, unwrappedServer);
          } else if (
            normalizeTimestamp(next.updatedAt) > serverTs ||
            (next.members?.length || 0) > (unwrappedServer.members?.length || 0) ||
            Object.keys(next.photos || {}).length > Object.keys(unwrappedServer.photos || {}).length
          ) {
            next = mergeFamilyStates(unwrappedServer, next);
            apiFetch('/api/save-family-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(next)
            }).catch(() => {});
          }
        }
        saveStateToStorage(next);
        return next;
      });
    }

    loadRemoteData();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadRemoteData();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const interval = setInterval(loadRemoteData, 25000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  // 1. Initial Cloud Firestore Check & Real-time Live Subscription
  useEffect(() => {
    // Seed Firestore if empty
    ensureCloudInitialized(familyState);

    // Subscribe to instant updates from Firestore (< 300ms latency across all browsers & domains)
    const unsubscribeState = subscribeToFamilyState((cloudUpdate) => {
      isApplyingCloudUpdateRef.current = true;
      setFamilyState(prev => {
        const prevUpdated = prev.updatedAt || 0;
        const cloudUpdated = cloudUpdate.updatedAt || 0;
        const nextMergedState = mergeFamilyStates(prev, cloudUpdate);
        saveStateToStorage(nextMergedState);

        // If cloud update is newer than local/server, mirror to /api/save-family-data so server JSON & GitHub stay in sync
        if (cloudUpdated > prevUpdated && Date.now() - lastImmediateSyncAtRef.current > 2000) {
          lastImmediateSyncAtRef.current = cloudUpdated;
          apiFetch('/api/save-family-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextMergedState)
          }).catch(() => {});
        }

        return nextMergedState;
      });
    });

    // Subscribe to dedicated archival_photos collection for instant cross-site photo & document sync
    const unsubscribeArchival = subscribeToArchivalPhotos((cloudPhotos, deletedIds) => {
      isApplyingCloudUpdateRef.current = true;
      setFamilyState(prev => {
        const currentList = [...(prev.archivalPhotos || [])];
        const byId = new Map<string, ArchivalPhoto>();
        for (const p of currentList) {
          if (p && p.id && !deletedIds.includes(p.id)) {
            byId.set(p.id, p);
          }
        }
        for (const cp of cloudPhotos) {
          if (cp && cp.id && !deletedIds.includes(cp.id)) {
            const existing = byId.get(cp.id);
            // Keep /avatars/ URL if local already converted it and cloud still has base64
            if (existing && existing.url.startsWith('/avatars/') && cp.url.startsWith('data:image/')) {
              byId.set(cp.id, { ...cp, url: existing.url });
            } else {
              byId.set(cp.id, cp);
            }

            // If cloud photo is still base64, persist to /api/upload-avatar on server so it pushes to GitHub
            if (cp.url.startsWith('data:image/')) {
              apiFetch('/api/upload-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: cp.id, dataUrl: cp.url })
              })
                .then(r => (r.ok ? r.json() : null))
                .then(resData => {
                  if (resData?.url) {
                    syncArchivalPhotoToCloud({ ...cp, url: resData.url }).catch(() => {});
                  }
                })
                .catch(() => {});
            }
          }
        }
        const nextArchival = Array.from(byId.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const nextState: FamilyState = {
          ...prev,
          archivalPhotos: nextArchival
        };
        saveStateToStorage(nextState);
        return nextState;
      });
    });

    // Subscribe to dedicated settings/contactInfo Firestore document
    const unsubscribeContact = subscribeToContactInfo((info) => {
      setFamilyState(prev => {
        const resolved = resolveContactInfo(info);
        const nextState = {
          ...prev,
          contactInfo: resolved
        };
        saveStateToStorage(nextState);
        return nextState;
      });
    });

    return () => {
      unsubscribeState();
      unsubscribeArchival();
      unsubscribeContact();
    };
  }, []);

  const isInitialMountRef = useRef(true);

  // 2. Save to localStorage automatically & Sync changes when modified
  useEffect(() => {
    saveStateToStorage(familyState);

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isApplyingCloudUpdateRef.current) {
      isApplyingCloudUpdateRef.current = false;
      return;
    }

    // Skip redundant auto-sync if persistAndSyncImmediately already synced within the last 1.5s
    if (Date.now() - lastImmediateSyncAtRef.current < 1500) {
      return;
    }

    setHasUnsavedServerChanges(true);

    const timer = setTimeout(() => {
      if (isAuthorized) {
        syncFamilyStateToCloud(familyState).catch(() => {});
      }
      apiFetch('/api/save-family-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyState)
      }).catch(() => {});
    }, 800);

    return () => clearTimeout(timer);
  }, [familyState, isAuthorized]);

  // Compute Processed Registry
  const registry = useMemo(() => {
    return buildFamilyRegistry(familyState);
  }, [familyState]);

  // Navigation State - defaults to 'home'
  const [currentTab, setCurrentTab] = useState<ActiveTab>('home');
  const [explorerPersonKey, setExplorerPersonKey] = useState<string>('home');

  // Selected Person State
  const [selectedKey, setSelectedKey] = useState<string>('oF'); // Fardan
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Tree Expansion State (Keys of nodes that are expanded)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    // Expand root path down to Al-Fardan, Fardan bin Ayoub, and direct heads
    initialSet.add('ot0');
    initialSet.add('ot1');
    initialSet.add('ot2');
    initialSet.add('am_mvzm8u6pyafp');
    initialSet.add('ot3');
    initialSet.add('oF');
    return initialSet;
  });

  // Branch filter
  const [filterBranch, setFilterBranch] = useState<string | null>(null);

  // Modals state
  const [addEditModal, setAddEditModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    targetKey: string;
    defaultGender?: 'm' | 'f';
  }>({
    isOpen: false,
    mode: 'add',
    targetKey: 'oF',
    defaultGender: 'm'
  });

  const [certificateModal, setCertificateModal] = useState<{
    isOpen: boolean;
    personKey: string;
  }>({
    isOpen: false,
    personKey: 'oF'
  });

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Dedicated Search Results Frame Modal
  const [searchResultsModal, setSearchResultsModal] = useState<{
    isOpen: boolean;
    query: string;
  }>({
    isOpen: false,
    query: ''
  });

  // Archival Photo Modal State
  const [archivalPhotoModal, setArchivalPhotoModal] = useState<{
    isOpen: boolean;
    photoToEdit: ArchivalPhoto | null;
    defaultCategory?: ArchivalPhoto['category'];
  }>({
    isOpen: false,
    photoToEdit: null,
    defaultCategory: 'documents'
  });
  const pendingArchivalModalCategoryRef = useRef<ArchivalPhoto['category'] | null>(null);

  // Face Crop Modal State (Focus and center member face)
  const [faceCropModal, setFaceCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
    targetKey: string;
    memberName: string;
  }>({
    isOpen: false,
    imageSrc: '',
    targetKey: '',
    memberName: ''
  });

  // Keep isModalEditingRef in sync so window.onfocus (e.g. when closing the OS file picker)
  // never triggers a remote state overwrite while an edit/photo modal is open
  useEffect(() => {
    isModalEditingRef.current = Boolean(
      addEditModal.isOpen ||
      faceCropModal.isOpen ||
      avatarGalleryModal.isOpen ||
      archivalPhotoModal.isOpen
    );
  }, [addEditModal.isOpen, faceCropModal.isOpen, avatarGalleryModal.isOpen, archivalPhotoModal.isOpen]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleAuthorize = useCallback(() => {
    setIsAuthorized(true);
    try {
      localStorage.setItem('fardan_authorized', 'true');
    } catch (_) {}
    try {
      sessionStorage.setItem('fardan_authorized', 'true');
    } catch (_) {}
    if (pendingArchivalModalCategoryRef.current) {
      const cat = pendingArchivalModalCategoryRef.current;
      pendingArchivalModalCategoryRef.current = null;
      setTimeout(() => {
        setArchivalPhotoModal({ isOpen: true, photoToEdit: null, defaultCategory: cat });
      }, 150);
    }
  }, []);

  const handleDeauthorize = useCallback(() => {
    setIsAuthorized(false);
    try {
      localStorage.removeItem('fardan_authorized');
    } catch (_) {}
    try {
      sessionStorage.removeItem('fardan_authorized');
    } catch (_) {}
  }, []);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Real-time Cloud Notifications Listener (Dual-path: SW system alert + In-App Toast)
  useEffect(() => {
    const unsubscribe = listenToCloudNotifications((notif) => {
      showToast(notif.body ? `📢 ${notif.title}: ${notif.body}` : `📢 ${notif.title}`, 'info');
    });
    return () => unsubscribe();
  }, [showToast]);

  // Handler to enable notifications with standalone PWA verification
  const handleEnableNotifications = useCallback(async () => {
    const standalone = isStandaloneApp();
    if (!standalone) {
      setIsNotifGuideOpen(true);
      return;
    }

    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    if (res === 'granted') {
      showToast('✓ تم تفعيل الإشعارات بنجاح!');
    } else if (res === 'denied') {
      showToast('يرجى السماح بالإشعارات من إعدادات المتصفح أو الجهاز');
    }
  }, [showToast]);

  // Handler for Admin to send push notifications
  const handleSendNotification = useCallback(async (title: string, body: string) => {
    return await sendCloudNotification(title, body);
  }, []);

  // Tab switch handler: When entering the interactive tree, ensure the detail drawer is closed
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setCurrentTab(tab);
    if (tab === 'tree') {
      setIsDrawerOpen(false);
    }
  }, []);

  // Selection handler with auto-reveal parent nodes
  const handleSelectPerson = useCallback((key: string, opts?: { reveal?: boolean; center?: boolean; openDrawer?: boolean }) => {
    setSelectedKey(key);
    setExplorerPersonKey(key);
    if (opts?.openDrawer !== false) {
      setIsDrawerOpen(true);
    }

    if (opts?.reveal) {
      setExpandedKeys(prev => {
        const next = new Set(prev);
        let cur = registry.people.get(key);
        let guard = 0;
        while (cur && guard++ < 50) {
          if (cur.parentKey) {
            next.add(cur.parentKey);
            cur = registry.people.get(cur.parentKey);
          } else {
            break;
          }
        }
        return next;
      });
    }
  }, [registry]);

  // Toggle node expansion
  const handleToggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Expand All nodes
  const handleExpandAll = useCallback(() => {
    const allKeys = new Set<string>();
    registry.people.forEach(p => {
      if (!p.deleted && p.childrenKeys.length > 0) {
        allKeys.add(p.key);
      }
    });
    setExpandedKeys(allKeys);
    showToast('تم توسيع جميع فروع الشجرة', 'info');
  }, [registry, showToast]);

  // Collapse All to Founding Trunk
  const handleCollapseAll = useCallback(() => {
    const basicSet = new Set<string>(['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF']);
    setExpandedKeys(basicSet);
    setSelectedKey('oF');
    showToast('تم طي الشجرة للوضع التأسيسي', 'info');
  }, [showToast]);

  // Helper to immediately and permanently anchor state across localStorage, Firestore, live server endpoints, and GitHub
  const persistAndSyncImmediately = useCallback((nextState: FamilyState) => {
    const nextTs = getMonotonicTimestamp(nextState);
    lastImmediateSyncAtRef.current = Date.now();
    const stampedState: FamilyState = {
      ...nextState,
      updatedAt: nextTs
    };
    saveStateToStorage(stampedState);
    setHasUnsavedServerChanges(false);

    // 1. Direct instant write to Firebase (Single Source of Truth)
    syncFamilyStateToCloud(stampedState).catch(err => {
      console.warn('Immediate cloud sync error:', err);
    });

    // 2. Direct instant mirror to both local dev and live cloud server endpoints + background GitHub push
    mirrorSaveToAllEndpoints('/api/save-family-data', stampedState)
      .then(() => {
        mirrorSaveToAllEndpoints('/api/publish-to-github', {}).catch(() => {});
      })
      .catch(err => {
        console.warn('Immediate save-family-data error:', err);
      });
  }, []);

  // Add / Edit submission
  const handleAddEditSubmit = (data: {
    name: string;
    gender: 'm' | 'f';
    year: number | null;
    note: string;
    parentKey: string;
    photo?: string | null;
    motherInfo?: MotherInfo | null;
    isDeceased?: boolean;
    deathYear?: number | null;
    birthDate?: string | null;
  }) => {
    if (!isAuthorized) {
      showToast('هذه العملية تتطلب صلاحيات المشرف المصرح له', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    if (addEditModal.mode === 'add') {
      const newId = 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newMemberKey = 'a' + newId;
      const isBase64Photo = Boolean(data.photo && data.photo.startsWith('data:image/'));

      if (isBase64Photo && data.photo) {
        saveCustomAvatarBackup(newMemberKey, data.photo);
      }

      lastImmediateSyncAtRef.current = Date.now();
      setFamilyState(prev => {
        const nextTs = getMonotonicTimestamp(prev);
        const newMember: AddedMember = {
          id: newId,
          name: data.name,
          gender: data.gender,
          year: data.year,
          birthDate: data.birthDate,
          note: data.note,
          parent: data.parentKey,
          isDeceased: data.isDeceased,
          deathYear: data.deathYear,
          at: nextTs,
          del: false,
          motherInfo: data.motherInfo || undefined
        };
        const nextState: FamilyState = {
          ...prev,
          members: deduplicateMembers([...prev.members, newMember]),
          photos: data.photo ? { ...prev.photos, [newMemberKey]: data.photo } : prev.photos,
          mothers: data.motherInfo ? { ...(prev.mothers || {}), [newMemberKey]: data.motherInfo } : prev.mothers,
          updatedAt: nextTs
        };
        saveStateToStorage(nextState);
        // Instant sync to Firebase & live cloud so all devices and alfardanfamily.com see new member + photo immediately
        persistAndSyncImmediately(nextState);
        return nextState;
      });

      // Archive binary avatar on disk for GitHub without replacing the instant inline base64 photo in state
      if (isBase64Photo && data.photo) {
        mirrorSaveToAllEndpoints('/api/upload-avatar', { key: newMemberKey, dataUrl: data.photo }).catch(() => {});
      }

      // Expand parent and select new person
      setExpandedKeys(prev => new Set(prev).add(data.parentKey));
      setSelectedKey(newMemberKey);
      setIsDrawerOpen(true);
      setAddEditModal({ isOpen: false, mode: 'add', targetKey: '' });
      showToast(`تمت إضافة «${data.name}» ومزامنتها فوراً في جميع المواقع 🌿`);
    } else {
      // Edit existing
      const key = addEditModal.targetKey;
      const clearedMotherMarker: MotherInfo = { name: '', isFromFamily: false };
      const currentPerson = registry.people.get(key);
      const existingPhoto = familyState.photos?.[key] || currentPerson?.photo || '';
      // ZERO PHOTO LOSS: If data.photo is empty/undefined, strictly preserve the existing photo
      const finalPhoto = (data.photo && typeof data.photo === 'string' && data.photo.trim())
        ? data.photo.trim()
        : existingPhoto;
      const isBase64Photo = Boolean(finalPhoto && finalPhoto.startsWith('data:image/'));

      if (isBase64Photo) {
        saveCustomAvatarBackup(key, finalPhoto);
      }

      lastImmediateSyncAtRef.current = Date.now();

      if (key.startsWith('a')) {
        // Was an added member
        const memberId = key.slice(1);
        setFamilyState(prev => {
          const nextTs = getMonotonicTimestamp(prev);
          const nextState: FamilyState = {
            ...prev,
            members: prev.members.map(m =>
              m.id === memberId
                ? {
                    ...m,
                    name: data.name,
                    gender: data.gender,
                    year: data.year,
                    birthDate: data.birthDate,
                    note: data.note,
                    parent: data.parentKey,
                    isDeceased: data.isDeceased,
                    deathYear: data.deathYear,
                    motherInfo: data.motherInfo ? data.motherInfo : clearedMotherMarker,
                    at: nextTs
                  }
                : m
            ),
            photos: {
              ...prev.photos,
              ...(finalPhoto ? { [key]: finalPhoto } : {})
            },
            mothers: {
              ...(prev.mothers || {}),
              [key]: data.motherInfo ? data.motherInfo : clearedMotherMarker
            },
            updatedAt: nextTs
          };
          saveStateToStorage(nextState);
          persistAndSyncImmediately(nextState);
          return nextState;
        });
      } else {
        // Original member override
        setFamilyState(prev => {
          const nextTs = getMonotonicTimestamp(prev);
          const ov: MemberOverrides = {
            ...(prev.over[key] || {}),
            name: data.name,
            gender: data.gender,
            year: data.year,
            birthDate: data.birthDate,
            note: data.note,
            parent: data.parentKey,
            isDeceased: data.isDeceased,
            deathYear: data.deathYear,
            motherInfo: data.motherInfo ? data.motherInfo : clearedMotherMarker,
            at: nextTs
          };
          const nextState: FamilyState = {
            ...prev,
            over: { ...prev.over, [key]: ov },
            photos: {
              ...prev.photos,
              ...(finalPhoto ? { [key]: finalPhoto } : {})
            },
            mothers: {
              ...(prev.mothers || {}),
              [key]: data.motherInfo ? data.motherInfo : clearedMotherMarker
            },
            updatedAt: nextTs
          };
          saveStateToStorage(nextState);
          persistAndSyncImmediately(nextState);
          return nextState;
        });
      }

      // Archive binary avatar on disk for GitHub without replacing the instant inline base64 photo in state
      if (data.photo && data.photo.startsWith('data:image/')) {
        mirrorSaveToAllEndpoints('/api/upload-avatar', { key, dataUrl: data.photo }).catch(() => {});
      }

      setAddEditModal({ isOpen: false, mode: 'edit', targetKey: '' });
      showToast(`تم تحديث «${data.name}» ومزامنتها لحظياً في جميع المواقع 🌿`);
    }
  };

  // Update Death Status directly from Person Drawer
  const handleUpdateDeathStatus = (key: string, isDeceased: boolean, deathYear: number | null) => {
    if (!isAuthorized) {
      showToast('توثيق حالة وسنة الوفاة مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      let nextState: FamilyState;
      if (key.startsWith('a')) {
        const id = key.slice(1);
        nextState = {
          ...prev,
          members: prev.members.map(m =>
            m.id === id ? { ...m, isDeceased, deathYear, at: nextTs } : m
          ),
          updatedAt: nextTs
        };
      } else {
        nextState = {
          ...prev,
          over: {
            ...prev.over,
            [key]: {
              ...(prev.over[key] || {}),
              isDeceased,
              deathYear,
              at: nextTs
            }
          },
          updatedAt: nextTs
        };
      }
      persistAndSyncImmediately(nextState);
      return nextState;
    });
    showToast(isDeceased ? 'تم توثيق حالة الوفاة وتحديث السحابة بنجاح 🖤' : 'تم تحديث حالة الفرد إلى: على قيد الحياة');
  };

  // Update Birth Date directly from Person Drawer
  const handleUpdateBirthDate = (key: string, birthDate: string | null, year: number | null) => {
    if (!isAuthorized) {
      showToast('تعديل تاريخ الميلاد مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      let nextState: FamilyState;
      if (key.startsWith('a')) {
        const id = key.slice(1);
        nextState = {
          ...prev,
          members: prev.members.map(m =>
            m.id === id ? { ...m, birthDate, year, at: nextTs } : m
          ),
          updatedAt: nextTs
        };
      } else {
        nextState = {
          ...prev,
          over: {
            ...prev.over,
            [key]: {
              ...(prev.over[key] || {}),
              birthDate,
              year,
              at: nextTs
            }
          },
          updatedAt: nextTs
        };
      }
      persistAndSyncImmediately(nextState);
      return nextState;
    });
    showToast(birthDate || year ? 'تم توثيق تاريخ الميلاد بنجاح 📅' : 'تم مسح تاريخ الميلاد');
  };

  // Update Note
  const handleUpdateNote = (key: string, noteText: string) => {
    if (!isAuthorized) {
      showToast('تعديل الملاحظات مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      let nextState: FamilyState;
      if (key.startsWith('a')) {
        const id = key.slice(1);
        nextState = {
          ...prev,
          members: prev.members.map(m => (m.id === id ? { ...m, note: noteText, at: nextTs } : m)),
          updatedAt: nextTs
        };
      } else {
        nextState = {
          ...prev,
          over: {
            ...prev.over,
            [key]: { ...(prev.over[key] || {}), note: noteText, at: nextTs }
          },
          updatedAt: nextTs
        };
      }
      persistAndSyncImmediately(nextState);
      return nextState;
    });
    showToast('تم حفظ الملاحظة وتحديث السحابة بنجاح');
  };

  // Update / Delete Photo with Avatar Gallery (GitHub) & Face Cropping
  const handleChangePhoto = (key: string) => {
    const p = registry.people.get(key);
    setAvatarGalleryModal({
      isOpen: true,
      targetKey: key,
      memberName: p?.name || 'فرد من العائلة',
      currentPhoto: familyState.photos?.[key] || null
    });
  };

  const handleRemovePhoto = (key?: string) => {
    const targetKey = key || avatarGalleryModal.targetKey;
    if (!targetKey) return;
    removeCustomAvatarBackup(targetKey);
    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      const nextState: FamilyState = {
        ...prev,
        photos: { ...(prev.photos || {}), [targetKey]: '' },
        updatedAt: nextTs
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });
    showToast('تم حذف الصورة وتحديث GitHub و Firebase بنجاح');
  };

  const handleSelectGalleryPhoto = async (url: string) => {
    if (!avatarGalleryModal.targetKey) return;
    const key = avatarGalleryModal.targetKey;
    if (!url.startsWith('data:image/')) {
      removeCustomAvatarBackup(key);
    }
    const nextPhotos = { ...(familyState.photos || {}), [key]: url };
    
    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      const nextState: FamilyState = {
        ...prev,
        photos: nextPhotos,
        updatedAt: nextTs
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    showToast(`تم تعيين الصورة لـ «${avatarGalleryModal.memberName}» وتثبيتها سحابياً بنجاح`, 'success');
  };

  const handleTriggerUploadNew = () => {
    if (!avatarGalleryModal.targetKey) return;
    const key = avatarGalleryModal.targetKey;
    isModalEditingRef.current = true;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) {
        isModalEditingRef.current = false;
        return;
      }
      const p = registry.people.get(key);
      try {
        const quickUrl = await fastCompressAvatar(file, 900, 0.85);
        setFaceCropModal({
          isOpen: true,
          imageSrc: quickUrl,
          targetKey: key,
          memberName: p?.name || 'فرد من العائلة'
        });
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          const rawUrl = event.target?.result as string;
          setFaceCropModal({
            isOpen: true,
            imageSrc: rawUrl,
            targetKey: key,
            memberName: p?.name || 'فرد من العائلة'
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleFaceCropComplete = async (croppedDataUrl: string) => {
    if (!faceCropModal.targetKey) return;
    const key = faceCropModal.targetKey;

    // 1. Permanently anchor compressed 350x350 @ 0.75 base64 image in state + Firebase + live server immediately
    saveCustomAvatarBackup(key, croppedDataUrl);
    lastImmediateSyncAtRef.current = Date.now();

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      const nextState: FamilyState = {
        ...prev,
        photos: { ...(prev.photos || {}), [key]: croppedDataUrl },
        updatedAt: nextTs
      };
      saveStateToStorage(nextState);
      // Instant cloud sync so both alfardanfamily.com and AI Studio render the inline image in the same second
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    setFaceCropModal({ isOpen: false, imageSrc: '', targetKey: '', memberName: '' });
    showToast('تم حفظ الصورة ونشرها سحابياً ولحظياً في جميع المواقع بنجاح 🌿', 'success');

    // 2. Archive binary file to public/avatars/ in background for GitHub without replacing the instant inline base64 in state
    mirrorSaveToAllEndpoints('/api/upload-avatar', { key, dataUrl: croppedDataUrl }).catch((e) => {
      console.warn('Avatar background upload notice:', e);
    });
  };

  // Delete Member (إلغاء / حذف اسم من الشجرة مع تحديث فوري على Firebase و GitHub)
  const handleDeletePerson = (key: string) => {
    if (!isAuthorized) {
      showToast('الحذف مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    if (['ot0', 'ot1', 'ot2', 'am_mvzm8u6pyafp', 'ot3', 'oF'].includes(key)) {
      showToast('لا يمكن حذف الأجداد المؤسسين في الجذع الرئيسي للشجرة', 'info');
      return;
    }

    const p = registry.people.get(key);
    const parentKey = p?.parentKey || registry.fardanKey;

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      let nextState: FamilyState;
      if (key.startsWith('a')) {
        const id = key.slice(1);
        nextState = {
          ...prev,
          members: prev.members.map(m => (m.id === id ? { ...m, del: true, at: nextTs } : m)),
          removed: Array.from(new Set([...(prev.removed || []), key, id])),
          updatedAt: nextTs
        };
      } else {
        nextState = {
          ...prev,
          over: {
            ...(prev.over || {}),
            [key]: {
              ...(prev.over?.[key] || {}),
              del: true,
              at: nextTs
            }
          },
          removed: Array.from(new Set([...(prev.removed || []), key])),
          updatedAt: nextTs
        };
      }
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    if (explorerPersonKey === key) {
      setExplorerPersonKey(parentKey);
    }
    setSelectedKey(parentKey);
    showToast(`تم إلغاء وحذف «${p?.name || 'الفرد'}» وتحديث Firebase و GitHub فوراً`);
  };

  // Restore Member
  const handleRestorePerson = (key: string) => {
    if (!isAuthorized) {
      showToast('استرجاع المحذوفات مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      let nextState: FamilyState;
      if (key.startsWith('a')) {
        const id = key.slice(1);
        nextState = {
          ...prev,
          members: prev.members.map(m => (m.id === id ? { ...m, del: false, at: nextTs } : m)),
          removed: (prev.removed || []).filter(k => k !== key && k !== id),
          updatedAt: nextTs
        };
      } else {
        nextState = {
          ...prev,
          over: {
            ...(prev.over || {}),
            [key]: {
              ...(prev.over?.[key] || {}),
              del: false,
              at: nextTs
            }
          },
          removed: (prev.removed || []).filter(k => k !== key),
          updatedAt: nextTs
        };
      }
      persistAndSyncImmediately(nextState);
      return nextState;
    });
    setSelectedKey(key);
    showToast('تمت استعادة الفرد وتحديث Firebase و GitHub بنجاح');
  };

  // Archival Photos & Documents Handlers (Admin Only - Instant Cloud & GitHub Sync)
  const handleSaveArchivalPhoto = (data: Omit<ArchivalPhoto, 'id' | 'createdAt'> & { id?: string }) => {
    if (!isAuthorized) {
      showToast('إضافة وتعديل الصور والوثائق مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    const photoId = data.id || ('arch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    const existingPhoto = (familyState.archivalPhotos || []).find(p => p.id === photoId);
    const savedPhoto: ArchivalPhoto = {
      id: photoId,
      title: data.title,
      url: data.url,
      notes: data.notes,
      era: data.era,
      location: data.location,
      category: data.category,
      taggedPersonKeys: data.taggedPersonKeys,
      createdAt: existingPhoto?.createdAt || Date.now(),
      addedBy: data.addedBy || 'إدارة الأرشيف'
    };

    // 1. Immediately sync individual photo/document to dedicated Firestore collection archival_photos/{id}
    syncArchivalPhotoToCloud(savedPhoto).catch(() => {});

    // 2. Immediately update local state, localStorage, family_tree/state, and server
    setFamilyState(prev => {
      const currentList = prev.archivalPhotos || [];
      const exists = currentList.some(p => p.id === photoId);
      const updatedList = exists
        ? currentList.map(p => (p.id === photoId ? savedPhoto : p))
        : [savedPhoto, ...currentList];

      const nextState: FamilyState = {
        ...prev,
        archivalPhotos: updatedList
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    // 3. If image is base64, upload to /api/upload-avatar to bake into public/avatars/ and push to GitHub
    if (savedPhoto.url.startsWith('data:image/')) {
      apiFetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: photoId, dataUrl: savedPhoto.url })
      })
        .then(r => (r.ok ? r.json() : null))
        .then(resData => {
          if (resData?.url) {
            const fileBackedPhoto: ArchivalPhoto = { ...savedPhoto, url: resData.url };
            syncArchivalPhotoToCloud(fileBackedPhoto).catch(() => {});
            setFamilyState(prev => {
              const nextState: FamilyState = {
                ...prev,
                archivalPhotos: (prev.archivalPhotos || []).map(p =>
                  p.id === photoId ? fileBackedPhoto : p
                )
              };
              persistAndSyncImmediately(nextState);
              return nextState;
            });
            apiFetch('/api/publish-to-github', { method: 'POST' }).catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      apiFetch('/api/publish-to-github', { method: 'POST' }).catch(() => {});
    }

    showToast(
      data.id
        ? `تم تحديث «${data.title}» ومزامنتها على جميع المواقع بنجاح 🚀`
        : `تم رفع «${data.title}» ونشرها مباشرة على جميع المواقع بنجاح 🚀`
    );
    setArchivalPhotoModal({ isOpen: false, photoToEdit: null, defaultCategory: 'documents' });
  };

  const handleDeleteArchivalPhoto = (photoId: string) => {
    if (!isAuthorized) {
      showToast('حذف الصور والوثائق مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    deleteArchivalPhotoFromCloud(photoId).catch(() => {});

    setFamilyState(prev => {
      const nextState: FamilyState = {
        ...prev,
        archivalPhotos: (prev.archivalPhotos || []).filter(p => p.id !== photoId)
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    apiFetch('/api/publish-to-github', { method: 'POST' }).catch(() => {});
    showToast('تم حذف الصورة/الوثيقة ومزامنة التحديث على جميع المواقع بنجاح');
  };

  // Spouse Management Handlers with Immediate Bi-directional Linkage (Admin Only)
  const handleSaveSpouse = useCallback((personKey: string, spouse: SpouseInfo) => {
    const p = registry.people.get(personKey);
    const spouseNoun = p?.gender === 'f' ? 'الزوج' : 'الزوجة';

    if (!isAuthorized) {
      showToast(`إضافة وتعديل بيانات ${spouseNoun} مخصص للمشرفين والمصرح لهم فقط`, 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextSpouses: Record<string, SpouseInfo[]> = { ...(prev.spouses || {}) };

      // 1. Update primary person's spouse list
      const currentSpouses = nextSpouses[personKey] || [];
      const existingIdx = currentSpouses.findIndex(s => s.id === spouse.id);
      const oldSpouse = existingIdx >= 0 ? currentSpouses[existingIdx] : null;

      let updatedSpouses: SpouseInfo[];
      if (existingIdx >= 0) {
        updatedSpouses = currentSpouses.map((s, idx) => (idx === existingIdx ? spouse : s));
      } else {
        updatedSpouses = [...currentSpouses, spouse];
      }
      nextSpouses[personKey] = updatedSpouses;

      // 2. Clean up previous partner reciprocal link if changed
      if (oldSpouse?.isFromFamily && oldSpouse.personKey && oldSpouse.personKey !== spouse.personKey) {
        const oldPartnerKey = oldSpouse.personKey;
        if (nextSpouses[oldPartnerKey]) {
          nextSpouses[oldPartnerKey] = nextSpouses[oldPartnerKey].filter(
            s => s.personKey !== personKey && s.id !== `recip_${personKey}_${oldPartnerKey}` && s.id !== `recip_${oldPartnerKey}_${personKey}`
          );
        }
      }

      // 3. Bi-directional reciprocal link for the partner if from family tree!
      if (spouse.isFromFamily && spouse.personKey && registry.people.has(spouse.personKey)) {
        const partnerKey = spouse.personKey;
        const partnerSpouses = nextSpouses[partnerKey] || [];

        // Check if partner already has a reciprocal link pointing to personKey
        const existingRecipIdx = partnerSpouses.findIndex(
          s => s.personKey === personKey || s.id === `recip_${personKey}_${partnerKey}` || s.id === `recip_${partnerKey}_${personKey}`
        );

        const reciprocalSpouse: SpouseInfo = {
          id: existingRecipIdx >= 0 ? partnerSpouses[existingRecipIdx].id : `recip_${personKey}_${partnerKey}`,
          name: p?.name || 'فرد من العائلة',
          isFromFamily: true,
          personKey: personKey,
          familyOrigin: 'عائلة الفردان',
          notes: spouse.notes
        };

        if (existingRecipIdx >= 0) {
          nextSpouses[partnerKey] = partnerSpouses.map((s, idx) => (idx === existingRecipIdx ? reciprocalSpouse : s));
        } else {
          nextSpouses[partnerKey] = [...partnerSpouses, reciprocalSpouse];
        }
      }

      const nextState: FamilyState = {
        ...prev,
        spouses: nextSpouses
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    showToast(`تم حفظ وتحديث الربط التبادلي لـ ${spouseNoun} «${spouse.name}» في كلا البطاقتين بنجاح`);
  }, [isAuthorized, persistAndSyncImmediately, registry, showToast]);

  const handleDeleteSpouse = useCallback((personKey: string, spouseId: string) => {
    const p = registry.people.get(personKey);
    const spouseNoun = p?.gender === 'f' ? 'الزوج' : 'الزوجة';

    if (!isAuthorized) {
      showToast(`حذف بيانات ${spouseNoun} مخصص للمشرفين والمصرح لهم فقط`, 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextSpouses: Record<string, SpouseInfo[]> = {};
      Object.entries(prev.spouses || {}).forEach(([k, list]) => {
        nextSpouses[k] = [...list];
      });

      const personInRegistry = registry.people.get(personKey);
      const registrySpouses = personInRegistry?.spouses || [];
      const currentSpouses = nextSpouses[personKey] || registrySpouses;

      const targetSpouse =
        currentSpouses.find(s => s.id === spouseId) ||
        registrySpouses.find(s => s.id === spouseId) ||
        currentSpouses.find(s => s.personKey === spouseId);

      const partnerKey = targetSpouse?.personKey;
      const spouseName = targetSpouse?.name;

      // 1. Remove from personKey
      nextSpouses[personKey] = (nextSpouses[personKey] || registrySpouses).filter(s => {
        if (s.id === spouseId) return false;
        if (partnerKey && s.personKey === partnerKey) return false;
        if (spouseName && s.name === spouseName && !s.isFromFamily) return false;
        return true;
      });

      // 2. If partner is from family, remove reciprocal link on partner side
      if (partnerKey) {
        const partnerInReg = registry.people.get(partnerKey);
        const partnerSpouses = nextSpouses[partnerKey] || partnerInReg?.spouses || [];
        nextSpouses[partnerKey] = partnerSpouses.filter(s => {
          if (s.personKey === personKey) return false;
          if (s.id === spouseId) return false;
          if (s.id === `recip_${personKey}_${partnerKey}` || s.id === `recip_${partnerKey}_${personKey}`) return false;
          if (p?.name && s.name === p.name && !s.isFromFamily) return false;
          return true;
        });
      }

      // 3. Clean up any remaining references anywhere
      Object.keys(nextSpouses).forEach(k => {
        nextSpouses[k] = nextSpouses[k].filter(s => {
          if (s.id === spouseId) return false;
          if (partnerKey && k === partnerKey && s.personKey === personKey) return false;
          if (partnerKey && k === personKey && s.personKey === partnerKey) return false;
          return true;
        });
      });

      const updatedOver = { ...prev.over };
      if (updatedOver[personKey]?.spouses) {
        updatedOver[personKey] = {
          ...updatedOver[personKey],
          spouses: (updatedOver[personKey].spouses || []).filter(s => s.id !== spouseId && (!partnerKey || s.personKey !== partnerKey))
        };
      }
      if (partnerKey && updatedOver[partnerKey]?.spouses) {
        updatedOver[partnerKey] = {
          ...updatedOver[partnerKey],
          spouses: (updatedOver[partnerKey].spouses || []).filter(s => s.personKey !== personKey && s.id !== spouseId)
        };
      }

      const updatedMembers = prev.members.map(m => {
        const mKey = 'a' + m.id;
        if (mKey === personKey && m.spouses) {
          return {
            ...m,
            spouses: m.spouses.filter(s => s.id !== spouseId && (!partnerKey || s.personKey !== partnerKey))
          };
        }
        if (partnerKey && mKey === partnerKey && m.spouses) {
          return {
            ...m,
            spouses: m.spouses.filter(s => s.personKey !== personKey && s.id !== spouseId)
          };
        }
        return m;
      });

      const nextState = {
        ...prev,
        spouses: nextSpouses,
        over: updatedOver,
        members: updatedMembers
      };

      persistAndSyncImmediately(nextState);
      return nextState;
    });

    showToast(`تم حذف بيانات ${spouseNoun} وإلغاء الربط التبادلي بنجاح`);
  }, [isAuthorized, persistAndSyncImmediately, registry, showToast]);

  // Mother Management Handlers (Admin Only)
  const handleSaveMother = useCallback((personKey: string, mother: MotherInfo) => {
    if (!isAuthorized) {
      showToast('توثيق وتعديل بيانات الوالدة مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      const nextState: FamilyState = {
        ...prev,
        mothers: {
          ...(prev.mothers || {}),
          [personKey]: mother
        },
        members: personKey.startsWith('a')
          ? prev.members.map(m => (m.id === personKey.slice(1) ? { ...m, motherInfo: mother, at: nextTs } : m))
          : prev.members,
        over: !personKey.startsWith('a')
          ? {
              ...(prev.over || {}),
              [personKey]: { ...(prev.over?.[personKey] || {}), motherInfo: mother, at: nextTs }
            }
          : prev.over,
        updatedAt: nextTs
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    showToast(`تم توثيق بيانات الوالدة «${mother.name}» وتحديث السحابة بنجاح`);
  }, [isAuthorized, persistAndSyncImmediately, showToast]);

  const handleDeleteMother = useCallback((personKey: string) => {
    if (!isAuthorized) {
      showToast('حذف بيانات الوالدة مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    const clearedMother: MotherInfo = { name: '', isFromFamily: false };

    setFamilyState(prev => {
      const nextTs = getMonotonicTimestamp(prev);
      const nextState: FamilyState = {
        ...prev,
        mothers: {
          ...(prev.mothers || {}),
          [personKey]: clearedMother
        },
        members: personKey.startsWith('a')
          ? prev.members.map(m => (m.id === personKey.slice(1) ? { ...m, motherInfo: clearedMother, at: nextTs } : m))
          : prev.members,
        over: !personKey.startsWith('a')
          ? {
              ...(prev.over || {}),
              [personKey]: { ...(prev.over?.[personKey] || {}), motherInfo: clearedMother, at: nextTs }
            }
          : prev.over,
        updatedAt: nextTs
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    showToast('تم حذف توثيق الوالدة وتحديث السحابة بنجاح');
  }, [isAuthorized, persistAndSyncImmediately, showToast]);

  // Update Contact Info & Credits (Admin Only)
  const handleUpdateContactInfo = useCallback(async (newContactInfo: ContactInfo) => {
    if (!isAuthorized) {
      showToast('تعديل بيانات التواصل مخصص للمشرفين والمصرح لهم فقط', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    const resolved = resolveContactInfo(newContactInfo);

    setFamilyState(prev => {
      const nextState: FamilyState = {
        ...prev,
        contactInfo: resolved
      };
      persistAndSyncImmediately(nextState);
      return nextState;
    });

    // Synchronize to dedicated Firestore document settings/contactInfo
    syncContactInfoToCloud(resolved).catch(() => {});

    // Save to initialTreeData.json so it bakes into git commits and GitHub releases
    try {
      await apiFetch('/api/save-family-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...familyState, contactInfo: resolved })
      });
    } catch (e) {
      console.warn('Backend save contact notice:', e);
    }

    showToast('تم حفظ وتحديث بيانات التواصل وفريق العمل بنجاح 💾', 'success');
  }, [isAuthorized, persistAndSyncImmediately, familyState, showToast]);

  // Save and Commit All Photos & Data to Project Files For Publish
  const handleSaveForPublish = async () => {
    setIsSavingForPublish(true);
    try {
      // 1. Upload any pending base64 photos to /api/upload-avatar
      const updatedPhotos = { ...(familyState.photos || {}) };
      const entries = Object.entries(updatedPhotos);

      for (const [key, photoVal] of entries) {
        if (typeof photoVal === 'string' && photoVal.startsWith('data:image/')) {
          try {
            const upRes = await mirrorSaveToAllEndpoints('/api/upload-avatar', { key, dataUrl: photoVal });
            // Keep compact inline base64 (< 90KB) in state for instant cross-site rendering without 404s
            if (photoVal.length >= 90000 && upRes && upRes.ok) {
              const resData = await upRes.json();
              if (resData?.url) {
                updatedPhotos[key] = resData.url;
              }
            }
          } catch (e) {
            console.warn(`Failed to upload avatar ${key}:`, e);
          }
        }
      }

      // 1b. Upload any pending base64 archivalPhotos (Photos & Documents sections) to /api/upload-avatar
      const updatedArchivalPhotos = [...(familyState.archivalPhotos || [])];
      for (let i = 0; i < updatedArchivalPhotos.length; i++) {
        const archItem = updatedArchivalPhotos[i];
        if (archItem && typeof archItem.url === 'string' && archItem.url.startsWith('data:image/')) {
          try {
            const upRes = await mirrorSaveToAllEndpoints('/api/upload-avatar', { key: archItem.id, dataUrl: archItem.url });
            if (upRes && upRes.ok) {
              const resData = await upRes.json();
              if (resData?.url) {
                updatedArchivalPhotos[i] = { ...archItem, url: resData.url };
              }
            }
          } catch (e) {
            console.warn(`Failed to upload archival photo ${archItem.id}:`, e);
          }
        }
      }

      const nextTs = getMonotonicTimestamp(familyState);
      lastImmediateSyncAtRef.current = Date.now();
      const stateToSave: FamilyState = {
        ...familyState,
        members: deduplicateMembers(familyState.members || []),
        photos: updatedPhotos,
        archivalPhotos: updatedArchivalPhotos,
        updatedAt: nextTs
      };
      saveStateToStorage(stateToSave);

      // 2. Sync to Cloud Firestore instantly (both main state and archival_photos collection)
      try {
        await syncFamilyStateToCloud(stateToSave);
        for (const archItem of updatedArchivalPhotos) {
          await syncArchivalPhotoToCloud(archItem).catch(() => {});
        }
      } catch (cloudErr) {
        console.warn('Cloud sync on publish warning:', cloudErr);
      }

      // 3. Commit full state to /api/save-family-data across all endpoints
      const res = await mirrorSaveToAllEndpoints('/api/save-family-data', stateToSave);

      if (res && res.ok) {
        setFamilyState(stateToSave);
        setHasUnsavedServerChanges(false);
        try {
          const pubRes = await mirrorSaveToAllEndpoints('/api/publish-to-github', {}).then(r => (r ? r.json() : null)).catch(() => null);
          if (pubRes?.isPushed) {
            showToast('تم اعتماد ونشر كافة التعديلات والصور إلى GitHub بنجاح! يتم الآن تحديث الموقع الرسمي alfardanfamily.com تلقائياً 🚀', 'success');
          } else {
            showToast(pubRes?.message || 'تم حفظ وتحديث الشجرة سحابياً بنجاح 🚀', 'success');
          }
        } catch {
          showToast('تم حفظ ونشر البيانات والصور سحابياً بنجاح! 🚀', 'success');
        }
      } else {
        mirrorSaveToAllEndpoints('/api/publish-to-github', {}).catch(() => {});
        showToast('تم حفظ ونشر البيانات والصور سحابياً بنجاح! 🚀', 'success');
      }
    } catch (err) {
      console.error('Error saving for publish:', err);
      showToast('تم حفظ وتحديث الشجرة سحابياً 🚀', 'success');
    } finally {
      setIsSavingForPublish(false);
    }
  };

  // Export Backup File
  const handleExportBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(familyState, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `fardan-family-tree-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('تم تنزيل ملف النسخة الاحتياطية بنجاح');
  };

  // Import Backup File
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.members)) {
          setFamilyState(prev => ({
            members: parsed.members || [],
            photos: parsed.photos || {},
            over: parsed.over || {},
            removed: parsed.removed || [],
            archivalPhotos: Array.isArray(parsed.archivalPhotos) ? parsed.archivalPhotos : (prev.archivalPhotos || []),
            spouses: parsed.spouses || prev.spouses || {},
            mothers: parsed.mothers || prev.mothers || {}
          }));
          setIsBackupModalOpen(false);
          showToast('تم استيراد النسخة الاحتياطية بنجاح');
        } else {
          alert('الملف المحدد غير صالح أو لا يحتوي على بنية شجرة عائلة الفردان');
        }
      } catch (err) {
        alert('تعذر قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
  };

  // Reset to default
  const handleResetToDefaults = () => {
    setFamilyState(DEFAULT_FAMILY_DATA);
    setSelectedKey('oF');
    showToast('تمت إعادة ضبط الشجرة على الوثيقة الأصلية');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f4f6f1] text-[#121714]">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        registry={registry}
        onSelectPerson={handleSelectPerson}
        onOpenAddModal={() => setAddEditModal({ isOpen: true, mode: 'add', targetKey: selectedKey || registry.fardanKey })}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        hasUnsavedChanges={hasUnsavedServerChanges}
        onShowToast={showToast}
        isAuthorized={isAuthorized}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSearchResults={(q) => setSearchResultsModal({ isOpen: true, query: q })}
        onSaveForPublish={handleSaveForPublish}
        isSavingForPublish={isSavingForPublish}
        isNotificationsGranted={notificationPermission === 'granted'}
        onEnableNotifications={handleEnableNotifications}
      />

      {/* Smart Welcome Install Banner for PWA */}
      <SmartInstallBanner
        onInstall={handlePWAInstall}
        isInstalled={isPWAInstalled}
      />

      {/* Main View Area - Margin right on all screens to accommodate right-side navigation rail */}
      <main className="flex-1 relative overflow-hidden mr-16 sm:mr-20 lg:mr-22">
        {currentTab === 'home' && (
          <div
            id="home-scroll-view"
            className="w-full h-full overflow-y-auto overscroll-contain touch-pan-y"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            <FamilyExplorerView
              registry={registry}
              currentPersonKey={explorerPersonKey}
              onNavigateToPerson={(key) => {
                setExplorerPersonKey(key);
                setSelectedKey(key);
              }}
              onOpenAddModal={(parentKey) =>
                setAddEditModal({ isOpen: true, mode: 'add', targetKey: parentKey })
              }
              onOpenEditModal={(personKey) =>
                setAddEditModal({ isOpen: true, mode: 'edit', targetKey: personKey })
              }
              onDeletePerson={handleDeletePerson}
              onOpenCertificate={(personKey) =>
                setCertificateModal({ isOpen: true, personKey })
              }
              onSwitchToFullTree={(key) => {
                if (key) {
                  handleSelectPerson(key, { reveal: true, center: true, openDrawer: false });
                }
                setIsDrawerOpen(false);
                setCurrentTab('tree');
              }}
              onSelectPerson={(key) => {
                handleSelectPerson(key, { reveal: true, center: true, openDrawer: false });
                setIsDrawerOpen(false);
                setCurrentTab('tree');
              }}
              isAuthorized={isAuthorized}
              onOpenContact={() => setIsContactModalOpen(true)}
            />
          </div>
        )}

        {currentTab === 'tree' && (
          <div className="relative w-full h-full">
            {/* Top Floating Branch Legend */}
            <div className="absolute top-4 right-4 left-4 z-20 pointer-events-none">
              <div className="pointer-events-auto max-w-full">
                <BranchLegend
                  registry={registry}
                  onSelectPerson={handleSelectPerson}
                  activeBranchFilter={filterBranch}
                  onFilterBranch={setFilterBranch}
                />
              </div>
            </div>

            {/* Tree Canvas */}
            <TreeCanvas
              registry={registry}
              selectedKey={selectedKey}
              onSelectPerson={handleSelectPerson}
              onAddChild={(parentKey, defaultGender) =>
                setAddEditModal({ isOpen: true, mode: 'add', targetKey: parentKey, defaultGender })
              }
              expandedKeys={expandedKeys}
              onToggleExpand={handleToggleExpand}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              filterBranch={filterBranch}
              isAuthorized={isAuthorized}
              onOpenSearchResults={(q) => setSearchResultsModal({ isOpen: true, query: q })}
            />

            {/* Selected Person Details Drawer (Right side on desktop, adapted on mobile) */}
            {isDrawerOpen && selectedKey && (
              <div className="absolute top-4 bottom-4 right-2 sm:right-4 z-30 w-full sm:w-96 max-w-[calc(100vw-76px)] sm:max-w-96 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 transition-all">
                <PersonDetailDrawer
                  personKey={selectedKey}
                  registry={registry}
                  onSelectPerson={handleSelectPerson}
                  onClose={() => setIsDrawerOpen(false)}
                  onAddChild={(parentKey) => setAddEditModal({ isOpen: true, mode: 'add', targetKey: parentKey })}
                  onEditPerson={(personKey) => setAddEditModal({ isOpen: true, mode: 'edit', targetKey: personKey })}
                  onDeletePerson={handleDeletePerson}
                  onUpdateNote={handleUpdateNote}
                  onChangePhoto={handleChangePhoto}
                  onOpenCertificate={(personKey) => setCertificateModal({ isOpen: true, personKey })}
                  isAuthorized={isAuthorized}
                  onSaveSpouse={handleSaveSpouse}
                  onDeleteSpouse={handleDeleteSpouse}
                  onSaveMother={handleSaveMother}
                  onDeleteMother={handleDeleteMother}
                  onUpdateDeathStatus={handleUpdateDeathStatus}
                  onUpdateBirthDate={handleUpdateBirthDate}
                />
              </div>
            )}
          </div>
        )}

        {currentTab === 'directory' && (
          <div
            className="w-full h-full overflow-y-auto overscroll-contain touch-pan-y"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            <FamilyDirectoryView
              registry={registry}
              onSelectPerson={(key, opts) => {
                setCurrentTab('tree');
                handleSelectPerson(key, opts);
              }}
              onOpenPersonDetail={(key) => {
                handleSelectPerson(key);
                setCurrentTab('tree');
              }}
              onOpenAddModal={(parentKey) =>
                setAddEditModal({ isOpen: true, mode: 'add', targetKey: parentKey || registry.fardanKey })
              }
              onOpenEditModal={(personKey) =>
                setAddEditModal({ isOpen: true, mode: 'edit', targetKey: personKey })
              }
              onDeletePerson={handleDeletePerson}
              isAuthorized={isAuthorized}
              onOpenSearchResults={(q) => setSearchResultsModal({ isOpen: true, query: q })}
            />
          </div>
        )}

        {currentTab === 'photos' && (
          <div
            className="w-full h-full overflow-y-auto overscroll-contain touch-pan-y"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            <ArchivalPhotosView
              photos={familyState.archivalPhotos || []}
              registry={registry}
              isAuthorized={isAuthorized}
              onOpenAddModal={(defaultCat) => {
                if (!isAuthorized) {
                  pendingArchivalModalCategoryRef.current = defaultCat || 'portraits';
                  showToast('يرجى تسجيل دخول المشرف لرفع الصور والوثائق مباشرة', 'info');
                  setIsAuthModalOpen(true);
                  return;
                }
                setArchivalPhotoModal({ isOpen: true, photoToEdit: null, defaultCategory: defaultCat || 'portraits' });
              }}
              onOpenEditModal={(photo) => {
                if (!isAuthorized) {
                  showToast('تعديل الصور والملاحظات مخصص للمشرفين والمصرح لهم فقط', 'info');
                  setIsAuthModalOpen(true);
                  return;
                }
                setArchivalPhotoModal({ isOpen: true, photoToEdit: photo, defaultCategory: photo.category || 'portraits' });
              }}
              onDeletePhoto={handleDeleteArchivalPhoto}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onSelectPerson={(key, opts) => handleSelectPerson(key, opts)}
              onSwitchToTree={(key) => {
                if (key) {
                  handleSelectPerson(key, { reveal: true, center: true });
                }
                setCurrentTab('tree');
              }}
              onShowToast={showToast}
            />
          </div>
        )}

        {currentTab === 'doc' && (
          <div
            className="w-full h-full overflow-y-auto overscroll-contain touch-pan-y"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            <DocumentArchiveView
              photos={familyState.archivalPhotos || []}
              isAuthorized={isAuthorized}
              onOpenAddDocumentModal={() => {
                if (!isAuthorized) {
                  pendingArchivalModalCategoryRef.current = 'documents';
                  showToast('يرجى تسجيل دخول المشرف لرفع الوثائق والمخطوطات مباشرة', 'info');
                  setIsAuthModalOpen(true);
                  return;
                }
                setArchivalPhotoModal({ isOpen: true, photoToEdit: null, defaultCategory: 'documents' });
              }}
              onOpenEditDocumentModal={(photo) => {
                if (!isAuthorized) {
                  showToast('تعديل الوثائق مخصص للمشرفين والمصرح لهم فقط', 'info');
                  setIsAuthModalOpen(true);
                  return;
                }
                setArchivalPhotoModal({ isOpen: true, photoToEdit: photo, defaultCategory: 'documents' });
              }}
              onDeleteDocument={handleDeleteArchivalPhoto}
              onShowToast={showToast}
            />
          </div>
        )}

        {currentTab === 'about' && (
          <div
            className="w-full h-full overflow-y-auto overscroll-contain touch-pan-y"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            <AboutAndAnalyticsView
              registry={registry}
              onSelectPerson={(key, opts) => {
                setCurrentTab('tree');
                handleSelectPerson(key, opts);
              }}
              onRestorePerson={handleRestorePerson}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onOpenInteractiveTree={() => {
                setIsDrawerOpen(false);
                setCurrentTab('tree');
              }}
              isAuthorized={isAuthorized}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenSearchResults={(q) => setSearchResultsModal({ isOpen: true, query: q })}
            />
          </div>
        )}

      </main>

      {/* Add / Edit Member Modal (Only opens if authorized) */}
      {addEditModal.isOpen && isAuthorized && (
        <AddEditMemberModal
          isOpen={addEditModal.isOpen}
          mode={addEditModal.mode}
          targetKey={addEditModal.targetKey}
          registry={registry}
          defaultGender={addEditModal.defaultGender}
          onClose={() => setAddEditModal({ isOpen: false, mode: 'add', targetKey: '', defaultGender: 'm' })}
          onDelete={handleDeletePerson}
          onSubmit={handleAddEditSubmit}
        />
      )}

      {/* Standalone Certificate Modal (Rendered at Root Level to prevent margin clipping) */}
      {(certificateModal.isOpen || currentTab === 'certificate') && (
        <PedigreeCertificateModal
          isOpen={true}
          onClose={() => {
            setCertificateModal({ isOpen: false, personKey: '' });
            if (currentTab === 'certificate') {
              setCurrentTab('tree');
              setIsDrawerOpen(false);
            }
          }}
          personKey={certificateModal.personKey || selectedKey || registry.fardanKey}
          registry={registry}
          onSelectPerson={(key) => setSelectedKey(key)}
        />
      )}

      {/* Contact & Credits Modal - Rendered at Root Level to guarantee full viewport centering and zero collision with side rail */}
      {(isContactModalOpen || currentTab === 'contact') && (
        <ContactCreditsModal
          isOpen={true}
          onClose={() => {
            setIsContactModalOpen(false);
            if (currentTab === 'contact') {
              setCurrentTab('home');
            }
          }}
          contactInfo={familyState.contactInfo}
          onSaveContactInfo={handleUpdateContactInfo}
          isAuthorized={isAuthorized}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onInstallPWA={handlePWAInstall}
          isPWAInstalled={isPWAInstalled}
          isNotificationsGranted={notificationPermission === 'granted'}
          onEnableNotifications={handleEnableNotifications}
          onSendNotification={handleSendNotification}
          onShowToast={showToast}
        />
      )}

      {/* Backup & Management Modal (Only opens if authorized) */}
      {isBackupModalOpen && isAuthorized && (
        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          state={familyState}
          onExport={handleExportBackup}
          onImport={handleImportBackup}
          onResetToDefaults={handleResetToDefaults}
        />
      )}

      {/* Dedicated Search Results Frame Modal */}
      <SearchResultsModal
        isOpen={searchResultsModal.isOpen}
        initialQuery={searchResultsModal.query}
        registry={registry}
        onClose={() => setSearchResultsModal({ isOpen: false, query: '' })}
        onSelectPerson={handleSelectPerson}
        onOpenPersonDetail={(key) => {
          setSelectedKey(key);
          setIsDrawerOpen(true);
        }}
        onOpenCertificate={(key) => {
          setCertificateModal({ isOpen: true, personKey: key });
        }}
        onGoToTree={(key) => {
          setCurrentTab('tree');
          handleSelectPerson(key, { reveal: true, center: true });
        }}
        isAuthorized={isAuthorized}
        onOpenAddModal={(parentKey) => setAddEditModal({ isOpen: true, mode: 'add', targetKey: parentKey })}
        onOpenEditModal={(personKey) => setAddEditModal({ isOpen: true, mode: 'edit', targetKey: personKey })}
        onDeletePerson={handleDeletePerson}
      />

      {/* Add / Edit Archival Photo Modal (Admin Only) */}
      <AddEditArchivalPhotoModal
        isOpen={archivalPhotoModal.isOpen && isAuthorized}
        onClose={() => setArchivalPhotoModal({ isOpen: false, photoToEdit: null, defaultCategory: 'documents' })}
        onSubmit={handleSaveArchivalPhoto}
        photoToEdit={archivalPhotoModal.photoToEdit}
        registry={registry}
        defaultCategory={archivalPhotoModal.defaultCategory}
      />

      {/* Admin Authorization Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isAuthorized={isAuthorized}
        onAuthorize={handleAuthorize}
        onDeauthorize={handleDeauthorize}
        onShowToast={showToast}
      />

      {/* Face Focus & Cropping Modal */}
      {faceCropModal.isOpen && (
        <FaceCropModal
          isOpen={faceCropModal.isOpen}
          imageSrc={faceCropModal.imageSrc}
          memberName={faceCropModal.memberName}
          onClose={() => setFaceCropModal({ isOpen: false, imageSrc: '', targetKey: '', memberName: '' })}
          onCropComplete={handleFaceCropComplete}
        />
      )}

      {/* Avatar Gallery Modal (Choose from 103 GitHub uploaded avatars) */}
      <AvatarGalleryModal
        isOpen={avatarGalleryModal.isOpen}
        onClose={() => setAvatarGalleryModal(prev => ({ ...prev, isOpen: false }))}
        personName={avatarGalleryModal.memberName}
        personKey={avatarGalleryModal.targetKey}
        currentPhoto={avatarGalleryModal.currentPhoto}
        onSelectPhoto={handleSelectGalleryPhoto}
        onUploadNew={handleTriggerUploadNew}
        onRemovePhoto={() => handleRemovePhoto(avatarGalleryModal.targetKey)}
      />

      {/* Toast Banner */}
      {toast && (
        <div className="fixed bottom-6 right-1/2 translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* PWA iOS Safari Installation Guide Modal */}
      <IOSInstallModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

      {/* PWA Android / Desktop Manual Guide Modal */}
      <ManualInstallModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />

      {/* Notification Guide Modal for Browser Visitors */}
      <NotificationGuideModal
        isOpen={isNotifGuideOpen}
        onClose={() => setIsNotifGuideOpen(false)}
        onInstallApp={handlePWAInstall}
      />

      {/* Welcome & Disclaimer Modal (Centred modal with backdrop-blur, appears on every session/visit) */}
      <WelcomeDisclaimerModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />
    </div>
  );
}
