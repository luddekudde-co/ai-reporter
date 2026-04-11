import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiProcessingService } from './ai-processing.service';
import { AiProcessingProcessor } from './ai-processing.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'article-processing' })],
  providers: [AiProcessingService, AiProcessingProcessor],
  exports: [BullModule],
})
export class AiProcessingModule {}
