import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArticlesModule } from './articles/articles.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AiProcessingModule } from './ai-processing/ai-processing.module';
import { DigestModule } from './digest/digest.module';

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (url) {
    return { url };
  }
  return { host: 'localhost', port: 6379 };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: redisConnection() }),
    PrismaModule,
    ArticlesModule,
    IngestionModule,
    AiProcessingModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
