import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleDto, ArticlesResponseDto } from './dto/article.dto';

// λ = ln(2)/12 → score halves every 12 hours
const DECAY_LAMBDA = 0.0578;

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    category?: string,
    sort = 'score',
    search?: string,
  ): Promise<ArticlesResponseDto> {
    const skip = (page - 1) * limit;

    // Raw SQL WHERE for score + impact sorts
    let rawWhere: Prisma.Sql;
    if (category && search) {
      rawWhere = Prisma.sql`WHERE category ILIKE ${`%${category}%`} AND (title ILIKE ${`%${search}%`} OR summary ILIKE ${`%${search}%`})`;
    } else if (category) {
      rawWhere = Prisma.sql`WHERE category ILIKE ${`%${category}%`}`;
    } else if (search) {
      rawWhere = Prisma.sql`WHERE (title ILIKE ${`%${search}%`} OR summary ILIKE ${`%${search}%`})`;
    } else {
      rawWhere = Prisma.empty;
    }

    // Prisma ORM WHERE for newest + oldest sorts and count
    const andConditions: Prisma.ArticleWhereInput[] = [];
    if (category)
      andConditions.push({
        category: { contains: category, mode: 'insensitive' },
      });
    if (search)
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      });
    const where: Prisma.ArticleWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const total = await this.prisma.article.count({ where });

    let data: ArticleDto[];

    if (sort === 'score') {
      data = await this.prisma.$queryRaw<ArticleDto[]>`
        SELECT id, title, url, summary, source, "publishedAt", "createdAt", category, "impactLevel", score
        FROM "Article"
        ${rawWhere}
        ORDER BY
          score * exp(${-DECAY_LAMBDA} * EXTRACT(EPOCH FROM (NOW() - "publishedAt")) / 3600) DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else if (sort === 'impact') {
      data = await this.prisma.$queryRaw<ArticleDto[]>`
        SELECT id, title, url, summary, source, "publishedAt", "createdAt", category, "impactLevel", score
        FROM "Article"
        ${rawWhere}
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
