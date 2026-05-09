# AI-Reporter — Project Reference

This document captures the **current project state**, **architecture**, and **remaining development phases** for the AI-Reporter platform.

It is intended as a living reference when working with AI coding assistants.

---

# Project Overview

**Project:** AI-Reporter
**Type:** Full-stack AI news aggregation platform
**Goal:** Learn full-stack development while building a production-style AI pipeline system.

Core capabilities:

* Aggregate AI news from APIs and RSS feeds
* Process content via AI summarization
* Rank and select top daily stories
* Present curated news in a web interface
* Allow contextual AI chat about articles
* Generate weekly AI digests

---

# Tech Stack

## Frontend

* Angular 20 (standalone components, signals)
* SCSS — custom design system + Bootstrap utility classes
* RxJS for reactive data flows
* Runs at: `http://localhost:4200`

## Backend

* NestJS (Node.js)
* Prisma ORM
* Runs at: `http://localhost:3000`

## Database

* PostgreSQL 15 (via Docker)
* Future: pgvector for embeddings

## Background Processing

* Redis 7 (via Docker) + BullMQ
* Purpose: async pipelines, ingestion, AI processing, digest generation

## AI Layer

* OpenAI API
* Used for: summarization, tag extraction, scoring, chat, weekly digest

---

# Repository Structure

```
ai-reporter/
  frontend/     Angular application
  backend/      NestJS API server
  worker/       background pipelines (future)
  docker/       local infrastructure configs
  docs/         architecture notes
```

---

# Current Status

## Completed

- Angular 20 frontend with signals, routing, SCSS design system
- NestJS backend with REST API (`/api/articles`, `/api/articles/:id`)
- Prisma ORM + PostgreSQL — `Article` model with `category`, `impactLevel`, `aiProcessed` fields
- Docker Compose — PostgreSQL 15 + Redis 7 running locally
- Frontend ↔ Backend connection (`ApiService` → `localhost:3000/api`)
- Feed page UI (Figma-matched): navbar, hero, filter bar, responsive 3-col card grid
- Article detail page UI (Figma-matched): dark hero header, AI summary block, read-original CTA
- `TimeAgoPipe` for relative timestamps
- DB seed script with sample articles
- **Phase 2 — RSS Ingestion Pipeline**
  - `IngestionService`: fetches 5 AI news feeds (TechCrunch, VentureBeat, The Verge, MIT Tech Review, OpenAI)
  - Hourly cron job (`@Cron(EVERY_HOUR)`) + manual `POST /api/ingestion/run`
  - Deduplication via Prisma `upsert` on unique `url` field
  - Backlog recovery via `POST /api/ingestion/process-backlog?limit=N`
- **Phase 3 — AI Processing**
  - `AiProcessingService`: calls OpenAI `gpt-4o-mini` to generate summary, category, and impact level per article
  - BullMQ queue (`article-processing`) wired to Redis for async job processing
  - `aiProcessed` flag prevents double-processing; backlog endpoint re-queues failed articles
  - Try/catch with re-throw so BullMQ retries failed jobs and errors are clearly logged
  - Frontend article card and detail page display real AI-generated impact level and category
- **Phase 4 — Ranking System**
  - `score` field added to Prisma schema and `ArticleDto`
  - Score (0–100) written to article during AI processing with time-decay formula
  - `ArticlesService` supports score-based sort
  - Feed UI defaults to score ranking; "Top Stories" sort option added
- **Phase 7 — Authentication (Google OAuth)**
  - Google OAuth via `passport-google-oauth20`; email/password flow removed entirely
  - `User` model: `id`, `email`, `googleId` (unique, Google `sub`), `name?`, `avatarUrl?`, `createdAt`
  - Backend: `GET /api/auth/google` and `GET /api/auth/google/callback`; callback redirects to `${FRONTEND_URL}/auth/callback#token=<jwt>`
  - Frontend: `/auth/callback` page consumes the hash token, hands it to `UserStore`; `NavbarComponent` shows a single "Continue with Google" button
  - JWT unchanged (`{ userId, email }`, 15-min expiry, Bearer header via interceptor)
  - Two Google OAuth clients (dev + prod) — Google blocks mixing localhost and public URLs in one client

## Not Yet Done

- AI chat interface (`POST /api/chat` + chat panel on article detail)
- Weekly digest pipeline + view

---

# Architecture

```
Browser (Angular 20)
  └── /              → HomePageHeroComponent (hero + CTA)
  └── /feed          → FeedPageComponent → GET /api/articles
  └── /articles/:id  → ArticleDetailComponent → GET /api/articles/:id

NestJS (port 3000)
  └── ArticlesModule
        └── ArticlesController → ArticlesService → PrismaService → PostgreSQL
  └── IngestionModule
        └── IngestionController → IngestionService → rss-parser → upsert → BullMQ
  └── AiProcessingModule
        └── AiProcessingProcessor (BullMQ worker) → AiProcessingService → OpenAI → PrismaService
  └── AuthModule
        └── AuthController (GET /auth/google, GET /auth/google/callback)
              → GoogleStrategy (passport-google-oauth20) → AuthService → UsersService → PrismaService
              → JwtModule (15-min token, Bearer)

Infrastructure (Docker)
  └── PostgreSQL 15 (port 5432)
  └── Redis 7       (port 6379) — backing BullMQ article-processing queue
```

**Frontend state:** Angular signals (no NgRx)
**API prefix:** `/api`
**CORS:** enabled for `localhost:4200`

---

# Development Phases

## Phase 2 — News Ingestion Pipeline ✅ Done

- RSS feed fetcher (`rss-parser`) — 5 AI feeds
- Deduplication via Prisma upsert on `url`
- Hourly cron + manual trigger endpoint
- BullMQ queue wired to Redis

## Phase 3 — AI Processing ✅ Done

- OpenAI `gpt-4o-mini` summarization, category, impact level per article
- BullMQ async processing with retry and error logging
- `aiProcessed` flag + backlog recovery endpoint
- Frontend displays real AI-generated data

## Phase 4 — Ranking System ✅ Done

- `score` field (0–100, float) added to Prisma schema + `ArticleDto`
- Score written during AI processing with time-decay formula
- `ArticlesService` score-based sort; feed defaults to score ranking
- "Top Stories" sort option in feed UI

## Phase 5 — AI Chat ← next

- `POST /api/chat` endpoint
- Context builder: current article + related articles
- Frontend chat panel on article detail page

## Phase 6 — Weekly Digest

- Weekly BullMQ scheduled job
- Topic clustering + AI digest generation
- Digest view page at `/digest`

## Phase 7 — Authentication ✅ Done

- Google OAuth via `passport-google-oauth20` (no email/password)
- `User` keyed by `googleId` (Google `sub`); auto-created on first sign-in
- 15-min JWT issued by backend, passed back to frontend via URL hash on `/auth/callback`
- `UserStore` signal store + auth interceptor (Bearer header) unchanged from prior design
- Separate Google OAuth clients for dev (localhost) and prod (Vercel + Railway)

---

# Future Improvements

* Semantic search (embeddings + pgvector)
* Personalization engine
* Recommendation system
* Multi-language support
* Social media publishing automation

---

# Key Principles

1. Keep pipelines asynchronous.
2. Never expose API keys to the frontend.
3. Maintain separate environments (local, staging, production).
4. Prioritize simple MVP features before advanced AI logic.
