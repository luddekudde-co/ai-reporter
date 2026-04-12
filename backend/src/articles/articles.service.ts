import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleDto, ArticlesResponseDto } from './dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    category?: string,
  ): Promise<ArticlesResponseDto> {
    const skip = (page - 1) * limit;
    const where = category
      ? { category: { contains: category, mode: 'insensitive' as const } }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }
}
