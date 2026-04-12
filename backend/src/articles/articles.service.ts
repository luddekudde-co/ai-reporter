import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleDto, ArticlesResponseDto } from './dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    category?: string,
    sort = 'newest',
  ): Promise<ArticlesResponseDto> {
    const skip = (page - 1) * limit;
    const where = category
      ? { category: { contains: category, mode: 'insensitive' as const } }
      : {};

    const total = await this.prisma.article.count({ where });

    let data: ArticleDto[];

    if (sort === 'impact') {
      const categoryClause = category
        ? Prisma.sql`WHERE category ILIKE ${`%${category}%`}`
        : Prisma.empty;

      data = await this.prisma.$queryRaw<ArticleDto[]>`
        SELECT id, title, url, summary, source, "publishedAt", "createdAt", category, "impactLevel"
        FROM "Article"
        ${categoryClause}
        ORDER BY
          CASE "impactLevel"
            WHEN 'HIGH'   THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW'    THEN 3
            ELSE               4
          END ASC,
          "publishedAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else {
      data = await this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: sort === 'oldest' ? 'asc' : 'desc' },
      });
    }

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }
}
