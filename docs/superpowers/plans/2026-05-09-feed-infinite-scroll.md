# Feed Infinite Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace traditional pagination on the feed page with automatic infinite scroll, preserving state and scroll position when navigating back from article detail.

**Architecture:** A `FeedStore` signal service (provided in root, survives navigation) holds accumulated articles, page counter, loading state, and scroll position. `FeedPageComponent` becomes a thin shell that reads from the store and owns the `IntersectionObserver` on a sentinel `<div>` at the bottom of the article list. Filter changes via URL query params call `store.reset()` which clears the list and reloads from page 1.

**Tech Stack:** Angular 19, TypeScript, SCSS, Angular signals, IntersectionObserver API.

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/app/features/feed/feed.store.ts` | **Create** — holds all feed state and data-fetching logic |
| `frontend/src/app/features/feed/feed-page.component.ts` | **Modify** — remove local signals, inject FeedStore, add IntersectionObserver lifecycle |
| `frontend/src/app/features/feed/feed-page.component.html` | **Modify** — remove pagination controls, add sentinel div, add inline loader and end message |
| `frontend/src/app/features/feed/feed-page.component.scss` | **Modify** — remove pagination styles, add loader and end-message styles |

---

### Task 1: Create FeedStore

**Files:**
- Create: `frontend/src/app/features/feed/feed.store.ts`

- [ ] **Step 1: Create the store file**

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { ArticlesService, Article } from '../../core/services/articles.service';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class FeedStore {
  private readonly _articles = signal<Article[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _currentPage = signal(1);
  private readonly _total = signal(0);
  private readonly _activeCategory = signal<string | undefined>(undefined);
  private readonly _activeSort = signal<string>('score');
  private _scrollY = 0;

  readonly articles = this._articles.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly activeCategory = this._activeCategory.asReadonly();
  readonly activeSort = this._activeSort.asReadonly();
  // total=0 means nothing loaded yet — treat as "more available" so first fetch runs
  readonly hasMore = computed(
    () => this._total() === 0 || this._articles().length < this._total(),
  );

  constructor(private readonly articlesService: ArticlesService) {}

  reset(category?: string, sort = 'score'): void {
    this._articles.set([]);
    this._currentPage.set(1);
    this._total.set(0);
    this._activeCategory.set(category);
    this._activeSort.set(sort);
    this._scrollY = 0;
    this.loadMore();
  }

  loadMore(): void {
    if (this._isLoading() || !this.hasMore()) return;
    this._isLoading.set(true);
    this.articlesService
      .getArticles(
        this._currentPage(),
        PAGE_SIZE,
        this._activeCategory(),
        this._activeSort(),
      )
      .subscribe({
        next: (res) => {
          this._articles.update((prev) => [...prev, ...res.data]);
          this._total.set(res.total);
          this._currentPage.update((p) => p + 1);
          this._isLoading.set(false);
        },
        error: () => this._isLoading.set(false),
      });
  }

  saveScrollPosition(y: number): void {
    this._scrollY = y;
  }

  getScrollPosition(): number {
    return this._scrollY;
  }
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/feed/feed.store.ts
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. Fix any before proceeding.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/feed/feed.store.ts
git commit -m "feat(feed): add FeedStore signal service for infinite scroll state"
```

---

### Task 2: Update FeedPageComponent TypeScript

**Files:**
- Modify: `frontend/src/app/features/feed/feed-page.component.ts`

Current file (`feed-page.component.ts`) has local signals `articles`, `isLoading`, `currentPage`, `total`, `activeCategory`, `activeSort` and methods `loadArticles`, `goToPage`, `goToPageFromInput`, `totalPages`. All of these move into `FeedStore`. The component's job is now: listen to route params, delegate to the store, and own the `IntersectionObserver`.

- [ ] **Step 1: Replace the component file contents**

```typescript
/**
 * FeedPageComponent — renders the infinite-scroll article feed.
 * All state lives in FeedStore (survives navigation for scroll restoration).
 * An IntersectionObserver on #scrollSentinel triggers loading more articles.
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArticleCardComponent } from '../../design/article-card/article-card.component';
import { NavMenuItem } from '../../design/nav-menu/nav-menu.component';
import { FeedFilterBarComponent } from './feed-filter-bar/feed-filter-bar.component';
import { FeedStore } from './feed.store';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [ArticleCardComponent, FeedFilterBarComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') private sentinelRef!: ElementRef;

  private readonly route = inject(ActivatedRoute);
  readonly feedStore = inject(FeedStore);

  private observer!: IntersectionObserver;
  private shouldRestoreScroll = false;

  navigationItems: NavMenuItem[] = [
    { label: 'All', categoryKey: null },
    { label: 'Medical', categoryKey: 'medical' },
    { label: 'Applications', categoryKey: 'application' },
    { label: 'Foundation', categoryKey: 'foundation' },
    { label: 'Funding', categoryKey: 'funding' },
    { label: 'Robotics', categoryKey: 'robotics' },
    { label: 'Policies', categoryKey: 'polic' },
    { label: 'Research', categoryKey: 'research' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const category = params.get('category') ?? undefined;
      const sort = params.get('sort') ?? 'score';

      const isBackNav =
        this.feedStore.articles().length > 0 &&
        this.feedStore.activeCategory() === category &&
        this.feedStore.activeSort() === sort;

      if (isBackNav) {
        this.shouldRestoreScroll = true;
      } else {
        this.feedStore.reset(category, sort);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.shouldRestoreScroll) {
      const y = this.feedStore.getScrollPosition();
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
      this.shouldRestoreScroll = false;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !this.feedStore.isLoading() &&
          this.feedStore.hasMore()
        ) {
          this.feedStore.loadMore();
        }
      },
      { rootMargin: '300px' },
    );

    this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.feedStore.saveScrollPosition(window.scrollY);
    this.observer?.disconnect();
  }
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/feed/feed-page.component.ts
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/feed/feed-page.component.ts
git commit -m "feat(feed): replace local signals with FeedStore, add IntersectionObserver"
```

---

### Task 3: Update Template

**Files:**
- Modify: `frontend/src/app/features/feed/feed-page.component.html`

Remove pagination nav. Add `#scrollSentinel` div after the article grid, an inline loader for subsequent page loads, and an end-of-feed message.

- [ ] **Step 1: Replace the template**

```html
<!-- Feed page: dark hero, category filter bar, and infinite-scroll article grid -->
<div class="c-feed-page">
  <div class="c-feed-page__hero">
    <h1 class="c-feed-page__hero-title">Today's AI Intelligence Brief</h1>
    <p class="c-feed-page__hero-subtitle">
      Curated daily from the most trusted sources in AI — ranked by impact,
      relevance, and credibility.
    </p>
  </div>

  <app-feed-filter-bar [navItems]="navigationItems" />

  <div class="c-feed-page__content">
    @if (feedStore.articles().length > 0) {
      <p class="c-feed-page__section-label">Top stories</p>
    }

    @if (feedStore.isLoading() && feedStore.articles().length === 0) {
      <div class="c-feed-page__state">Loading stories...</div>
    } @else if (!feedStore.isLoading() && feedStore.articles().length === 0) {
      <div class="c-feed-page__state">No articles found.</div>
    } @else {
      <div class="c-feed-page__articles">
        @for (article of feedStore.articles(); track article.id) {
          <app-article-card [article]="article" />
        }
      </div>
    }

    <div #scrollSentinel></div>

    @if (feedStore.isLoading() && feedStore.articles().length > 0) {
      <div class="c-feed-page__loader">Loading more stories...</div>
    }

    @if (!feedStore.hasMore() && !feedStore.isLoading() && feedStore.articles().length > 0) {
      <div class="c-feed-page__end">You're all caught up</div>
    }
  </div>
</div>
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/feed/feed-page.component.html
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/feed/feed-page.component.html
git commit -m "feat(feed): update template for infinite scroll — remove pagination, add sentinel"
```

---

### Task 4: Update SCSS

**Files:**
- Modify: `frontend/src/app/features/feed/feed-page.component.scss`

Remove `__pagination`, `__page-info`, `__page-input` blocks. Add `__loader` and `__end` styles.

- [ ] **Step 1: Replace the SCSS file**

```scss
.c-feed-page {
  &__hero {
    background: var(--color-dark);
    padding: 76px 64px 48px;
  }

  &__hero-title {
    font-size: 38px;
    font-weight: 700;
    color: white;
    max-width: 800px;
    line-height: 1.2;
    margin: 0 0 24px;
  }

  &__hero-subtitle {
    color: var(--color-muted);
    font-size: 15px;
    max-width: 680px;
    line-height: 1.5;
    margin: 0;
  }

  &__filter-bar {
    background: white;
    border-bottom: 1px solid var(--color-border);
    padding: 0 64px;
    display: flex;
    gap: 28px;
    height: 52px;
    align-items: flex-end;
  }

  &__filter-item {
    display: flex;
    justify-content: center;
    min-width: 40px;
    font-size: 14px;
    color: var(--color-body-text);
    padding-bottom: 8px;
    cursor: pointer;
    position: relative;

    &--is-active {
      color: var(--color-accent);
      font-weight: 600;

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--color-accent);
        border-radius: 2px 2px 0 0;
      }
    }
  }

  &__content {
    padding: 24px 40px 40px;
  }

  &__section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-muted);
    letter-spacing: 0.05em;
    margin: 0 0 16px;
  }

  &__articles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 24px;

    @media (max-width: 576px) {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    app-article-card {
      width: 100%;
    }
  }

  &__state {
    color: var(--color-body-text);
    text-align: center;
    padding: 3rem 0;
  }

  &__loader {
    color: var(--color-muted);
    font-size: 14px;
    text-align: center;
    padding: 2rem 0;
  }

  &__end {
    color: var(--color-muted);
    font-size: 13px;
    text-align: center;
    padding: 2rem 0;
    letter-spacing: 0.03em;
  }
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/feed/feed-page.component.scss
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/feed/feed-page.component.scss
git commit -m "feat(feed): update styles — remove pagination, add loader and end-of-feed"
```

---

### Task 5: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && ng serve
```

Open `http://localhost:4200` in a browser.

- [ ] **Step 2: Verify initial load**

Articles load on page open. "Loading stories..." appears briefly, then 20 articles render. Browser console has no errors.

- [ ] **Step 3: Verify infinite scroll**

Scroll to the bottom of the article list. A second batch of articles appends automatically. "Loading more stories..." appears during the fetch. Keep scrolling — articles continue to append until all are loaded.

- [ ] **Step 4: Verify end-of-feed message**

After all articles are loaded, "You're all caught up" appears at the bottom.

- [ ] **Step 5: Verify filter reset**

Click a category filter (e.g., Medical). The article list clears and reloads from page 1 with filtered results. Infinite scroll works for the filtered set.

- [ ] **Step 6: Verify scroll restoration**

Scroll halfway down the feed. Click an article to open the detail page. Hit browser back. The feed is at the same scroll position with the same articles still loaded.

- [ ] **Step 7: Verify empty state**

Apply a filter that returns no articles. "No articles found." renders.
