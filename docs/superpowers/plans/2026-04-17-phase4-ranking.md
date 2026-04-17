# Phase 4 — Ranking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a numeric `score` field to articles, computed from `impactLevel` with time decay applied at query time, and surface "Top stories" as the default sort in the feed.

**Architecture:** Store a static base score (impact weight) on each article during AI processing. When sorting by score, apply a live exponential decay in raw SQL so recency is always current without a cron job. Frontend adds a "Top stories" sort option and defaults to it.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Angular 20 (signals), SCSS

---

## File Map

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `score Float @default(0)` to `Article` |
| `backend/src/articles/dto/article.dto.ts` | Add `score: number` field |
| `backend/src/ai-processing/ai-processing.service.ts` | Write `score` after writing `impactLevel` |
| `backend/src/articles/articles.service.ts` | Add `sort=score` SQL case; change default sort to `'score'` |
| `frontend/src/app/core/services/articles.service.ts` | Change skip-param guard from `'newest'` to `'score'` |
| `frontend/src/app/features/feed/feed-filter-bar/feed-filter-bar.component.ts` | Add "Top stories" to `SORT_OPTIONS`; change `initialValue` to `'score'` |
| `frontend/src/app/features/feed/feed-page.component.ts` | Change default sort from `'newest'` to `'score'` |

---

## Task 1: Add `score` to Prisma schema and migrate

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the field**

In `backend/prisma/schema.prisma`, add `score` to the `Article` model:

```prisma
model Article {
  id             Int             @id @default(autoincrement())
  title          String
  url            String          @unique
  summary        String?
  source         String
  publishedAt    DateTime
  createdAt      DateTime        @default(now())
  category       String?
  impactLevel    ImpactLevel?
  aiProcessed    Boolean         @default(false)
  score          Float           @default(0)
  digestArticles DigestArticle[]
}
```

- [ ] **Step 2: Run the migration**

```bash
cd backend
npx prisma migrate dev --name add-article-score
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the column exists**

```bash
npx prisma studio
```

Open `Article` table — confirm `score` column is present with default `0`. Then close Prisma Studio (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add score field to Article schema"
```

---

## Task 2: Update `ArticleDto` to include score

**Files:**
- Modify: `backend/src/articles/dto/article.dto.ts`

- [ ] **Step 1: Add `score` to the DTO**

Replace the contents of `backend/src/articles/dto/article.dto.ts`:

```typescript
export class ArticleDto {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  source: string;
  publishedAt: Date;
  createdAt: Date;
  category: string | null;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  score: number;
}

export class ArticlesResponseDto {
  data: ArticleDto[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/articles/dto/article.dto.ts
git commit -m "feat: add score to ArticleDto"
```

---

## Task 3: Write `score` in `AiProcessingService`

**Files:**
- Modify: `backend/src/ai-processing/ai-processing.service.ts`

- [ ] **Step 1: Add the score helper and update the Prisma write**

Replace the full content of `backend/src/ai-processing/ai-processing.service.ts`:

```typescript
/**
 * AiProcessingService — calls OpenAI to enrich a single article with a proper summary,
 * category tag, and impact level. Updates the article in the DB and marks it as processed.
 */
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { processorPrompt } from './prompts/processor-prompt';

interface AiResult {
  summary: string;
  category: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const IMPACT_SCORE: Record<'LOW' | 'MEDIUM' | 'HIGH', number> = {
  HIGH: 3.0,
  MEDIUM: 2.0,
  LOW: 1.0,
};

@Injectable()
export class AiProcessingService {
  private readonly logger = new Logger(AiProcessingService.name);
  private readonly openai = new OpenAI();

  constructor(private readonly prisma: PrismaService) {}

  async processArticle(id: number): Promise<void> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      this.logger.warn(`Article ${id} not found, skipping`);
      return;
    }

    if (article.aiProcessed) {
      this.logger.debug(`Article ${id} already processed, skipping`);
      return;
    }

    this.logger.log(`Processing article ${id}: "${article.title}"`);

    const prompt = processorPrompt(
      article.title,
      article.source,
      article.summary ?? 'no snippet available',
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const result = JSON.parse(raw) as Partial<AiResult>;

      const summary = result.summary ?? article.summary;
      const category = result.category ?? null;
      const impactLevel = this.parseImpactLevel(result.impactLevel);
      const score = IMPACT_SCORE[impactLevel];

      await this.prisma.article.update({
        where: { id },
        data: { summary, category, impactLevel, aiProcessed: true, score },
      });

      this.logger.log(
        `Article ${id} processed — category: ${category}, impact: ${impactLevel}, score: ${score}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to process article ${id} ("${article.title}"): ${message}`,
      );
      throw err;
    }
  }

  private parseImpactLevel(
    value: string | undefined,
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH') return value;
    return 'MEDIUM';
  }
}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test (optional — requires running backend)**

Process one article and check the score column was written:

```bash
curl -X POST "http://localhost:3000/api/ingestion/process-backlog?limit=1"
```

Then query the DB via Prisma Studio or psql to confirm `score` is `1.0`, `2.0`, or `3.0` on that article.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ai-processing/ai-processing.service.ts
git commit -m "feat: write impact score to article during AI processing"
```

---

## Task 4: Add `sort=score` to `ArticlesService`

**Files:**
- Modify: `backend/src/articles/articles.service.ts`

- [ ] **Step 1: Add the score sort case and change the default**

Replace the full content of `backend/src/articles/articles.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleDto, ArticlesResponseDto } from './dto/article.dto';

// λ = ln(2)/12 → score halves every 12 hours
const DECAY_LAMBDA = 0.0578;

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    category?: string,
    sort = 'score',
  ): Promise<ArticlesResponseDto> {
    const skip = (page - 1) * limit;
    const where = category
      ? { category: { contains: category, mode: 'insensitive' as const } }
      : {};

    const total = await this.prisma.article.count({ where });

    let data: ArticleDto[];

    if (sort === 'score') {
      const categoryClause = category
        ? Prisma.sql`WHERE category ILIKE ${`%${category}%`}`
        : Prisma.empty;

      data = await this.prisma.$queryRaw<ArticleDto[]>`
        SELECT id, title, url, summary, source, "publishedAt", "createdAt", category, "impactLevel", score
        FROM "Article"
        ${categoryClause}
        ORDER BY
          score * exp(${-DECAY_LAMBDA} * EXTRACT(EPOCH FROM (NOW() - "publishedAt")) / 3600) DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else if (sort === 'impact') {
      const categoryClause = category
        ? Prisma.sql`WHERE category ILIKE ${`%${category}%`}`
        : Prisma.empty;

      data = await this.prisma.$queryRaw<ArticleDto[]>`
        SELECT id, title, url, summary, source, "publishedAt", "createdAt", category, "impactLevel", score
        FROM "Article"
        ${categoryClause}
        ORDER BY
          CASE "impactLevel"
            WHEN 'HIGH'   THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW'    THEN 3
            ELSE               4
          END ASC,
          "publishedAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else {
      data = await this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: sort === 'oldest' ? 'asc' : 'desc' },
      });
    }

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }
}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test (requires running backend)**

```bash
# Default (score) sort
curl "http://localhost:3000/api/articles?page=1&limit=5" | jq '.data[].score'

# Explicit score sort
curl "http://localhost:3000/api/articles?sort=score&page=1&limit=5" | jq '.data[].score'
```

Expected: articles with higher `score` values appear first. Articles processed by AI show `1.0`, `2.0`, or `3.0`; unprocessed show `0`.

- [ ] **Step 4: Run prettier**

```bash
cd backend
npx prettier --write src/articles/articles.service.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/articles/articles.service.ts
git commit -m "feat: add score-based sort with time decay to ArticlesService"
```

---

## Task 5: Update frontend to add "Top stories" sort

**Files:**
- Modify: `frontend/src/app/core/services/articles.service.ts`
- Modify: `frontend/src/app/features/feed/feed-filter-bar/feed-filter-bar.component.ts`
- Modify: `frontend/src/app/features/feed/feed-page.component.ts`

- [ ] **Step 1: Update frontend `ArticlesService` default guard**

In `frontend/src/app/core/services/articles.service.ts`, change the `sort` param guard so `'score'` is treated as the default (not sent to the API, since the backend now defaults to `'score'` too):

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Article {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  source: string;
  publishedAt: string;
  createdAt: string;
  category: string | null;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  score: number;
}

export interface ArticlesResponse {
  data: Article[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  constructor(private readonly api: ApiService) {}

  getArticles(
    page = 1,
    limit = 20,
    category?: string,
    sort = 'score',
  ): Observable<ArticlesResponse> {
    const params: Record<string, string | number> = { page, limit };
    if (category) params['category'] = category;
    if (sort !== 'score') params['sort'] = sort;
    return this.api.get<ArticlesResponse>('articles', params);
  }

  getArticle(id: number): Observable<Article> {
    return this.api.get<Article>(`articles/${id}`);
  }
}
```

- [ ] **Step 2: Add "Top stories" to `SORT_OPTIONS` and fix default**

Replace the full content of `frontend/src/app/features/feed/feed-filter-bar/feed-filter-bar.component.ts`:

```typescript
import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import {
  NavMenuComponent,
  NavMenuItem,
} from '../../../design/nav-menu/nav-menu.component';
import { DropdownComponent } from '../../../design/dropdown/dropdown.component';

export interface SortOption {
  label: string;
  value: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Top stories', value: 'score' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Highest impact', value: 'impact' },
];

@Component({
  selector: 'app-feed-filter-bar',
  standalone: true,
  imports: [NavMenuComponent, DropdownComponent],
  templateUrl: './feed-filter-bar.component.html',
  styleUrl: './feed-filter-bar.component.scss',
})
export class FeedFilterBarComponent {
  navItems = input<NavMenuItem[]>([]);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sortOptions = SORT_OPTIONS;

  readonly activeSort = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('sort') ?? 'score')),
    { initialValue: 'score' },
  );

  activeSortLabel(): string {
    return (
      this.sortOptions.find((o) => o.value === this.activeSort())?.label ??
      'Top stories'
    );
  }

  selectSort(value: string, dd: DropdownComponent): void {
    this.router.navigate([], {
      queryParamsHandling: 'merge',
      queryParams: { sort: value === 'score' ? null : value },
    });
    dd.close();
  }
}
```

- [ ] **Step 3: Change default sort in `FeedPageComponent`**

In `frontend/src/app/features/feed/feed-page.component.ts`, update two lines:

Line 31 — change:
```typescript
activeSort = signal<string>('newest');
```
to:
```typescript
activeSort = signal<string>('score');
```

Line 51 — change:
```typescript
const sort = params.get('sort') ?? 'newest';
```
to:
```typescript
const sort = params.get('sort') ?? 'score';
```

- [ ] **Step 4: Run prettier on changed frontend files**

```bash
cd frontend
npx prettier --write src/app/core/services/articles.service.ts src/app/features/feed/feed-filter-bar/feed-filter-bar.component.ts src/app/features/feed/feed-page.component.ts
```

- [ ] **Step 5: Verify Angular compiles**

```bash
cd frontend
npx ng build --configuration development 2>&1 | tail -20
```

Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 6: Manual smoke test in browser**

Start the backend and frontend:
```bash
# terminal 1
cd backend && npm run start:dev

# terminal 2
cd frontend && npm run start
```

Open `http://localhost:4200/feed` and verify:
- The sort dropdown shows "Top stories" as the selected option
- Articles with higher impact levels appear before lower-impact ones from the same time window
- Switching to "Newest first" shows the most recently published articles
- Switching back to "Top stories" re-applies score ordering

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/services/articles.service.ts \
        frontend/src/app/features/feed/feed-filter-bar/feed-filter-bar.component.ts \
        frontend/src/app/features/feed/feed-page.component.ts
git commit -m "feat: add Top stories sort option and default feed to score ranking"
```
