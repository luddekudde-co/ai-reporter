/**
 * ArticleDetailComponent — shows the full details of a single article.
 * Fetches article by ID from the route params and displays title, source, date, summary, and original URL.
 */
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticlesService, Article } from '../../core/services/articles.service';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly articlesService = inject(ArticlesService);

  article = signal<Article | null>(null);
  isLoading = signal(true);
  notFound = signal(false);

  impactLabel = computed(() => {
    const level = this.article()?.impactLevel;
    if (!level) return 'Unrated';
    const word = level.charAt(0) + level.slice(1).toLowerCase();
    return `${word} Impact`;
  });

  sourceHostname = computed(() => {
    try {
      return new URL(this.article()!.url).hostname;
    } catch {
      return this.article()!.url;
    }
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.articlesService.getArticle(id).subscribe({
      next: (article) => {
        this.article.set(article);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
