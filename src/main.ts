import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Создаем приложение NestJS
  const app = await NestFactory.create(AppModule);

  // Включаем глобальный пайп для валидации (опционально)
  // app.useGlobalPipes(new ValidationPipe());

  // Запускаем сервер на порту 3000 (можно изменить в .env или конфигурации)
  await app.listen(3000);
}
bootstrap();
