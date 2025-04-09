import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Включаем CORS для веб-приложения
  app.enableCors({
    origin: 'http://localhost:3000', // Разрешаем запросы только с этого источника
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

  await app.listen(5000);
}
bootstrap();
