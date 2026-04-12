/**
 * DigestService — generates and retrieves weekly AI news digests.
 * Selects the top 10 most impactful articles from the past 7 days,
 * calls OpenAI to produce a weekly summary paragraph, then persists the digest.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import OpenAI from 'openai';
import { ImpactLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { digestPrompt } from './prompts/digest-prompt';

const IMPACT_RANK: Record<ImpactLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private readonly openai = new OpenAI();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('weekly-digest') private readonly digestQueue: Queue,
  ) {}

  @Cron('0 0 * * 1')
  async scheduleWeeklyDigest(): Promise<void> {
    this.logger.log('Scheduling weekly digest generation');
    await this.digestQueue.add('generate', {});
  }

  async enqueueGeneration(): Promise<void> {
    await this.digestQueue.add('generate', {});
    this.logger.log('Digest generation job enqueued');
  }

  async generateDigest(): Promise<void> {
    const weekStartDate = this.getWeekStartDate();
    this.logger.log(
      `Generating digest for week of ${weekStartDate.toISOString()}`,
    );

    const since = new Date(weekStartDate);
    since.setDate(since.getDate() - 7);

    const rawArticles = await this.prisma.article.findMany({
      where: { aiProcessed: true, publishedAt: { gte: since } },
    });

    if (rawArticles.length === 0) {
      this.logger.warn('No processed articles found for this week, skipping');
      return;
    }

    const sorted = rawArticles
      .sort((a, b) => {
        const impactDiff =
          IMPACT_RANK[a.impactLevel ?? 'MEDIUM'] -
          IMPACT_RANK[b.impactLevel ?? 'MEDIUM'];
        if (impactDiff !== 0) return impactDiff;
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      })
      .slice(0, 10);

    const prompt = digestPrompt(sorted);
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    const weekSummary =
      response.choices[0]?.message?.content?.trim() ?? 'No summary generated.';

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.digest.findUnique({ where: { weekStartDate } });
      if (existing) {
        await tx.digestArticle.deleteMany({ where: { digestId: existing.id } });
        await tx.digest.update({
          where: { id: existing.id },
          data: { weekSummary },
        });
        await tx.digestArticle.createMany({
          data: sorted.map((a, i) => ({
            digestId: existing.id,
            articleId: a.id,
            rank: i + 1,
          })),
        });
      } else {
        const digest = await tx.digest.create({
          data: { weekStartDate, weekSummary },
        });
        await tx.digestArticle.createMany({
          data: sorted.map((a, i) => ({
            digestId: digest.id,
            articleId: a.id,
            rank: i + 1,
          })),
        });
      }
    });

    this.logger.log(
      `Digest generated with ${sorted.length} articles for week of ${weekStartDate.toISOString()}`,
    );
  }

  async getLatestDigest() {
    const digest = await this.prisma.digest.findFirst({
      orderBy: { weekStartDate: 'desc' },
      include: {
        articles: {
          orderBy: { rank: 'asc' },
          include: { article: true },
        },
      },
    });

    if (!digest) throw new NotFoundException('No digest available yet');
    return digest;
  }

  async getDigestById(id: number) {
    const digest = await this.prisma.digest.findUnique({
      where: { id },
      include: {
        articles: {
          orderBy: { rank: 'asc' },
          include: { article: true },
        },
      },
    });

    if (!digest) throw new NotFoundException(`Digest ${id} not found`);
    return digest;
  }

  private getWeekStartDate(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
