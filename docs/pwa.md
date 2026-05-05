# PWA Setup

The app is a fully installable Progressive Web App. It passes PWA installability criteria on Chrome, Edge, Safari (iOS 16.4+), and Firefox Android.

## Web App Manifest (`public/manifest.json`)

```json
{
  "id": "/",
  "name": "Weight Tracker",
  "short_name": "WeightTracker",
  "description": "Track your daily weight and progress toward your goal",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "prefer_related_applications": false,
  "icons": [
    { "src": "/icon-192.png",          "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png",          "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Key settings:

- **`display: "standalone"`** — The app opens without browser chrome (no address bar, no tabs). It looks and behaves like a native app.
- **`id: "/"`** — Stable identity for the installed app. Browsers use this to match updates.
- **Maskable icons** — Adaptive icons that fill the full icon shape on Android (circles, squircles, etc.). Without them, Android adds a white background circle around the icon.
- **`theme_color`** — Tints the status bar and browser toolbar blue on Android.

The manifest is linked in `app/layout.tsx`:

```tsx
<link rel="manifest" href="/manifest.json" />
```

## Service Worker (`public/sw.js`)

The service worker enables offline access by caching the app shell and static assets.

### Installation

On first load, the service worker pre-caches the minimum required files to serve the app offline:

```javascript
const CACHE = 'wt-v2';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())  // activate immediately without waiting for old SW
  );
});
```

### Activation and Cache Cleanup

On activation, old cache versions are deleted:

```javascript
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control of all open tabs immediately
  );
});
```

Bumping the `CACHE` constant (e.g. `wt-v2` → `wt-v3`) causes the next deployment to invalidate and replace all cached files.

### Fetch Strategies

The worker intercepts all same-origin GET requests and applies one of two strategies:

```javascript
self.addEventListener('fetch', e => {
  const isStatic = request.url.includes('/_next/static/');

  if (isStatic) {
    // Cache-first: Next.js static chunks have content-hashed URLs — safe to cache forever
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
      )
    );
  } else {
    // Network-first: HTML and dynamic content — try network, fall back to cache
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || new Response('Offline', { status: 503 })
          )
        )
    );
  }
});
```

| Request type | Strategy | Reason |
|---|---|---|
| `/_next/static/**` | Cache-first | Content-hashed filenames — identical URL always means identical content |
| Everything else | Network-first | HTML pages should always reflect the latest deployment; cache is the fallback |

### Registration

The service worker is registered in `app/page.tsx` on the client:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
}, []);
```

It must live in `public/` (not inside `_next/`) so its scope covers `/`.

## Install Prompt

The browser's native install prompt is captured early and exposed for manual triggering from the Settings tab.

### Capturing the prompt

In `app/layout.tsx`, a `beforeInteractive` script captures the event before React hydrates:

```html
<script>
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();        // suppress the automatic browser prompt
    window.__pwaPrompt = e;    // store for later use
  });
</script>
```

`beforeInteractive` is required because the `beforeinstallprompt` event can fire before the page finishes loading.

### Exposing it to the app

`page.tsx` reads the stored event and makes it available as state:

```typescript
useEffect(() => {
  if ((window as any).__pwaPrompt) setInstallPrompt((window as any).__pwaPrompt);
  const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);
```

### Triggering installation

In `SettingsTab.tsx`, the stored prompt is shown when the user clicks "Install App":

```typescript
async function handleInstall() {
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === 'accepted') {
    setInstalled(true);
    onInstalled();
  }
}
```

### Platform-specific fallbacks

`installPrompt` is only available on Chrome/Edge (Android and desktop). For other platforms, the Settings tab shows platform-appropriate instructions:

| Platform | Instruction shown |
|---|---|
| `installPrompt` available | "Install App" button |
| iOS (Safari) | "Tap Share → Add to Home Screen" |
| Android (no prompt) | "Tap ⋮ → Add to Home Screen or Install App" |
| Non-HTTPS | "Install requires HTTPS" |
| Already installed | "✓ Running as installed app" |

Already-installed detection uses the `(display-mode: standalone)` media query.

## HTML Meta Tags

Set in `app/layout.tsx`:

```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="WeightTracker" />
<meta name="theme-color" content="#3b82f6" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

These are required for full-screen mode on iOS Safari, which does not use the manifest for most of its PWA configuration.
