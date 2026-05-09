# Auto Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically delete articles (and their digest join rows) older than 4 months every 4 months via a NestJS scheduled task.

**Architecture:** A new `CleanupModule` with a single `CleanupService` that uses `@Cron` from `@nestjs/schedule` (already registered in `AppModule`). The service runs a Prisma transaction that deletes `DigestArticle` rows first (FK constraint), then `Article` rows where `publishedAt < now - 4 months`. `CleanupModule` is registered in `AppModule`.

**Tech Stack:** NestJS `@nestjs/schedule`, Prisma, Jest (unit tests with mocked Prisma)

---

## File Map

| Action | Path |
|--------|------|
| Create | `backend/src/cleanup/cleanup.service.ts` |
| Create | `backend/src/cleanup/cleanup.service.spec.ts` |
| Create | `backend/src/cleanup/cleanup.module.ts` |
| Modify | `backend/src/app.module.ts` |

---

### Task 1: CleanupService — TDD

**Files:**
- Create: `backend/src/cleanup/cleanup.service.ts`
- Create: `backend/src/cleanup/cleanup.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/cleanup/cleanup.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTransaction = jest.fn();
const mockPrisma = {
  $transaction: mockTransaction,
  digestArticle: { deleteMany: jest.fn() },
  article: { deleteMany: jest.fn() },
};

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (fn) => fn(mockPrisma));

    const module = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CleanupService);
  });

  it('deletes DigestArticle rows before Article rows', async () => {
    const deleteOrder: string[] = [];
    mockPrisma.digestArticle.deleteMany.mockImplementation(async () => {
      deleteOrder.push('digestArticle');
      return { count: 2 };
    });
    mockPrisma.article.deleteMany.mockImplementation(async () => {
      deleteOrder.push('article');
      return { count: 5 };
    });

    await service.deleteOldArticles();

    expect(deleteOrder).toEqual(['digestArticle', 'article']);
  });

  it('uses publishedAt older than 4 months as cutoff', async () => {
    mockPrisma.digestArticle.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.article.deleteMany.mockResolvedValue({ count: 0 });

    const before = new Date();
    await service.deleteOldArticles();
    const after = new Date();

    const articleCall = mockPrisma.article.deleteMany.mock.calls[0][0];
    const cutoff: Date = articleCall.where.publishedAt.lt;

    const fourMonthsBefore = new Date(before);
    fourMonthsBefore.setMonth(fourMonthsBefore.getMonth() - 4);
    const fourMonthsAfter = new Date(after);
    fourMonthsAfter.setMonth(fourMonthsAfter.getMonth() - 4);

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(fourMonthsBefore.getTime());
    expect(cutoff.getTime()).toBeLessThanOrEqual(fourMonthsAfter.getTime());
  });

  it('passes matching cutoff to digestArticle delete', async () => {
    mockPrisma.digestArticle.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.article.deleteMany.mockResolvedValue({ count: 0 });

    await service.deleteOldArticles();

    const digestCall = mockPrisma.digestArticle.deleteMany.mock.calls[0][0];
    expect(digestCall.where.article.publishedAt.lt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx jest src/cleanup/cleanup.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './cleanup.service'`

- [ ] **Step 3: Create the CleanupService**

Create `backend/src/cleanup/cleanup.service.ts`:

```typescript
/**
 * CleanupService — runs a scheduled job every 4 months to purge articles
 * older than 4 months (by publishedAt). Deletes DigestArticle join rows first
 * to satisfy FK constraints, then deletes the Article rows, all in one transaction.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 1 */4 *')
  async deleteOldArticles(): Promise<void> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 4);

    const { deletedCount } = await this.prisma.$transaction(async (tx) => {
      await tx.digestArticle.deleteMany({
        where: { article: { publishedAt: { lt: cutoff } } },
      });

      const { count } = await tx.article.deleteMany({
        where: { publishedAt: { lt: cutoff } },
      });

      return { deletedCount: count };
    });

    this.logger.log(
      `Cleanup complete — deleted ${deletedCount} articles published before ${cutoff.toISOString()}`,
    );
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest src/cleanup/cleanup.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Format**

```bash
cd backend && npx prettier --write "src/cleanup/cleanup.service.ts" "src/cleanup/cleanup.service.spec.ts"
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/cleanup/cleanup.service.ts backend/src/cleanup/cleanup.service.spec.ts
git commit -m "feat: add CleanupService with 4-month article purge cron"
```

---

### Task 2: CleanupModule + AppModule registration

**Files:**
- Create: `backend/src/cleanup/cleanup.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `backend/src/cleanup/cleanup.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CleanupService],
})
export class CleanupModule {}
```

- [ ] **Step 2: Register CleanupModule in AppModule**

In `backend/src/app.module.ts`, add the import at the top:

```typescript
import { CleanupModule } from './cleanup/cleanup.module';
```

And add `CleanupModule` to the `imports` array (after `AuthModule`):

```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  ScheduleModule.forRoot(),
  BullModule.forRoot({ connection: redisConnection() }),
  PrismaModule,
  ArticlesModule,
  IngestionModule,
  AiProcessingModule,
  DigestModule,
  ChatModule,
  UsersModule,
  AuthModule,
  CleanupModule,
],
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd backend && npx nest build
```

Expected: build completes with no errors.

- [ ] **Step 4: Format**

```bash
cd backend && npx prettier --write "src/cleanup/cleanup.module.ts" "src/app.module.ts"
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/cleanup/cleanup.module.ts backend/src/app.module.ts
git commit -m "feat: register CleanupModule in AppModule"
```

---

### Task 3: Full test run

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npx jest --no-coverage
```

Expected: all tests pass (existing + new cleanup tests).

- [ ] **Step 2: Start the dev server and confirm no startup errors**

```bash
cd backend && npm run start:dev
```

Expected: server starts cleanly, logs show `SchedulerRegistry` has registered the cleanup cron job — no errors in startup output.
