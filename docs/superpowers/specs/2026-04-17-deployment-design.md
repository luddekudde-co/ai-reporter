---
title: Deployment Design — AI Reporter
date: 2026-04-17
status: draft-in-progress
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

## Code Changes Required

1. **Angular environment config** — create `environment.ts` (dev → `localhost:3000`) and `environment.prod.ts` (prod → Railway URL). Wire `api.service.ts` to read from environment.
2. **NestJS CORS** — add `FRONTEND_URL` env var; allow it alongside `localhost:4200` so both dev and prod work.
3. **BullMQ Redis config** — read `REDIS_URL` from `process.env` instead of hardcoded `localhost:6379`.
4. **NestJS PORT** — confirm it reads from `process.env.PORT` (Railway injects this dynamically).

> Note: `backend/.env` is already gitignored via `backend/.gitignore` — no change needed.

---

## Environment Variables

### Railway (NestJS service)

| Variable | Source |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway Postgres plugin |
| `REDIS_URL` | Auto-injected by Railway Redis plugin |
| `OPENAI_API_KEY` | Set manually in Railway dashboard |
| `NEWS_API_KEY` | Set manually in Railway dashboard |
| `FRONTEND_URL` | Set manually — Vercel app URL |
| `PORT` | Auto-injected by Railway |

### Vercel (Angular build)

| Variable | Value |
|---|---|
| `API_URL` | Railway backend public URL |

---

## Still To Design (resume here)

- [ ] Section 4: Railway setup steps (services, GitHub connection, Prisma migrate on deploy)
- [ ] Section 5: Vercel setup steps (build config, environment, Angular prod build)
- [ ] Section 6: CI/CD — auto-deploy on push to `main`
- [ ] Section 7: Post-deploy checklist (smoke test, CORS verify, BullMQ verify)
- [ ] Section 8: Upgrade path (custom domain, paid tier, auth later)
