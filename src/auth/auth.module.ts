import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

// Модуль, объединяющий компоненты аутентификации: контроллер, сервис, стратегию и Prisma
@Module({
  imports: [
    JwtModule.register({
      // Секрет для подписи JWT, лучше хранить в переменной окружения
      secret: process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
      // Время жизни токена (например, 8 часов)
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
})
export class AuthModule {}
