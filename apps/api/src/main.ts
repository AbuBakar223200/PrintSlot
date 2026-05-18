import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes under /api
  app.setGlobalPrefix('api');

  // CORS for mobile development
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🖨️ PrintSlot API running on http://localhost:${port}/api`);
}

bootstrap();
