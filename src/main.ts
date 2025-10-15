import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
}

bootstrap();
