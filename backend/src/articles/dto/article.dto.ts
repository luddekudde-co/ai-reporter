export class ArticleDto {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  source: string;
  publishedAt: Date;
  createdAt: Date;
}

export class ArticlesResponseDto {
  data: ArticleDto[];
  total: number;
  page: number;
  limit: number;
}
