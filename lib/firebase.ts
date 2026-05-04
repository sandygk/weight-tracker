import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize in the browser with a valid config — gracefully skip if env vars aren't set.
const hasConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const app = typeof window !== 'undefined' && hasConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = app ? getAuth(app) : (null as any);

// Use persistent local cache so writes are immediately visible via onSnapshot
// even before the network round-trip completes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = app
  ? (getApps().length > 1
      ? getFirestore(app)
      : initializeFirestore(app, { localCache: persistentLocalCache() }))
  : (null as any);
