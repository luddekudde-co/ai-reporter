import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DigestService } from './digest.service';
import { DigestProcessor } from './digest.processor';
import { DigestController } from './digest.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'weekly-digest' })],
  providers: [DigestService, DigestProcessor],
  controllers: [DigestController],
})
export class DigestModule {}
