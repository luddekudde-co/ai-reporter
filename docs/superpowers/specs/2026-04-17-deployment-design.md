---
title: Deployment Design — AI Reporter
date: 2026-04-17
status: live — partially complete
---

# Deployment Design — AI Reporter

## Context

Deploying for demo/portfolio use — no auth, no regular users yet. Free tier to start, upgrade path to paid (~$5–20/mo) later. Custom domain to be added in the future. No time limit on deployment.

---

## Platform Decision

**Railway** for backend + database + Redis, **Vercel** for Angular frontend.

```
Vercel (Angular static build)
  └── calls → Railway backend URL (via env var at build time)

Railway project
  ├── NestJS service  (GitHub auto-deploy, root: /backend)
  ├── PostgreSQL      (Railway plugin — DATABASE_URL auto-injected)
  └── Redis           (Railway plugin — REDIS_URL auto-injected)
```

---

## What's Live ✅

- Railway project running with NestJS + PostgreSQL + Redis
- Vercel frontend deployed at `https://project-h0rhm.vercel.app`
- Backend at `https://ai-reporter-production.up.railway.app`
- Frontend calls Railway API correctly (Angular environments wired up)
- CORS allows Vercel URL via `FRONTEND_URL` env var
- BullMQ reads `REDIS_URL` from env (was hardcoded to localhost)
- NestJS listens on `0.0.0.0` so Railway proxy can reach it
- Prisma migrations run on deploy via `railway.toml` start command
- Auto-deploy on push to `main` for both Railway and Vercel

## Railway Variables Set

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by Postgres plugin |
| `REDIS_URL` | Auto-injected by Redis plugin |
| `OPENAI_API_KEY` | Set manually |
| `FRONTEND_URL` | `https://project-h0rhm.vercel.app` |
| `PORT` | `3000` (set manually — Railway didn't auto-inject) |

## Vercel Config

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist/ai-reporter/browser`
- `vercel.json` with SPA rewrites in `frontend/vercel.json`

## Code Changes Made

- `frontend/src/environments/environment.ts` — dev config (localhost:3000)
- `frontend/src/environments/environment.prod.ts` — prod config (Railway URL)
- `frontend/angular.json` — added `fileReplacements` for prod build
- `frontend/src/app/core/services/api.service.ts` — reads from `environment.apiUrl`
- `backend/src/main.ts` — listens on `0.0.0.0`, CORS reads `FRONTEND_URL`
- `backend/src/app.module.ts` — BullMQ reads `REDIS_URL` from env
- `backend/railway.toml` — sets start command: `npx prisma migrate deploy && npm start`

---

## Still To Do (resume here)

- [ ] Verify feed loads articles end-to-end on Vercel URL
- [ ] Post-deploy smoke test (articles, ingestion, AI processing)
- [ ] Custom domain (future — when user gets one)
- [ ] Switch from `nest start` (dev server) to compiled `node dist/main` for prod (Railpack currently doesn't preserve dist/ between build and runtime layers — needs Dockerfile or workaround)
- [ ] Auth deployment considerations (Phase 7, future)

---

## Cost

~$2–4/month on Railway Hobby plan ($5/month includes $5 credit). Safely within free credit for demo usage.
