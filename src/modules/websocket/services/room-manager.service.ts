import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketRooms, RoomSubscription } from '../types/rooms.types';

/**
 * Централизованный менеджер комнат WebSocket
 */
@Injectable()
export class RoomManagerService {
  private readonly logger = new Logger(RoomManagerService.name);
  private server: Server;
  private roomSubscriptions = new Map<string, RoomSubscription[]>();

  /**
   * Установить сервер Socket.IO
   */
  setServer(server: Server) {
    this.server = server;
    this.logger.log('🔌 RoomManager: Socket.IO сервер установлен');
  }

  /**
   * Присоединить клиента к комнате
   */
  async joinRoom(client: Socket, room: WebSocketRooms): Promise<void> {
    try {
      await client.join(room);

      // Сохраняем информацию о подписке
      const subscription: RoomSubscription = {
        room,
        clientId: client.id,
        joinedAt: new Date(),
      };

      if (!this.roomSubscriptions.has(room)) {
        this.roomSubscriptions.set(room, []);
      }

      const roomSubs = this.roomSubscriptions.get(room)!;
      // Удаляем старую подписку если есть
      const existingIndex = roomSubs.findIndex(
        (sub) => sub.clientId === client.id,
      );
      if (existingIndex !== -1) {
        roomSubs.splice(existingIndex, 1);
      }

      roomSubs.push(subscription);

      this.logger.log(
        `👤 Клиент ${client.id} присоединился к комнате "${room}"`,
      );
      this.logRoomStats(room);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка при присоединении к комнате "${room}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Отключить клиента от комнаты
   */
  async leaveRoom(client: Socket, room: WebSocketRooms): Promise<void> {
    try {
      await client.leave(room);

      // Удаляем информацию о подписке
      const roomSubs = this.roomSubscriptions.get(room);
      if (roomSubs) {
        const index = roomSubs.findIndex((sub) => sub.clientId === client.id);
        if (index !== -1) {
          roomSubs.splice(index, 1);
        }
      }

      this.logger.log(`👤 Клиент ${client.id} покинул комнату "${room}"`);
      this.logRoomStats(room);
    } catch (error) {
      this.logger.error(`❌ Ошибка при выходе из комнаты "${room}":`, error);
      throw error;
    }
  }

  /**
   * Отключить клиента от всех комнат
   */
  async leaveAllRooms(client: Socket): Promise<void> {
    try {
      // Находим все комнаты клиента
      const clientRooms: WebSocketRooms[] = [];

      for (const [room, subscriptions] of this.roomSubscriptions.entries()) {
        if (subscriptions.some((sub) => sub.clientId === client.id)) {
          clientRooms.push(room as WebSocketRooms);
        }
      }

      // Отключаем от всех комнат
      for (const room of clientRooms) {
        await this.leaveRoom(client, room);
      }

      this.logger.log(
        `👤 Клиент ${client.id} отключен от всех комнат (${clientRooms.length})`,
      );
    } catch (error) {
      this.logger.error(`❌ Ошибка при отключении от всех комнат:`, error);
    }
  }

  /**
   * Получить список клиентов в комнате
   */
  getRoomClients(room: WebSocketRooms): RoomSubscription[] {
    return this.roomSubscriptions.get(room) || [];
  }

  /**
   * Получить количество клиентов в комнате
   */
  getRoomClientCount(room: WebSocketRooms): number {
    return this.getRoomClients(room).length;
  }

  /**
   * Получить все активные комнаты
   */
  getActiveRooms(): { room: WebSocketRooms; clientCount: number }[] {
    const activeRooms: { room: WebSocketRooms; clientCount: number }[] = [];

    for (const [room, subscriptions] of this.roomSubscriptions.entries()) {
      if (subscriptions.length > 0) {
        activeRooms.push({
          room: room as WebSocketRooms,
          clientCount: subscriptions.length,
        });
      }
    }

    return activeRooms;
  }

  /**
   * Проверить, подключен ли клиент к комнате
   */
  isClientInRoom(clientId: string, room: WebSocketRooms): boolean {
    const roomSubs = this.roomSubscriptions.get(room);
    return roomSubs ? roomSubs.some((sub) => sub.clientId === clientId) : false;
  }

  /**
   * Получить все комнаты клиента
   */
  getClientRooms(clientId: string): WebSocketRooms[] {
    const clientRooms: WebSocketRooms[] = [];

    for (const [room, subscriptions] of this.roomSubscriptions.entries()) {
      if (subscriptions.some((sub) => sub.clientId === clientId)) {
        clientRooms.push(room as WebSocketRooms);
      }
    }

    return clientRooms;
  }

  /**
   * Логирование статистики комнаты
   */
  private logRoomStats(room: WebSocketRooms): void {
    const clientCount = this.getRoomClientCount(room);
    this.logger.debug(`📊 Комната "${room}": ${clientCount} клиентов`);
  }

  /**
   * Получить полную статистику всех комнат
   */
  getAllRoomsStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    // Статистика по каждой комнате
    Object.values(WebSocketRooms).forEach((room) => {
      const clients = this.getRoomClients(room);
      stats[room] = {
        clientCount: clients.length,
        clients: clients.map((sub) => ({
          clientId: sub.clientId,
          joinedAt: sub.joinedAt,
          duration: Date.now() - sub.joinedAt.getTime(),
        })),
      };
    });

    // Общая статистика
    const totalClients = Object.values(stats).reduce(
      (sum, room) => sum + room.clientCount,
      0,
    );
    const activeRooms = Object.values(stats).filter(
      (room) => room.clientCount > 0,
    ).length;

    stats._summary = {
      totalClients,
      activeRooms,
      totalRooms: Object.values(WebSocketRooms).length,
    };

    return stats;
  }

  /**
   * Очистить неактивные подписки (для очистки памяти)
   */
  cleanupInactiveSubscriptions(): void {
    let cleanedCount = 0;

    for (const [room, subscriptions] of this.roomSubscriptions.entries()) {
      const activeSubs = subscriptions.filter((sub) => {
        // Проверяем, активен ли клиент через Socket.IO
        const socket = this.server?.sockets.sockets.get(sub.clientId);
        return socket && socket.connected;
      });

      const removedCount = subscriptions.length - activeSubs.length;
      cleanedCount += removedCount;

      if (removedCount > 0) {
        this.roomSubscriptions.set(room, activeSubs);
        this.logger.debug(
          `🧹 Очищено ${removedCount} неактивных подписок из комнаты "${room}"`,
        );
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`🧹 Всего очищено ${cleanedCount} неактивных подписок`);
    }
  }
}
