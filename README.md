# VWMS — Virtual Warehouse Management System

A flexible, deployment-ready warehouse management system built with React, TypeScript, and Vite. Designed to adapt to any industry — entertainment & AV, retail, manufacturing, food & beverage, equipment rental, or general storage.

## What's Inside

- **Setup wizard** — first-run flow with six industry presets and full customization (department names, colors, icons, prefixes).
- **Inventory manager** — full CRUD, search, filter, low-stock indicators, CSV import & export.
- **Visual layout builder** — independently scrolling design tools, scalable floor dimensions, rack and warehouse object templates, placement validation, RFID controls, and R3F/Babylon.js digital-twin previews.
- **Smart Pull** — order management with AI-powered route planning. Uses Google Gemini (gemini-2.5-flash) when a key is configured; falls back to a deterministic nearest-neighbour planner that runs entirely offline.
- **Analytics & reports** — real metrics derived from your data: utilization, fulfillment rate, top items, order trend, by-department breakdown. CSV export for inventory, orders, and summary.
- **Scanner** — simulated barcode and RFID scanning UI. Manual lookup by SKU, barcode, or RFID code.
- **Notifications & settings** — configurable terminology, brand name, dockable sidebar, light data management.
- **Local persistence** — all data lives in `localStorage`. No backend required.
- **Installable PWA** — application manifest, branded icons, automatic service-worker updates, and an offline application shell.
- **Native mobile projects** — generated iOS and Android Capacitor projects with status bar, splash screen, network state, haptics, and Android back-button integration.

## Quick Start

```bash
# 1. Install
npm install

# 2. (Optional) Configure AI
cp .env.local.example .env.local
# Then edit .env.local and add your VITE_GEMINI_API_KEY

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build

# 5. Run every release diagnostic
npm run diagnostics

# 6. Preview the production build
npm run preview
```

The app works **fully without an API key**. Smart Pull will use a deterministic route planner; insights will be derived from local heuristics. To enable AI features, get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and add it to `.env.local`.

## Adapting It to Your Warehouse

Everything you see can be reshaped:

1. **Industry preset** — Pick the closest preset during setup, or start from "General Storage" and build out.
2. **Departments / categories / zones** — Add, rename, recolor, choose any of 24 icons. The label itself is configurable in Settings (call them "Categories", "Zones", "Sections", whatever fits).
3. **Terminology** — In Settings, customize the wording for "Department", "Item", and "Rack" to match your business.
4. **Multiple warehouses** — Create as many as you need. Inventory, racks, and orders are scoped per-warehouse.
5. **Sidebar position** — Dock the main nav and the warehouse builder panel either left or right.
6. **Layouts** — Use the Single, Array (NxM grid), or Template (single row, double row, U-shape) modes to build out floor plans quickly. Drag any rack to reposition. Save commits unsaved changes.
7. **CSV import / export** — Bring inventory in from any system. Export anytime.

## Deployment

### Static hosting (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages)

After `npm run build`, deploy the `dist/` folder. Set the `VITE_GEMINI_API_KEY` environment variable in your host's settings if you want AI features. The Vite build inlines it into the bundle at build time.

### Docker

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build --build-arg VITE_GEMINI_API_KEY=your_key -t vwms .
docker run -p 8080:80 vwms
```

### Mobile (iOS / Android via Capacitor)

```bash
npm run mobile:doctor
npm run mobile:sync
npm run mobile:ios       # syncs and opens Xcode
npm run mobile:android   # syncs and opens Android Studio
```

The native projects are in `ios/` and `android/`. The application id is `com.langolfenterprises.vwms`; confirm signing, provisioning, store metadata, and the final identifier before publishing.

## Data & Privacy

Operational data is currently stored client-side in `localStorage` under keys prefixed with `vwms.*`. Use Settings → Reset All Data to wipe everything. There is no telemetry or analytics. When Gemini is enabled, requests are sent to the configured Google API; production deployments should proxy AI calls through an authenticated server rather than expose a long-lived client key.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS with PostCSS build-time compilation
- Three.js, React Three Fiber, and Babylon.js
- Vite PWA and Workbox
- lucide-react for icons
- @google/genai for the optional Gemini integration
- Capacitor 8 for iOS and Android builds

## License

Provided as-is for adaptation to your business. Brand name and all visual content are configurable; nothing is hardcoded.
