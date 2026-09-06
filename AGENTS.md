# Base44 Dev Environment

## What this is
A **Rsbuild + React Router** single-page app (Deriv trading bot builder). Frontend-only — no backend, no database. The dev server is Rsbuild (`rsbuild dev`) on port 4003, mapped to host port 3000.

## Running it
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Base image: `node:22-slim` (matches `engines.node >= 22`).
- Source is bind-mounted at `/app`; `node_modules` lives in a named volume so reinstalls are fast.
- Install uses `npm install --legacy-peer-deps` — there's a peer conflict between `@deriv-com/quill-ui@1.18.1` and `@deriv-com/smartcharts-champion` that breaks a plain `npm install`.
- No lockfile is committed, so the first `up` resolves all deps (slow ~2 min). Subsequent starts reuse the volume.
- Dev server binds `0.0.0.0` via `--host 0.0.0.0` so the preview's external hostname reaches it.

## Environment / secrets
Env vars are injected at **build/dev time** via Rsbuild's `source.define` (see `rsbuild.config.ts`), which reads `process.env`. `loadEnv({ mode: 'production' })` loads `.env.production`, but **dotenv does not override existing process.env values**, so platform secrets (delivered to `/run/base44/app.env` via compose `env_file`) win.

- `NEXT_PUBLIC_DERIV_APP_ID` — **the key credential.** Drives OAuth login/sign-up and WebSocket connections. Without it the app still renders but Log in / Sign up stay disabled (a warning toast appears). Get it from the Deriv API Token / App Registration page.
- `NEXT_PUBLIC_DERIV_ENV` — `production` (live) vs `preview`/`staging`. Defaults to `production`.
- `NEXT_PUBLIC_DERIV_APP_NAME`, `NEXT_PUBLIC_DERIV_REFERRAL_LINK` — branding/affiliate, optional.
- `GD_CLIENT_ID` / `GD_APP_ID` / `GD_API_KEY` — optional Google Drive strategy save/load.

Defaults live in `.env.base44-defaults` (placeholders); real values come from `/run/base44/app.env`.

## Verifying it works
- `docker compose -f docker-compose.base44.yml ps` → `app-web-1` should be `Up (healthy)`.
- `curl -sf http://localhost:3000/` returns the SPA `index.html`.
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/static/js/lib-react.js` returns 200 (dev server accepts external hosts).
- In the preview, the bot builder UI renders. Without `NEXT_PUBLIC_DERIV_APP_ID`, login buttons are disabled — that's expected, not a bug.

## Notes / quirks
- `rsbuild.config.ts` `source.alias` triggers a deprecation warning (harmless).
- Branding CSS is regenerated on `npm install` and `npm run dev` via `scripts/generate-brand-css.js` (writes `src/components/shared/styles/_themes.scss`).
- The static preview build (`NEXT_PUBLIC_APP_BUILD=true`) serves under `/bot/preview/` — not used in this dev setup.
