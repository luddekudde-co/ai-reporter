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
- Prisma ORM + PostgreSQL — `Article` model (id, title, url, summary, source, publishedAt, createdAt)
- Docker Compose — PostgreSQL 15 + Redis 7 running locally
- Frontend ↔ Backend connection (`ApiService` → `localhost:3000/api`)
- Feed page UI (Figma-matched): navbar, hero, filter bar, responsive 3-col card grid
- Article detail page UI (Figma-matched): dark hero header, AI summary block, read-original CTA
- `TimeAgoPipe` for relative timestamps
- DB seed script with sample articles

## Not Yet Done

- News ingestion pipeline (RSS feeds → DB)
- AI summarization (OpenAI → populate `summary` field)
- Article scoring/ranking (`impactLevel`, `score`, `category` fields)
- Redis/BullMQ integration (Docker is ready, code is not)
- Authentication (JWT, user accounts)
- AI chat interface
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

Infrastructure (Docker)
  └── PostgreSQL 15 (port 5432)
  └── Redis 7       (port 6379) — ready, not yet wired to app
```

**Frontend state:** Angular signals (no NgRx)
**API prefix:** `/api`
**CORS:** enabled for `localhost:4200`

---

# Development Phases

## Phase 2 — News Ingestion Pipeline ← next

- RSS feed fetcher (`rss-parser`)
- Content normalizer + article storage
- Deduplication logic
- BullMQ queue wired to Redis
- Libraries: `rss-parser`, `cheerio`, `playwright` (optional)

## Phase 3 — AI Processing

- OpenAI summarization per article
- Tag/category extraction
- Impact scoring
- Store results back to DB

## Phase 4 — Ranking System

- Score-based top-N daily selection
- Add `score`, `category`, `impactLevel` fields to Prisma schema
- Surface impact level + category in frontend card UI

## Phase 5 — AI Chat

- `POST /api/chat` endpoint
- Context builder: current article + related articles
- Frontend chat panel on article detail page

## Phase 6 — Weekly Digest

- Weekly BullMQ scheduled job
- Topic clustering + AI digest generation
- Digest view page at `/digest`

## Phase 7 — Authentication

- JWT-based auth
- User accounts + reading preferences
- Protected routes

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
