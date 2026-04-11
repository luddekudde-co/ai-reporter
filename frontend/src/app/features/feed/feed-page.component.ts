/**
 * FeedPageComponent — lists daily AI news articles fetched from the backend API.
 * Handles pagination and loading state using Angular signals.
 */
import { Component, inject, OnInit, signal } from '@angular/core';
import { ArticleCardComponent } from '../../design/article-card/article-card.component';
import { ArticlesService, Article } from '../../core/services/articles.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [ArticleCardComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements OnInit {
  private readonly articlesService = inject(ArticlesService);

  articles = signal<Article[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  total = signal(0);

  get totalPages(): number {
    return Math.ceil(this.total() / PAGE_SIZE);
  }

  ngOnInit(): void {
    this.loadArticles(1);
  }

  loadArticles(page: number): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.articlesService.getArticles(page, PAGE_SIZE).subscribe({
      next: (res) => {
        this.articles.set(res.data);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
