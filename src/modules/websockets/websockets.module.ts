// ===== FILE: src/websockets/websockets.module.ts =====
// Модуль, собирающий все Websocket-артефакты вместе и экспортирующий SocketService
import { Module } from '@nestjs/common'; // Импорт декоратора Module
import { MainGateway } from './gateways/main.gateway'; // Импорт Gateway
import { SocketService } from './services/socket.service'; // Импорт SocketService
import { RoomService } from './services/room.service'; // Импорт RoomService
import { JwtModule, JwtService } from '@nestjs/jwt'; // Импорт JwtModule и JwtService (опционально)

@Module({
  // Декоратор Module с метаданными
  imports: [
    // Список импортируемых модулей
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'replace_this_secret',
      signOptions: { expiresIn: '1h' },
    }), // Настройка JwtModule с placeholder-secret
  ],
  providers: [MainGateway, SocketService, RoomService, JwtService], // Провайдеры модуля
  exports: [SocketService, RoomService], // Экспортируем сервисы чтобы использовать их в других модулях
})
export class WebsocketsModule {} // Экспорт класса модуля
