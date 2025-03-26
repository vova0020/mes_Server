import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // удаляет свойства, отсутствующие в DTO
      forbidNonWhitelisted: true, // выбрасывает исключение, если присутствуют лишние свойства
      transform: true, // преобразует входящие данные в экземпляры классов DTO
    }),
  );
  await app.listen(3000);
}
bootstrap();
