import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { db, isFirestoreQuotaExhausted, tripFirestoreCircuitBreaker } from '../firebase/config';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

const NOTIFICATIONS_COLLECTION = collection(db, 'notifications');

/**
 * Check if browser supports Web Notifications and ServiceWorker
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if the user is running the app as an installed PWA (Standalone)
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Show a native system notification via the active ServiceWorker
 */
export async function showSystemNotification(
  title: string,
  body: string,
  url: string = '/'
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          dir: 'rtl',
          lang: 'ar',
          vibrate: [200, 100, 200],
          data: { url }
        } as NotificationOptions);
        return true;
      }
    }

    // Fallback if ServiceWorker showNotification is unavailable
    new Notification(title, {
      body,
      icon: '/logo.png',
      dir: 'rtl',
      lang: 'ar'
    });
    return true;
  } catch (err) {
    console.warn('Could not display system notification:', err);
    return false;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        localStorage.setItem('fardan_notifications_enabled', 'true');
      } catch {}

      // Send initial welcome notification to confirm setup
      await showSystemNotification(
        'شجرة عائلة الفردان',
        'تم تفعيل الإشعارات بنجاح! ستصلك التحديثات والتهاني العائلية مباشرة على هاتفك.'
      );
    }
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

const LAST_SEEN_NOTIFICATION_KEY = 'fardan_last_seen_notification_id';

export function getLastSeenNotificationId(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_NOTIFICATION_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenNotificationId(id: string): void {
  try {
    localStorage.setItem(LAST_SEEN_NOTIFICATION_KEY, id);
  } catch {}
}

/**
 * Subscribe to new notifications added in Firestore (with server/local fallback if quota is exhausted)
 * Uses dual-path dispatch: System notification via Service Worker & In-App Toast banner
 * Tracks lastSeenNotificationId in localStorage to prevent duplicate alerts
 */
export function listenToCloudNotifications(
  onNewNotification?: (notif: { id: string; title: string; body: string; createdAt: number }) => void
): () => void {
  const sessionStartTime = Date.now() - 3000;
  const processedDocIds = new Set<string>();
  let isFirstLoad = true;
  let unsubFirestore: (() => void) | null = null;

  const dispatchNotificationItem = (docId: string, title: string, body: string, createdAt: number) => {
    const lastSeenId = getLastSeenNotificationId();
    const isNewDoc = docId !== lastSeenId && !processedDocIds.has(docId);
    if (isNewDoc && createdAt > sessionStartTime) {
      processedDocIds.add(docId);
      setLastSeenNotificationId(docId);

      // 1. Dual-path path A: Real phone system notification via Service Worker
      showSystemNotification(title, body).catch(() => {});

      // 2. Dual-path path B: In-App Toast Banner
      if (onNewNotification) {
        onNewNotification({
          id: docId,
          title,
          body,
          createdAt
        });
      }
    }
  };

  // Listen to custom in-app/local broadcast events (works instantaneously even if Firestore quota is reached)
  const handleLocalBroadcast = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.id) {
      dispatchNotificationItem(
        detail.id,
        detail.title || 'إشعار عائلي جديد',
        detail.body || '',
        detail.createdAt || Date.now()
      );
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('fardan-local-notification', handleLocalBroadcast);
  }

  if (!isFirestoreQuotaExhausted()) {
    try {
      const q = query(NOTIFICATIONS_COLLECTION, orderBy('createdAt', 'desc'), limit(15));

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const lastSeenId = getLastSeenNotificationId();

          if (isFirstLoad) {
            isFirstLoad = false;
            if (!lastSeenId && !snapshot.empty) {
              const newest = snapshot.docs[0];
              setLastSeenNotificationId(newest.id);
            }
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const docId = change.doc.id;
              const createdAt = data.createdAt || 0;
              dispatchNotificationItem(
                docId,
                data.title || 'إشعار عائلي جديد',
                data.body || '',
                createdAt
              );
            }
          });
        },
        (err: any) => {
          const msg = String(err?.message || err || '');
          if (
            err?.code === 'resource-exhausted' ||
            msg.includes('resource-exhausted') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('Quota')
          ) {
            if (unsubFirestore) {
              try { unsubFirestore(); } catch {}
              unsubFirestore = null;
            }
            tripFirestoreCircuitBreaker();
          }
        }
      );
    } catch {
      unsubFirestore = null;
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('fardan-local-notification', handleLocalBroadcast);
    }
    if (unsubFirestore) {
      try { unsubFirestore(); } catch {}
    }
  };
}

/**
 * Send a new notification to all family members' devices (Admin only)
 */
export async function sendCloudNotification(
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();

  if (!cleanTitle || !cleanBody) {
    return { success: false, error: 'يرجى كتابة عنوان الإشعار ونص الرسالة' };
  }

  const createdAt = Date.now();
  const fallbackId = `notif_${createdAt}`;

  // If Firestore quota is available, write to Firestore
  if (!isFirestoreQuotaExhausted()) {
    try {
      const writePromise = addDoc(NOTIFICATIONS_COLLECTION, {
        title: cleanTitle,
        body: cleanBody,
        createdAt,
        createdBy: 'المشرف المعتمد',
        source: 'web_admin'
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_OR_BACKOFF')), 3500)
      );
      await Promise.race([writePromise, timeoutPromise]);
      return { success: true };
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (
        err?.code === 'resource-exhausted' ||
        msg.includes('resource-exhausted') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('Quota') ||
        msg === 'TIMEOUT_OR_BACKOFF'
      ) {
        tripFirestoreCircuitBreaker();
      }
    }
  }

  // Fallback dispatch when Firestore daily free quota is reached: trigger local/system notification immediately
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fardan-local-notification', {
          detail: {
            id: fallbackId,
            title: cleanTitle,
            body: cleanBody,
            createdAt
          }
        })
      );
    }
    await showSystemNotification(cleanTitle, cleanBody).catch(() => {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل إرسال الإشعار' };
  }
}

