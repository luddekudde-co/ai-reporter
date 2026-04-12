/**
 * FeedPageComponent — lists daily AI news articles fetched from the backend API.
 * Supports category filtering via ?category= query param, which is driven by the nav tabs.
 * Handles pagination and loading state using Angular signals.
 */
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArticleCardComponent } from '../../design/article-card/article-card.component';
import { ArticlesService, Article } from '../../core/services/articles.service';
import {
  NavMenuComponent,
  NavMenuItem,
} from '../../design/nav-menu/nav-menu.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [ArticleCardComponent, NavMenuComponent],
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

  navigationItems: NavMenuItem[] = [
    { label: 'All', categoryKey: null },
    { label: 'Medical AI', categoryKey: 'medical' },
    { label: 'AI Applications', categoryKey: 'application' },
    { label: 'Foundation Models', categoryKey: 'foundation' },
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
      this.activeCategory.set(category);
      this.loadArticles(1, category);
    });
  }

  loadArticles(page: number, category?: string): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.articlesService.getArticles(page, PAGE_SIZE, category).subscribe({
      next: (res) => {
        this.articles.set(res.data);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  goToPage(page: number): void {
    this.loadArticles(page, this.activeCategory());
  }
}
