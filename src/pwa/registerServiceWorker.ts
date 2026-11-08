/**
 * Unregisters any stale Service Workers and clears CacheStorage so that
 * initialTreeData.json and inline Base64 photos always load fresh without stale caching.
 */
export function unregisterServiceWorkersAndClearCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        })
        .catch(() => {});
    }
    if ('caches' in window && window.caches) {
      window.caches
        .keys()
        .then((keys) => {
          for (const key of keys) {
            window.caches.delete(key).catch(() => {});
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore errors in restricted environments
  }
}

export function registerServiceWorker(): void {
  unregisterServiceWorkersAndClearCaches();
}

