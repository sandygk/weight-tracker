# Architecture

## Stack

The app is a Next.js static export — there is no server. `next build` produces a plain HTML/CSS/JS bundle in `out/`, which Netlify serves as static files. Firebase handles auth and cloud storage entirely from the browser.

```
Browser
  ├── Next.js 16 (static export, App Router)
  ├── React 19
  ├── Tailwind CSS v4
  ├── Recharts (charts)
  ├── shadcn/ui (UI primitives)
  ├── Firebase SDK (Auth + Firestore, runs client-side)
  └── Custom service worker (offline cache)

Hosting: Netlify (static files)
Auth:    Firebase Authentication
DB:      Cloud Firestore
```

## Project Structure

```
app/
  layout.tsx          Root layout — fonts, meta tags, PWA script, theme init
  page.tsx            Main app shell — auth state, data subscriptions, tab routing
  globals.css         Global Tailwind base styles

components/
  BottomNav.tsx       Tab bar (Overview / History / Settings)
  OverviewTab.tsx     Dashboard — chart, stats, range picker
  WeightChart.tsx     Recharts chart with color-coded goal progress
  WeightHistory.tsx   Reverse-chronological entry list
  LogModal.tsx        Drum-scroll weight entry modal
  GoalSettings.tsx    Goal form with auto-save
  SettingsTab.tsx     Settings panel (account, units, theme, export, install)
  SignInScreen.tsx    Auth modal (Google + email/password)
  CSVImport.tsx       JSON file import
  SegmentedControl.tsx  Reusable toggle button group
  ui/                 shadcn/ui primitives (Button, Card, Dialog, Input, Label)

lib/
  data.ts             Route writes to Firestore (signed in) or localStorage (offline)
  db.ts               Firestore CRUD and real-time subscriptions
  storage.ts          localStorage CRUD
  firebase.ts         Firebase app initialization
  firebaseAuth.ts     Auth operations (Google, email/password, sign-out)
  date.ts             Local-timezone date string (YYYY-MM-DD)
  units.ts            lbs ↔ kg conversion + user preference
  theme.ts            Dark/light/system theme management
  goalCalculator.ts   Expected weight interpolation, color tiers, end-date math
  csvParser.ts        WeightFit CSV parser
  debugLog.ts         Circular debug log (30 entries, stored in localStorage)
  utils.ts            Tailwind cn() helper

types/index.ts        WeightEntry and Goal interfaces

public/
  manifest.json       PWA Web App Manifest
  sw.js               Service worker
  icon-*.png          PWA icons (192px, 512px, maskable variants)
```

## Data Flow

The app runs in two modes depending on auth state.

### Unsigned (offline-first)

```
Write:  UI → lib/data.ts → localStorage
Read:   localStorage (one-time read on mount)
```

Data is stored in a single `wt-data` localStorage key as `{ entries: WeightEntry[], goal: Goal | null }`.

### Signed in (Firestore is source of truth)

```
Write:  UI → lib/data.ts → Firestore
Read:   Firestore onSnapshot subscriptions → React state → UI
```

On sign-in, two real-time subscriptions start (`subscribeEntries`, `subscribeGoal`). Every change — whether made locally or on another device — flows through these subscriptions into React state. `localStorage` is never read or written while signed in.

### Transition: sign-up with existing local data

When a new account is created and the user has local entries, they are asked whether to transfer the data. If they confirm, entries are batch-written to Firestore and local storage is cleared. If they decline, local storage is cleared and they start fresh.

## Firestore Document Structure

```
users/{uid}/
  entries/{YYYY-MM-DD}
    date:   string   (YYYY-MM-DD)
    weight: number   (lbs)
    note?:  string

  data/goal
    startDate:    string  (YYYY-MM-DD)
    startWeight:  number  (lbs)
    goalWeight:   number  (lbs)
    weeklyLoss:   number  (lbs/week, negative for gain goals)
```

Using the date as the document ID (`entries/2026-05-04`) guarantees exactly one document per day per user regardless of which device writes it. Earlier versions used random IDs, which caused duplicate entries when the same date was saved from two devices; a `migrateToDateIds()` function runs once on sign-in to repair any legacy data.

## Data Types

```typescript
interface WeightEntry {
  id: string;       // Firestore doc ID = date string
  date: string;     // YYYY-MM-DD (local timezone)
  weight: number;   // Always stored in lbs
  note?: string;
}

interface Goal {
  startDate: string;    // YYYY-MM-DD
  startWeight: number;  // lbs
  goalWeight: number;   // lbs
  weeklyLoss: number;   // lbs/week
}
```

All weights are stored in lbs regardless of the user's display preference. The `units.ts` module converts for display only, which prevents precision drift from repeated conversions.

## State Management

The app uses React's built-in state (`useState`, `useEffect`) without a global store. `page.tsx` holds top-level state (`user`, `entries`, `goal`, `unit`) and passes it down as props. Firestore subscriptions are the reactive layer when signed in.

Key state in `page.tsx`:

| State | Description |
|-------|-------------|
| `user` | Firebase `User` or `null` |
| `authResolved` | Whether the initial auth check has completed |
| `dataReady` | Whether entry + goal subscriptions have fired at least once |
| `entries` | `WeightEntry[]` (from Firestore sub or localStorage) |
| `goal` | `Goal \| null` |
| `unit` | `'lb' \| 'kg'` (from localStorage preference) |
| `tab` | Active tab, synced to URL hash |

## URL Routing

Navigation state is stored in the URL hash (`#chart`, `#history`, `#settings`). This works with static export (no server routing) and lets the browser back button navigate between tabs.
