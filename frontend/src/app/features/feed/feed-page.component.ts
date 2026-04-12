/**
 * FeedPageComponent — lists daily AI news articles fetched from the backend API.
 * Supports category filtering via ?category= and sort ordering via ?sort= query params.
 * Handles pagination and loading state using Angular signals.
 */
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArticleCardComponent } from '../../design/article-card/article-card.component';
import { ArticlesService, Article } from '../../core/services/articles.service';
import { NavMenuItem } from '../../design/nav-menu/nav-menu.component';
import { FeedFilterBarComponent } from './feed-filter-bar/feed-filter-bar.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [ArticleCardComponent, FeedFilterBarComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements OnInit {
  private readonly articlesService = inject(ArticlesService);
  private readonly route = inject(ActivatedRoute);

  articles = signal<Article[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  total = signal(0);
  activeCategory = signal<string | undefined>(undefined);
  activeSort = signal<string>('newest');

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

  get totalPages(): number {
    return Math.ceil(this.total() / PAGE_SIZE);
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const category = params.get('category') ?? undefined;
      const sort = params.get('sort') ?? 'newest';
      this.activeCategory.set(category);
      this.activeSort.set(sort);
      this.loadArticles(1, category, sort);
    });
  }

  loadArticles(page: number, category?: string, sort = 'newest'): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.articlesService
      .getArticles(page, PAGE_SIZE, category, sort)
      .subscribe({
        next: (res) => {
          this.articles.set(res.data);
          this.total.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  goToPage(page: number): void {
    this.loadArticles(page, this.activeCategory(), this.activeSort());
  }

  goToPageFromInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = parseInt(input.value, 10);
    const page = isNaN(raw)
      ? this.currentPage()
      : Math.min(Math.max(raw, 1), this.totalPages);
    input.value = String(page);
    if (page !== this.currentPage()) {
      this.goToPage(page);
    }
  }
}
