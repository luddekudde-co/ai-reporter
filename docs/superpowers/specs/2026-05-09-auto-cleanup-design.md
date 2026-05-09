---
title: Auto Cleanup — Delete Old Articles
date: 2026-05-09
status: draft
---

# Auto Cleanup — Delete Old Articles

## Goal

Automatically remove articles (and their digest join rows) older than 4 months on a recurring schedule, keeping the database lean without manual intervention.

## Approach

A new `CleanupModule` with a single `CleanupService`. No controller, no queue — just a NestJS scheduled task using the existing `@nestjs/schedule` infrastructure already registered in `AppModule`.

## Components

| File | Purpose |
|------|---------|
| `backend/src/cleanup/cleanup.service.ts` | Contains the `@Cron` job |
| `backend/src/cleanup/cleanup.module.ts` | Registers `CleanupService`, imports `PrismaModule` |

`CleanupModule` is added to `AppModule` imports.

## Cron Schedule

`0 0 1 */4 *` — midnight on the 1st of every 4th month (January, May, September).

## Deletion Logic

1. Compute cutoff: `now - 4 months`
2. Delete `DigestArticle` rows where the linked article's `publishedAt < cutoff` (clears FK constraint)
3. Delete `Article` rows where `publishedAt < cutoff`
4. Both deletes run inside a Prisma transaction — atomic, all-or-nothing
5. Log the number of deleted articles

## Age Cutoff Field

`publishedAt` — reflects the article's real-world age rather than ingestion time.

## Data Impact

- Articles deleted: all articles with `publishedAt` older than 4 months
- Digest records (`Digest` table) are **not** deleted — weekly summaries are preserved
- `DigestArticle` join rows for old articles are deleted (FK cleanup before article delete)
