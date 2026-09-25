# VWMS Deployment

## Required Environment Variables

The app runs fully without external credentials.

Optional:

- `VITE_GEMINI_API_KEY`
  - Enables Gemini-assisted Smart Pull planning and AI inventory insights.
  - If omitted, the app automatically falls back to the built-in heuristic planner.

## Local Verification

Run these commands before deploying:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run validate:navigation
npm audit --audit-level=high
npm run build

# Or run the complete chain:
npm run diagnostics
```

## Static Deployment Steps

1. Copy `.env.local.example` to `.env.local` only if you want optional AI features.
2. Set `VITE_GEMINI_API_KEY` in the deployment environment if AI is required.
3. Build the project with `npm run build`.
4. Deploy the generated `dist/` directory to your static host.

Supported targets include:

- Vercel
- Netlify
- Cloudflare Pages
- S3 + CloudFront
- Any CDN or web server that can serve static files

## Vercel

1. Import the project.
2. Set the framework preset to `Vite`.
3. Add `VITE_GEMINI_API_KEY` only if AI features are desired.
4. Use the default build output directory: `dist`.

## Docker Example

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

## Production Notes

- `.env.local` should never be committed.
- `node_modules/`, `dist/`, and local secrets are excluded through `.gitignore`.
- The app stores operational data in browser `localStorage`, so browser storage resets will clear local user data unless exported first.
- AI features are client-side and should be treated as optional enhancement, not a hard dependency.
- The production build includes a Workbox service worker. Deploy `dist/` without stripping `sw.js`, `registerSW.js`, or `manifest.webmanifest`.
- New releases should serve `sw.js` with revalidation-friendly cache headers so clients discover updates promptly.

## Native Mobile

Capacitor projects are committed under `ios/` and `android/`.

```bash
npm ci
npm run mobile:doctor
npm run mobile:sync
npm run mobile:ios
# or
npm run mobile:android
```

iOS release builds require full Xcode and Apple signing. Android release builds require Android Studio, an Android SDK, a JDK, and a release keystore. Do not place signing passwords or keystores in the repository.
