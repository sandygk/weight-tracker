# Development

## Prerequisites

- Node.js 18+
- A Firebase project with Authentication and Firestore enabled

## Setup

**1. Clone and install**

```bash
git clone git@github.com:sandygk/weight-tracker.git
cd weight-tracker
npm install
```

**2. Configure Firebase**

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.local.example .env.local
```

`.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These values come from the Firebase console under Project Settings → Your apps → Web app. All are prefixed `NEXT_PUBLIC_` so Next.js includes them in the client bundle.

The app works without Firebase credentials — it falls back to localStorage-only mode with no auth or sync.

**3. Start the dev server**

```bash
npm run dev
```

Opens at `http://localhost:3000`.

The service worker does not register in development mode (Next.js hot-reload conflicts with the SW cache). To test PWA features locally, use the production build.

## Firebase Setup

### Authentication

In the Firebase console, enable these sign-in providers under Authentication → Sign-in method:

- Google
- Email/Password

### Firestore

Create a Firestore database in the Firebase console. Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

The rules file is `firestore.rules`. See [Firebase & Auth](firebase.md) for the rule details.

## Building

```bash
npm run build
```

Outputs a static site to `out/`. Next.js is configured with `output: 'export'` in `next.config.ts`, so the build generates plain HTML/CSS/JS with no server-side runtime.

Preview the build locally:

```bash
npx serve out
```

## Deployment

The app deploys to Netlify as a static site.

**Automatic deployment** — Netlify is configured via `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "out"
```

Connect the GitHub repo in the Netlify dashboard and deployments run automatically on push.

**Manual deployment** — Requires the Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=out
```

Environment variables (`NEXT_PUBLIC_FIREBASE_*`) must be set in the Netlify dashboard under Site configuration → Environment variables. They are injected at build time.

## Firestore Rules Deployment

Rules are not deployed as part of the Netlify build. Deploy them separately with the Firebase CLI:

```bash
firebase login
firebase deploy --only firestore:rules --project your-project-id
```

## Project Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | `output: 'export'`, local dev origin allowlist |
| `tsconfig.json` | TypeScript config, `@/` path alias for project root |
| `postcss.config.mjs` | Tailwind CSS v4 PostCSS plugin |
| `components.json` | shadcn/ui component paths and style config |
| `firebase.json` | Points `firestore.rules` at the rules file |
| `netlify.toml` | Build command and publish directory for Netlify |
| `eslint.config.mjs` | ESLint with Next.js ruleset |

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components are placed in `components/ui/`.

## Updating the Service Worker Cache

When making changes that should invalidate the offline cache, bump the cache version in `public/sw.js`:

```javascript
const CACHE = 'wt-v3';  // was wt-v2
```

This causes the new service worker to delete the old cache on activation.
