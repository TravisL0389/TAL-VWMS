# VWMS — Virtual Warehouse Management System

A flexible, deployment-ready warehouse management system built with React, TypeScript, and Vite. Designed to adapt to any industry — entertainment & AV, retail, manufacturing, food & beverage, equipment rental, or general storage.

## What's Inside

- **Setup wizard** — first-run flow with six industry presets and full customization (department names, colors, icons, prefixes).
- **Inventory manager** — full CRUD, search, filter, low-stock indicators, CSV import & export.
- **Visual layout builder** — pan-and-zoom warehouse canvas. Place racks individually, in arrays, or with layout templates. Status states (operational / maintenance / offline). Dock the builder panel left or right. Mobile bottom-sheet view.
- **Smart Pull** — order management with AI-powered route planning. Uses Google Gemini (gemini-2.5-flash) when a key is configured; falls back to a deterministic nearest-neighbour planner that runs entirely offline.
- **Analytics & reports** — real metrics derived from your data: utilization, fulfillment rate, top items, order trend, by-department breakdown. CSV export for inventory, orders, and summary.
- **Scanner** — simulated barcode and RFID scanning UI. Manual lookup by SKU, barcode, or RFID code.
- **Notifications & settings** — configurable terminology, brand name, dockable sidebar, light data management.
- **Local persistence** — all data lives in `localStorage`. No backend required.
- **Mobile responsive** — bottom-sheet panels, hamburger nav, adaptive grid layouts.
- **Capacitor-ready** — wrap as an iOS or Android app with `npx cap add ios` after building.

## Quick Start

```bash
# 1. Install
npm install

# 2. (Optional) Configure AI
cp .env.local.example .env.local
# Then edit .env.local and add your GEMINI_API_KEY

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build

# 5. Preview the production build
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

After `npm run build`, deploy the `dist/` folder. Set the `GEMINI_API_KEY` environment variable in your host's settings if you want AI features. The Vite build inlines it into the bundle at build time.

### Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build --build-arg GEMINI_API_KEY=your_key -t vwms .
docker run -p 8080:80 vwms
```

### Mobile (iOS / Android via Capacitor)

```bash
npm install @capacitor/core @capacitor/ios @capacitor/android
npm run build
npx cap add ios       # or: npx cap add android
npx cap sync
npx cap open ios      # opens Xcode
```

The app id is set to `com.vwms.app` — change it in `capacitor.config.ts` before publishing.

## Data & Privacy

All data is stored client-side in `localStorage` under keys prefixed with `vwms.*`. Use Settings → Reset All Data to wipe everything. There is no telemetry, no analytics, and no backend communication other than the optional Gemini API call when AI features are enabled.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS (via CDN — no build-time configuration)
- lucide-react for icons
- @google/genai for the optional Gemini integration
- Capacitor for optional native mobile builds

## License

Provided as-is for adaptation to your business. Brand name and all visual content are configurable; nothing is hardcoded.
