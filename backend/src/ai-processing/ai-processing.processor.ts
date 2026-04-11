import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiProcessingService } from './ai-processing.service';

@Processor('article-processing')
export class AiProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessingProcessor.name);

  constructor(private readonly aiProcessingService: AiProcessingService) {
    super();
  }

  async process(job: Job<{ articleId: number }>): Promise<void> {
    this.logger.debug(`Processing job ${job.id} for article ${job.data.articleId}`);
    await this.aiProcessingService.processArticle(job.data.articleId);
  }
}
