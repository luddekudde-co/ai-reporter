export class ArticleDto {
  declare id: number;
  declare title: string;
  declare url: string;
  declare summary: string | null;
  declare source: string;
  declare publishedAt: Date;
  declare createdAt: Date;
  declare category: string | null;
  declare impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  declare score: number;
}

export class ArticlesResponseDto {
  declare data: ArticleDto[];
  declare total: number;
  declare page: number;
  declare limit: number;
}
