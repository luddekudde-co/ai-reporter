/**
 * IngestionService — fetches articles from RSS feeds and upserts them to the database.
 * Runs automatically every hour via @Cron, and can be triggered manually via IngestionController.
 * Deduplication is handled by Prisma's upsert on the unique `url` field (no-op on conflict).
 * New articles are enqueued for AI processing via BullMQ after being saved.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Parser from 'rss-parser';
import { PrismaService } from '../prisma/prisma.service';
import { RSS_FEEDS, FeedConfig } from './feeds.config';

export interface IngestionResult {
  fetched: number;
  created: number;
  skipped: number;
  queued: number;
  errors: string[];
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly parser = new Parser();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('article-processing') private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async fetchAllFeeds(limit?: number): Promise<IngestionResult> {
    this.logger.log('Starting RSS ingestion run');

    const result: IngestionResult = {
      fetched: 0,
      created: 0,
      skipped: 0,
      queued: 0,
      errors: [],
    };

    for (const feed of RSS_FEEDS) {
      try {
        const stats = await this.processFeed(feed, limit);
        result.fetched += stats.fetched;
        result.created += stats.created;
        result.skipped += stats.skipped;
        result.queued += stats.queued;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process feed ${feed.source}: ${message}`);
        result.errors.push(`${feed.source}: ${message}`);
      }
    }

    this.logger.log(
      `Ingestion complete — fetched: ${result.fetched}, created: ${result.created}, queued for AI: ${result.queued}`,
    );

    return result;
  }

  async processBacklog(limit?: number): Promise<{ queued: number }> {
    const unprocessed = await this.prisma.article.findMany({
      where: { aiProcessed: false },
      select: { id: true },
      ...(limit ? { take: limit } : {}),
    });

    for (const article of unprocessed) {
      await this.queue.add('process', { articleId: article.id });
    }

    this.logger.log(`Queued ${unprocessed.length} articles for AI processing`);
    return { queued: unprocessed.length };
  }

  private async processFeed(
    feed: FeedConfig,
    limit?: number,
  ): Promise<{
    fetched: number;
    created: number;
    skipped: number;
    queued: number;
  }> {
    const parsed = await this.parser.parseURL(feed.url);
    const allItems = parsed.items ?? [];
    const items = limit ? allItems.slice(0, limit) : allItems;

    let created = 0;
    let skipped = 0;
    let queued = 0;

    for (const item of items) {
      const url = item.link?.trim();
      const title = item.title?.trim();

      if (!url || !title) {
        skipped++;
        continue;
      }

      const publishedAt = item.isoDate
        ? new Date(item.isoDate)
        : item.pubDate
          ? new Date(item.pubDate)
          : new Date();

      const rawSummary = item.contentSnippet ?? item.content ?? null;
      const summary = rawSummary ? rawSummary.slice(0, 500) : null;

      try {
        const article = await this.prisma.article.upsert({
          where: { url },
          create: { title, url, summary, source: feed.source, publishedAt },
          update: {},
        });

        if (!article.aiProcessed) {
          await this.queue.add('process', { articleId: article.id });
          queued++;
        }

        created++;
      } catch (err) {
        skipped++;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Skipped article "${title}": ${message}`);
      }
    }

    return { fetched: items.length, created, skipped, queued };
  }
}
