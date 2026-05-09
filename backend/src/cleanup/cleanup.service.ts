/**
 * CleanupService — runs a scheduled job every 4 months to purge articles
 * older than 4 months (by publishedAt). Deletes DigestArticle join rows first
 * to satisfy FK constraints, then deletes the Article rows, all in one transaction.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 1 */4 *')
  async deleteOldArticles(): Promise<void> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear(), cutoff.getMonth() - 4);

    const { deletedCount } = await this.prisma.$transaction(async (tx) => {
      await tx.digestArticle.deleteMany({
        where: { article: { publishedAt: { lt: cutoff } } },
      });

      const { count } = await tx.article.deleteMany({
        where: { publishedAt: { lt: cutoff } },
      });

      return { deletedCount: count };
    });

    this.logger.log(
      `Cleanup complete — deleted ${deletedCount} articles published before ${cutoff.toISOString()}`,
    );
  }
}
