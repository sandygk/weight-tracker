# Weight Tracker

A personal PWA for logging daily weight and tracking progress toward a goal.

**Live:** https://sandaliosweight.netlify.app

## Features

- Log daily weight with optional notes
- Goal setting with linear progress tracking (loss or gain)
- Color-coded chart: green when ahead of target, orange/red when behind
- CSV import and export
- Works offline, installable as a home screen app
- Units: lbs or kg

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Building

```bash
npm run build
```

Outputs a static site to `out/`.

## Deploying

Deploys to Netlify. Requires the [Netlify CLI](https://docs.netlify.com/cli/get-started/) and `netlify login`.

```bash
npm run build
netlify deploy --prod --dir=out
```
