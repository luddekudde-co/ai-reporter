---
title: Phase 4 — Ranking System
date: 2026-04-17
status: approved
---

# Phase 4 — Ranking System Design

## Overview

Add a numeric `score` field to the `Article` model and use it to surface top stories in the feed. Score is computed from `impactLevel` at AI processing time; time decay is applied at query time so ordering is always fresh without a cron job.

---

## Data Layer

**Prisma schema change** — add one field to `Article`:

```prisma
score Float @default(0)
```

- Set once during AI processing: `HIGH → 3.0`, `MEDIUM → 2.0`, `LOW → 1.0`
- Never updated after processing — the static base value is stored; decay is computed at query time
- Existing articles default to `0` until processed
- Requires a Prisma migration (`score` column with `DEFAULT 0`)

---

## Backend

### AiProcessingService

After writing `summary`, `category`, and `impactLevel`, also write `score`:

| impactLevel | score |
|-------------|-------|
| HIGH        | 3.0   |
| MEDIUM      | 2.0   |
| LOW         | 1.0   |

### ArticlesService

Add a `sort=score` case to `findAll()` using raw SQL with live time decay:

```sql
ORDER BY score * exp(-0.0578 * EXTRACT(EPOCH FROM (NOW() - "publishedAt")) / 3600) DESC
```

- `0.0578 ≈ ln(2) / 12` — effective score halves every 12 hours
- Pagination (`LIMIT` / `OFFSET`) works correctly since ordering is deterministic per query
- Change the default sort parameter from `'newest'` to `'score'`
- No new controller endpoints — existing `?sort=score` query param handles it

---

## Frontend

### feed-filter-bar.component.ts

Add one entry to `SORT_OPTIONS`:

```ts
{ label: 'Top stories', value: 'score' }
```

### feed-page.component.ts

Change the default sort value from `'newest'` to `'score'` so `/feed` lands on top stories by default.

No structural changes to routing, API calls, or templates needed.

---

## What is NOT in scope

- Re-scoring existing articles via a backfill job (they score 0 until processed)
- Exposing a dedicated `/api/articles/top` endpoint
- Pinned "Top Stories" section separate from the feed grid
- Digest service adoption of the new score field

---

## Decay reference

| Hours since published | HIGH (3.0) | MEDIUM (2.0) | LOW (1.0) |
|-----------------------|------------|--------------|-----------|
| 0h                    | 3.00       | 2.00         | 1.00      |
| 6h                    | 2.12       | 1.41         | 0.71      |
| 12h                   | 1.50       | 1.00         | 0.50      |
| 24h                   | 0.75       | 0.50         | 0.25      |
| 48h                   | 0.19       | 0.13         | 0.06      |
