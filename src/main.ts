import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

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
  await app.listen(5000);
}
bootstrap();
