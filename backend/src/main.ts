import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins = [/^http:\/\/localhost(:\d+)?$/, process.env.FRONTEND_URL].filter(Boolean);
  app.enableCors({ origin: allowedOrigins });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
