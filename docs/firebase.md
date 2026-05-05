# Firebase & Auth

## Overview

Firebase provides two services:

- **Firebase Authentication** — Sign-in with Google or email/password
- **Cloud Firestore** — NoSQL document database with real-time subscriptions and offline persistence

Both run entirely in the browser. There is no server or backend process.

## Initialization (`lib/firebase.ts`)

The Firebase app is initialized once, client-side only, using environment variables:

```typescript
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = typeof window !== 'undefined' && hasConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db   = app
  ? initializeFirestore(app, { localCache: persistentLocalCache() })
  : null;
```

Two things to note:

1. **Client-only guard** — The check `typeof window !== 'undefined'` prevents Firebase from initializing during Next.js server-side rendering (which doesn't exist in static export mode, but prevents build-time errors).
2. **Persistent local cache** — `persistentLocalCache()` tells Firestore to use IndexedDB as its local cache. Writes are immediately visible to `onSnapshot` listeners without waiting for network confirmation, which eliminates the "flash" where a just-saved entry disappears for a moment before the server responds.

## Authentication (`lib/firebaseAuth.ts`)

### Sign-in methods

```typescript
// Google OAuth popup
signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }>

// Email/password
signUpWithEmail(email: string, password: string): Promise<User>
signInWithEmail(email: string, password: string): Promise<void>

signOut(): Promise<void>
onAuthChange(callback: (user: User | null) => void): Unsubscribe
```

`signInWithGoogle` returns `isNewUser` (from `getAdditionalUserInfo`) so the app can distinguish a first-time sign-up from a returning sign-in. This matters because only new accounts trigger the data migration prompt.

### Session persistence

```typescript
await setPersistence(auth, browserLocalPersistence);
```

Sessions persist across browser restarts via `localStorage`. A user who closes and reopens the app remains signed in indefinitely.

### Auth state in the app

`page.tsx` subscribes to auth changes on mount:

```typescript
useEffect(() => {
  return onAuthChange(async u => {
    if (u) await migrateToDateIds(u.uid);  // one-time repair of legacy data
    setUser(u);
    setAuthResolved(true);
  });
}, []);
```

`authResolved` starts as `false` and flips to `true` after the first auth callback, whether the user is signed in or not. Nothing is rendered until this resolves, preventing a flash of the wrong state.

## Firestore Schema

All user data lives under `users/{uid}`:

```
users/{uid}/
  entries/{YYYY-MM-DD}          One document per day
    date:   string              "2026-05-04"
    weight: number              Lbs (always stored in lbs)
    note?:  string              Optional

  data/goal                     At most one document
    startDate:   string         "2026-01-01"
    startWeight: number         Lbs
    goalWeight:  number         Lbs
    weeklyLoss:  number         Lbs/week (negative = gain goal)
```

### Why date-based document IDs

`entries/{YYYY-MM-DD}` uses the date string as the document ID. This makes each write idempotent — saving a weight on a date that already has an entry updates it instead of creating a duplicate. Without this, saving from a phone and a PC on the same day would produce two separate documents for the same date, and both would appear in the chart.

Firestore's `setDoc` (not `addDoc`) is used for all writes:

```typescript
await setDoc(doc(entriesCol(uid), entry.date), data);
```

## Real-Time Subscriptions (`lib/db.ts`)

When signed in, the UI is driven entirely by Firestore subscriptions:

```typescript
export function subscribeEntries(
  uid: string,
  callback: (entries: WeightEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    query(entriesCol(uid), orderBy('date', 'asc')),
    snap => callback(snap.docs.map(docToEntry))
  );
}

export function subscribeGoal(
  uid: string,
  callback: (goal: Goal | null) => void
): Unsubscribe {
  return onSnapshot(goalDoc(uid), snap =>
    callback(snap.exists() ? (snap.data() as Goal) : null)
  );
}
```

Both subscriptions are started in `page.tsx` after auth resolves and torn down when the user signs out or the component unmounts. `dataReady` is set to `true` only after both subscriptions have fired at least once, so a skeleton screen is shown during the initial load instead of an empty state.

## Security Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Each user can only read and write documents under their own `users/{uid}` path. Unauthenticated requests are denied entirely. The `{document=**}` wildcard covers all subcollections (`entries/`, `data/`).

Rules are deployed separately from the app via the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Data Migration (`lib/db.ts`)

An earlier version of the app used `addDoc` (random auto-generated IDs) instead of `setDoc` with date-based IDs. `migrateToDateIds` runs once on every sign-in and repairs any legacy documents:

```typescript
export async function migrateToDateIds(uid: string): Promise<void> {
  const snap = await getDocs(entriesCol(uid));
  const isDateId = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);
  const dateIdSet = new Set(snap.docs.filter(d => isDateId(d.id)).map(d => d.id));
  const toMigrate = snap.docs.filter(d => !isDateId(d.id));
  if (toMigrate.length === 0) return;

  const batch = writeBatch(db);
  for (const d of toMigrate) {
    const data = d.data() as WeightEntry;
    if (!dateIdSet.has(data.date)) {
      batch.set(doc(entriesCol(uid), data.date), { date: data.date, weight: data.weight, ...(data.note ? { note: data.note } : {}) });
      dateIdSet.add(data.date);
    }
    batch.delete(doc(entriesCol(uid), d.id));
  }
  await batch.commit();
}
```

The function is a no-op once all documents have date-based IDs.

## Offline Behavior

Firestore's `persistentLocalCache()` stores the full dataset in IndexedDB. When the device goes offline:

- **Reads** are served from IndexedDB — the app works normally.
- **Writes** are queued locally and synced to the server automatically when the connection is restored.
- **`onSnapshot` listeners** fire immediately on write (from the local cache) so the UI updates without any network round-trip.

This means a user can log weight, switch to the chart tab, and see the new entry — all without a network connection.

## Environment Variables

All Firebase config values are injected at build time via `NEXT_PUBLIC_` environment variables. See [Development](development.md) for the full list.
