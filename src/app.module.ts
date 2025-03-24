import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

// Корневой модуль, подключающий все модули приложения
@Module({
  imports: [AuthModule],
})
export class AppModule {}
