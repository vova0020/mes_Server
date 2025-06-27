import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  WebSocketRooms,
  RoomEvents,
  BaseEventPayload,
} from '../types/rooms.types';
import { RoomManagerService } from './room-manager.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server;

  constructor(private readonly roomManager: RoomManagerService) {}

  setServer(server: Server) {
    this.server = server;
    this.roomManager.setServer(server);
    this.logger.log('🔌 EventsService: Socket.IO сервер установлен');
  }

  /**
   * Отправить событие в конкретную комнату (типизированно)
   */
  emitToRoom<T extends WebSocketRooms>(
    room: T,
    event: T extends keyof RoomEvents ? keyof RoomEvents[T] : string,
    payload: any,
  ): void {
    if (!this.server) {
      this.logger.warn(
        '⚠️ Попытка отправки события без установленного сервера',
      );
      return;
    }

    const clientCount = this.roomManager.getRoomClientCount(room);

    if (clientCount === 0) {
      this.logger.debug(
        `📭 Событие "${String(event)}" не отправлено - нет клиентов в комнате "${room}"`,
      );
      return;
    }

    try {
      this.server.to(room).emit(String(event), payload);
      this.logger.debug(
        `📤 Событие "${String(event)}" отправлено в комнату "${room}" (${clientCount} клиентов)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Ошибка при отправке события "${String(event)}" в комнату "${room}":`,
        error,
      );
    }
  }

  
  /**
   * Получить статистику событий и комнат
   */
  getStats(): Record<string, any> {
    return {
      serverConnected: !!this.server,
      roomStats: this.roomManager.getAllRoomsStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Очистить неактивные подписки
   */
  cleanup(): void {
    this.roomManager.cleanupInactiveSubscriptions();
  }
}
