import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включаем CORS для веб-приложения
  app.enableCors({
    origin: 'http://localhost:3000', // Или IP/домен твоего фронтенда
    // origin: 'http://91.222.236.176:3000', // Или IP/домен твоего фронтенда
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true, // Разрешаем передачу куки и заголовков авторизации
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // удаляет свойства, отсутствующие в DTO
      forbidNonWhitelisted: true, // выбрасывает исключение, если присутствуют лишние свойства
      transform: true, // преобразует входящие данные в экземпляры классов DTO
    }),
  );

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('MES API')
    .setDescription('API для системы управления производством')
    .setVersion('1.0')
    .addBearerAuth() // Если у вас есть авторизация через JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = 5000;
  // Привязываем к 0.0.0.0, чтобы слушать и IPv4, и IPv6
  await app.listen(PORT, '0.0.0.0');
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
}

bootstrap();
