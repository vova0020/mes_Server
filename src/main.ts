import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Статическая раздача файлов из папки uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Статическая раздача изображений настроек
  app.useStaticAssets(join(process.cwd(), 'src', 'modules', 'settings', 'uploads'), {
    prefix: '/settings/uploads/',
  });

  // Включаем CORS для веб-приложения
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('MES API')
    .setDescription('API для системы управления производством')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Берем порт из переменной окружения или используем 5000 по умолчанию
  const PORT = process.env.PORT || 5000;

  await app.listen(PORT, '0.0.0.0');
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL}`);
}

bootstrap();
