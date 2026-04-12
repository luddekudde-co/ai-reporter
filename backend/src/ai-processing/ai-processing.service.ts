/**
 * AiProcessingService — calls OpenAI to enrich a single article with a proper summary,
 * category tag, and impact level. Updates the article in the DB and marks it as processed.
 */
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { processorPrompt } from './prompts/processor-prompt';

interface AiResult {
  summary: string;
  category: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class AiProcessingService {
  private readonly logger = new Logger(AiProcessingService.name);
  private readonly openai = new OpenAI();

  constructor(private readonly prisma: PrismaService) {}

  async processArticle(id: number): Promise<void> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      this.logger.warn(`Article ${id} not found, skipping`);
      return;
    }

    if (article.aiProcessed) {
      this.logger.debug(`Article ${id} already processed, skipping`);
      return;
    }

    this.logger.log(`Processing article ${id}: "${article.title}"`);

    const prompt = processorPrompt(
      article.title,
      article.source,
      article.summary ?? 'no snippet available',
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const result = JSON.parse(raw) as Partial<AiResult>;

      const summary = result.summary ?? article.summary;
      const category = result.category ?? null;
      const impactLevel = this.parseImpactLevel(result.impactLevel);

      await this.prisma.article.update({
        where: { id },
        data: { summary, category, impactLevel, aiProcessed: true },
      });

      this.logger.log(
        `Article ${id} processed — category: ${category}, impact: ${impactLevel}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to process article ${id} ("${article.title}"): ${message}`,
      );
      throw err;
    }
  }

  private parseImpactLevel(
    value: string | undefined,
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH') return value;
    return 'MEDIUM';
  }
}
