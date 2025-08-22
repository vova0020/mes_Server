// ===== FILE: src/websockets/services/socket.service.ts =====
// Универсальный сервис-обёртка для общения с socket.io-server из других сервисов
import { Injectable, Logger } from '@nestjs/common'; // Импорт Injectable и Logger
import { Server } from 'socket.io'; // Импорт типа Server из socket.io

@Injectable() // Делаем класс доступным через DI
export class SocketService {
  // Экспорт класса SocketService
  private server: Server | null = null; // Поле для хранения ссылки на Server или null
  private readonly logger = new Logger(SocketService.name); // Логгер для отладки

  setServer(server: Server) {
    // Метод для установки Server (вызывается из Gateway)
    this.server = server; // Сохраняем ссылку на сервер
    this.logger.log('Socket server set in SocketService'); // Логируем факт установки
  }

  getServer(): Server | null {
    // Метод для получения сервера (если нужен)
    return this.server; // Возвращаем сервер или null
  }

  emitToAll(event: string, payload: any) {
    // Метод: отправить событие всем подключённым
    if (!this.server) return; // Если сервер не установлен — выходим
    this.server.emit(event, payload); // Отправляем событие всем
  }

  emitToRoom(room: string, event: string, payload: any) {
    // Метод: отправить событие в комнату
    if (!this.server) return; // Защита от неопределённого сервера
    this.server.to(room).emit(event, payload); // Эмит в конкретную комнату
  }

  emitToSocket(socketId: string, event: string, payload: any) {
    // Метод: отправить событие конкретному socketId
    if (!this.server) return; // Защита
    this.server.to(socketId).emit(event, payload); // Отправляем в указанный socket
  }
}
