import { Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { IngestionService, IngestionResult } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(@Query('limit') limit?: string): Promise<IngestionResult> {
    return this.ingestionService.fetchAllFeeds(
      limit ? Number(limit) : undefined,
    );
  }

  @Post('process-backlog')
  @HttpCode(HttpStatus.OK)
  processBacklog(@Query('limit') limit?: string): Promise<{ queued: number }> {
    return this.ingestionService.processBacklog(
      limit ? Number(limit) : undefined,
    );
  }
}
