import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const frontendOrigin = process.env.FRONTEND_URL
    ? new URL(process.env.FRONTEND_URL).origin
    : undefined;
  const allowedOrigins = [/^http:\/\/localhost(:\d+)?$/, frontendOrigin].filter(
    Boolean,
  );
  app.enableCors({ origin: allowedOrigins });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
