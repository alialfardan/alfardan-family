/**
 * API Client for Alfardan Family Tree.
 * On static hosts (alfardanfamily.com / github.io), all real-time sync happens directly via Firebase Firestore,
 * and static read fallbacks use same-origin JSON manifests without any cross-origin requests that could trigger CORS or 429 errors.
 */

export function isStaticProductionHost(): boolean {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host.includes('alfardanfamily.com') || host.includes('github.io');
  }
  return false;
}

export function getApiBaseUrl(): string {
  return '';
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isStaticProductionHost()) {
    const method = (init?.method || 'GET').toUpperCase();
    // On static GitHub Pages host, route read-only manifest checks to same-origin static files
    if (method === 'GET') {
      if (input.startsWith('/api/available-avatars')) {
        return fetch('/avatars-manifest.json', { cache: 'no-store' }).catch(
          () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (input.startsWith('/api/family-data')) {
        return fetch('/fardan_family_tree_backup.json', { cache: 'no-store' }).catch(
          () => new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
    }
    // For POST/other API calls on static host, resolve cleanly without network errors (Firestore handles live sync)
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true, staticHost: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }

  return fetch(input, init);
}

/**
 * Persists payload to local backend server when running inside AI Studio environment.
 * On static hosts (alfardanfamily.com), Firebase Firestore is the single source of truth.
 */
export async function mirrorSaveToAllEndpoints(path: string, bodyObj: any): Promise<Response | null> {
  if (isStaticProductionHost()) {
    return null;
  }
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });
  } catch {
    return null;
  }
}

