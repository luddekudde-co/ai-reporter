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
