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
  ): Observable<ArticlesResponse> {
    const params: Record<string, string | number> = { page, limit };
    if (category) params['category'] = category;
    return this.api.get<ArticlesResponse>('articles', params);
  }

  getArticle(id: number): Observable<Article> {
    return this.api.get<Article>(`articles/${id}`);
  }
}
