import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'article-processing' })],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
