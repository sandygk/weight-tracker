# Features

## Navigation

A fixed bottom navigation bar provides access to three tabs: Overview, History, and Settings. The active tab is reflected in the URL hash (`#chart`, `#history`, `#settings`), so the browser back button works as expected and a specific tab can be deep-linked.

---

## Overview Tab

The main screen. Shown at `#chart`.

### Range Picker

A segmented control above the chart lets the user select the time window:

| Option | Description |
|--------|-------------|
| 1W | Last 7 days |
| 1M | Last 30 days |
| 3M | Last 90 days |
| 6M | Last 180 days |
| ALL | All entries |
| Since diet | From the goal's start date to today |
| Diet start→end | From the goal's start date to its projected end date |

The selected range is persisted in localStorage and restored on next open.

### Stats Grid

Three columns below the chart show summary statistics:

- **Start / Total change** — The weight at the start of the selected range and the total change since then (e.g. −4.5 lbs).
- **Today / vs target** — Today's logged weight and how it compares to the expected goal-line weight for today.
- **Goal / Remaining** — The goal weight and how much is left to reach it.

All values are displayed in the user's selected unit (lbs or kg).

### Chart

The chart is a Recharts `ComposedChart`. It shows:

- **Weight line** — The user's actual weight over the selected range. The line is segmented by color based on how far the actual weight is from the goal trend line on that day:

  | Color | Meaning |
  |-------|---------|
  | Green | ≥1 unit ahead of target |
  | Lime | 0–1 unit ahead |
  | Orange | 0–1 unit behind |
  | Red | >1 unit behind |

- **Goal line** — A blue dashed line from the goal's start weight on its start date to the goal weight on its projected end date.
- **Dots** — A dot at each data point. Filled dots indicate the entry has a note.
- **Tooltip** — Hovering a point shows the date, weight, change from previous entry, delta from the goal line, and the note if present.

### Log Weight Button

A blue circular `+` button is fixed at the bottom of the screen (above the nav bar). Tapping it opens the weight logging modal.

---

## Log Weight Modal

A drum-scroll picker for entering weight. Two columns scroll independently:

- **Left** — Whole number (50–700 in lbs, 20–350 in kg)
- **Right** — Decimal (0–9, wraps around)

The current date is shown at the top. The picker opens at the user's last logged weight.

Scrolling works via drag (touch and mouse) or by tapping above/below the center item to increment or decrement.

An optional note field accepts up to 120 characters.

On save, the display value is converted from the user's unit to lbs for storage, and the entry is written to Firestore or localStorage depending on auth state.

---

## History Tab

A reverse-chronological list of all weight entries. Shown at `#history`.

Each row shows:

- Date
- Weight (in display unit)
- Change from the previous entry (e.g. `−0.8 lbs`), color-coded red for gain and green for loss
- Delta from the goal trend line for that date, color-coded by tier

Tapping the note icon opens an inline editor for the entry's note.

Tapping the delete icon opens a confirmation dialog before deleting.

---

## Settings Tab

Shown at `#settings`. Contains eight sections.

### Account

If signed in: shows the user's avatar (Google profile photo or an initials circle for email accounts), display name, and email, with a "Sign Out" button.

If signed out: shows a prompt to sign in with a "Sign In" button that opens the auth modal.

### Goal

A form to set a weight goal:

| Field | Description |
|-------|-------------|
| Start Date | When the goal begins (defaults to today) |
| Start Weight | Weight at the start of the goal (auto-filled from the nearest logged entry) |
| Goal Weight | Target weight |
| Weekly rate | Expected weekly loss or gain (lbs/week or kg/week) |

A preview shows the estimated completion date and number of weeks remaining. The goal is auto-saved 600ms after any change.

The goal drives the chart's goal line, the color-coding of all weights, and the "vs target" stat.

### Units

Toggle between lbs and kg. All stored values are in lbs; this preference controls display only.

### Appearance

Toggle between Light, Dark, and System (follows OS preference) themes.

### Import Data

Accepts a `.json` file previously exported from the app. The format is:

```json
{
  "entries": [{ "id": "2026-05-04", "date": "2026-05-04", "weight": 185.5 }],
  "goal": { "startDate": "2026-01-01", "startWeight": 200, "goalWeight": 175, "weeklyLoss": 0.5 }
}
```

Imported entries are merged (not replaced) with existing data.

### Export Data

Downloads a `.json` file with all entries and the current goal. The filename includes today's date (e.g. `weight-2026-05-04.json`).

### Install App

Shows the appropriate install path for the current platform:

- **Chrome / Edge (Android or desktop)** — "Install App" button using the captured `beforeinstallprompt` event
- **iOS Safari** — Instructions to use Share → Add to Home Screen
- **Other Android** — Instructions to use the browser menu
- **Already installed** — Confirmation message

### Debug Log

A scrollable log of the last 30 internal events (auth state changes, Firestore subscription metadata, write outcomes). Used for diagnosing sync issues. Supports copy to clipboard and clear.

---

## Authentication Modal

Triggered by the sign-in banner or the Settings Account section.

### Sign In / Sign Up toggle

The same modal handles both flows. A link at the bottom switches between them.

### Google sign-in

Opens a browser popup for Google OAuth. Returns immediately on completion.

### Email/password

A form with email and password fields. Error codes from Firebase are mapped to readable messages:

| Code | Message shown |
|------|---------------|
| `auth/invalid-credential` | Incorrect email or password. |
| `auth/email-already-in-use` | An account with this email already exists. |
| `auth/weak-password` | Password must be at least 6 characters. |
| `auth/invalid-email` | Invalid email address. |

### Data transfer prompt (sign-up only)

When a new account is created and the device has existing local weight entries, a prompt asks whether to transfer them to the new account:

- **Yes, transfer my data** — Entries and goal are batch-written to Firestore; local storage is cleared.
- **No, start fresh** — Local storage is cleared; the new account starts empty.

This only appears for new account creation, not for signing in to an existing account.

---

## Sign-In Banner

A dismissible blue banner appears at the top of the screen for users who are not signed in. It prompts them to sign in to enable cross-device sync.

Dismissal is permanent (stored in localStorage under `wt-banner-dismissed`). The banner reappears after the user signs out, since `wt-banner-dismissed` is cleared on sign-out.

---

## Theme

Three theme options:

- **Light** — White background, dark text
- **Dark** — Gray-950 background, light text
- **System** — Follows the OS `prefers-color-scheme` setting, updates dynamically

The theme is applied by adding or removing the `dark` class on `<html>`. A `beforeInteractive` inline script in `layout.tsx` applies the saved theme before the page paints to prevent a flash of the wrong theme on load.

---

## Offline Support

The app works without an internet connection:

- The service worker caches the app shell on first load.
- If the user is not signed in, all data is in localStorage — no network needed.
- If the user is signed in, Firestore's persistent local cache (IndexedDB) serves all reads, and writes are queued for sync when connectivity returns.

See [PWA Setup](pwa.md) for details on the caching strategy.
