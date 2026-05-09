---
title: Feed Infinite Scroll
date: 2026-05-09
status: draft
---

# Feed Infinite Scroll Design

## Problem

The feed page uses traditional numbered pagination. The goal is to replace it with infinite scroll that auto-loads new articles as the user scrolls, and restores scroll position when navigating back from an article detail page.

## Architecture

A `FeedStore` signal service (`providedIn: 'root'`) replaces all local state in `FeedPageComponent`. The component becomes a thin shell: reads from the store, owns the `IntersectionObserver`, and handles scroll save/restore on navigation. The filter bar is unchanged — it still writes URL query params; the component still listens and delegates to the store.

```
Route Query Params (source of truth for filters)
  ↓
FeedPageComponent — listens to params, delegates to store
  ↓
FeedStore — owns articles[], page, loading, hasMore, scrollY
  ↓
ArticlesService.getArticles() — unchanged
```

## FeedStore

**State (private writeable signals):**
- `_articles: WritableSignal<Article[]>` — accumulated list
- `_isLoading: WritableSignal<boolean>`
- `_currentPage: WritableSignal<number>`
- `_total: WritableSignal<number>`
- `_activeCategory: WritableSignal<string | undefined>`
- `_activeSort: WritableSignal<string>`
- `_scrollY: number` — plain number, not a signal

**Public computed/exposed signals:**
- `articles` — readonly
- `isLoading` — readonly
- `hasMore` — computed: `articles().length < total()`
- `activeCategory` — readonly
- `activeSort` — readonly

**Methods:**
- `reset(category?, sort?)` — clears articles, resets page to 1, sets filters, triggers first load
- `loadMore()` — guard: skip if loading or !hasMore; fetches next page, appends articles
- `saveScrollPosition(y: number)`
- `getScrollPosition(): number`

Filter changes always call `reset()` which sets page=1 and clears the article list before fetching.

## Component Changes

`FeedPageComponent`:
- Remove all local signals — read from `FeedStore`
- `ngOnInit`: subscribe to route params → if filters unchanged and store has articles (back-nav), restore scroll; else call `store.reset(category, sort)`
- `ngAfterViewInit`: attach `IntersectionObserver` to `#scrollSentinel` div
- `ngOnDestroy`: `store.saveScrollPosition(window.scrollY)`, disconnect observer
- Remove all pagination methods (`goToPage`, `goToPageFromInput`)

**Template changes:**
- Remove pagination controls
- Add `<div #scrollSentinel>` after the article grid
- Add loading spinner below grid (shown when `isLoading()` and articles already loaded)
- Add "You've reached the end" message when `!hasMore() && !isLoading() && articles().length > 0`

## IntersectionObserver

```typescript
private observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting && !this.feedStore.isLoading() && this.feedStore.hasMore()) {
      this.feedStore.loadMore();
    }
  },
  { rootMargin: '300px' } // pre-load 300px before sentinel is visible
);
```

## Scroll Restoration

On `ngOnInit`:
- If store has articles and filters match current route params → user is returning from detail page → schedule `window.scrollTo(0, store.getScrollPosition())` after view init

On `ngOnDestroy`:
- `store.saveScrollPosition(window.scrollY)`

## Files to Create/Modify

| File | Action |
|------|--------|
| `features/feed/feed.store.ts` | Create |
| `features/feed/feed-page.component.ts` | Modify |
| `features/feed/feed-page.component.html` | Modify |
| `features/feed/feed-page.component.scss` | Minor tweaks |

## Verification

1. Start frontend (`ng serve`)
2. Open feed page — first 20 articles load
3. Scroll to bottom — next 20 append automatically
4. Apply a category filter — list resets, first 20 of filtered results load
5. Click an article → navigate to detail → hit back → confirm same scroll position and articles are present
6. Scroll to very end of all articles — confirm "end" message appears
