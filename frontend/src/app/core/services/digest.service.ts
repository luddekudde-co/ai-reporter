import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Article } from './articles.service';

export interface DigestArticleItem {
  id: number;
  rank: number;
  article: Article;
}

export interface DigestResponse {
  id: number;
  weekStartDate: string;
  weekSummary: string;
  articles: DigestArticleItem[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DigestService {
  constructor(private readonly api: ApiService) {}

  getLatestDigest(): Observable<DigestResponse> {
    return this.api.get<DigestResponse>('digest');
  }

  getDigest(id: number): Observable<DigestResponse> {
    return this.api.get<DigestResponse>(`digest/${id}`);
  }
}
