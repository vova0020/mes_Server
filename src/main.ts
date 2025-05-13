import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включаем CORS для веб-приложения
  app.enableCors({
    origin: 'http://localhost:3000', // Или IP/домен твоего фронтенда
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

  const PORT = 5000;
  // Привязываем к 0.0.0.0, чтобы слушать и IPv4, и IPv6
  await app.listen(PORT, '0.0.0.0');
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
}

bootstrap();
