import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel, enableNetwork } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Completely silence internal Firestore SDK watch-stream backoff logs
try {
  setLogLevel('silent');
} catch {}

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseAppletConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Clear any legacy quota circuit-breaker locks from localStorage/sessionStorage and ensure network is enabled
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fardan_firestore_quota_exhausted_v2');
    localStorage.removeItem('fardan_firestore_quota_exhausted');
    sessionStorage.removeItem('fardan_firestore_quota_exhausted');
  }
  enableNetwork(db).catch(() => {});
} catch {}

let memoryQuotaCooldownUntil = 0;

export function isFirestoreQuotaExhausted(): boolean {
  return Date.now() < memoryQuotaCooldownUntil;
}

export function tripFirestoreCircuitBreaker(): void {
  // Brief 5-second in-memory write cooldown if write rate limit is hit; never block localStorage or reads
  memoryQuotaCooldownUntil = Date.now() + 5 * 1000;
}


