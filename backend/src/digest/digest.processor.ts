import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DigestService } from './digest.service';

@Processor('weekly-digest')
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(private readonly digestService: DigestService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing digest job ${job.id}`);
    await this.digestService.generateDigest();
  }
}
