# Weight Tracker

A Progressive Web App for logging daily weight and tracking progress toward a fitness goal. Works fully offline and syncs across devices when signed in.

**Live:** https://sandaliosweight.netlify.app

---

## Features

- Log daily weight with an optional note using a drum-scroll picker
- Interactive chart with color-coded progress relative to a goal trend line
- Entry history with inline edit and delete
- Goal configuration with estimated completion date
- Automatic unit conversion between lbs and kg
- Light, dark, and system-auto themes
- JSON import and export
- Installable on iOS, Android, and desktop (PWA)
- Fully offline-capable; optional account sync across devices

## Documentation

| Topic | Description |
|-------|-------------|
| [Architecture](docs/architecture.md) | Stack, data flow, and project structure |
| [PWA Setup](docs/pwa.md) | Service worker, manifest, caching strategy, and install flow |
| [Firebase & Auth](docs/firebase.md) | Authentication, Firestore schema, security rules, and offline cache |
| [Features](docs/features.md) | Detailed breakdown of every screen and feature |
| [Development](docs/development.md) | Local setup, environment variables, and deployment |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (static export) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Firebase Authentication (Google + email/password) |
| Database | Cloud Firestore with offline persistence |
| Hosting | Netlify |
| PWA | Custom service worker + Web App Manifest |

## Quick Start

```bash
cp .env.local.example .env.local   # fill in Firebase credentials
npm install
npm run dev                         # http://localhost:3000
```

See [Development](docs/development.md) for full setup instructions.
