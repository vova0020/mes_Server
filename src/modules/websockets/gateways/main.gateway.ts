// src/websockets/gateways/main.gateway.ts
// Основной Gateway — версия для локальной разработки без требования токена.

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'; // Импорты для WebSocket
import { Server, Socket } from 'socket.io'; // Типы socket.io
import { Logger } from '@nestjs/common'; // Логгер
import { SocketService } from '../services/socket.service'; // Сервис для отправки сообщений из других сервисов
import { RoomService } from '../services/room.service'; // Сервис управления комнатами
import { WS_EVENTS } from '../constants/events.constants'; // Константы событий

// CORS разрешён для всех origin — удобно для локалки (в проде ограничьте)
@WebSocketGateway({ cors: { origin: true } })
export class MainGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MainGateway.name); // Логгер класс-имя

  @WebSocketServer() server: Server; // Nest инжектирует экземпляр socket.io server

  constructor(
    private readonly socketService: SocketService, // Сохраняем SocketService
    private readonly roomService: RoomService, // Сохраняем RoomService
  ) {}

  // Вызывается при старте gateway — связываем сервер с SocketService
  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized (no-auth mode)');
    this.socketService.setServer(server); // Настраиваем SocketService
  }

  // Обработка нового подключения
  async handleConnection(client: Socket) {
    // В локальной версии мы НЕ требуем токен — если он есть, можете обработать его здесь.
    try {
      // Попробуем прочитать токен, но не требуем его
      const token =
        (client.handshake.auth && (client.handshake.auth as any).token) ||
        (client.handshake.query && (client.handshake.query as any).token);

      if (token) {
        // Если токен вдруг пришёл и вы хотите в будущем его проверять — сюда можно вставить verify.
        // В локалке мы просто логируем, что токен есть, но не проверяем:
        this.logger.log(
          `Client ${client.id} connected with token (not verified in local mode)`,
        );
        // Можно установить (client as any).user = { userId: 'from-token', ... }
      } else {
        // Если токена нет — считаем пользователя анонимным и используем socket.id как userId
        const anonUserId = `anon:${client.id}`; // формируем идентификатор
        (client as any).user = { userId: anonUserId, email: undefined }; // сохраняем минимальную инфу
        this.logger.log(
          `Client ${client.id} connected as anonymous (${anonUserId})`,
        );
      }

      // В локалке удобно подписывать клиента на персональную комнату по socket.id
      const personalRoom = `user:${client.id}`; // персональная комната основана на socket.id
      await client.join(personalRoom); // клиент автоматически заходит в свою персональную комнату
      this.logger.log(
        `Client ${client.id} joined personal room ${personalRoom}`,
      );
    } catch (err) {
      // Если что-то пошло не так — просто логируем и отключаем (реже нужно в локалке)
      this.logger.error('Connection handling error (local mode)', err as Error);
      client.disconnect(true);
    }
  }

  // Обработка отключения клиента
  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    this.logger.log(
      `Client disconnected: ${client.id}${user ? ` (user ${user.userId})` : ''}`,
    );
  }

  // Клиент может запросить присоединение к комнате: { room: 'order:42' }
  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  async handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.room) {
      client.emit('error', { message: 'room is required' }); // отвечаем ошибкой, если нет поля
      return;
    }

    // В локальной версии мы разрешаем join в любую комнату.
    // Если вам нужно запретить вход в приватные комнаты — проверяйте здесь.
    await this.roomService.join(client, data.room);
    client.emit('joined', { room: data.room }); // подтверждение клиенту
    this.logger.log(`Client ${client.id} joined room ${data.room}`);
  }

  // Клиент может покинуть комнату: { room: 'order:42' }
  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.room) {
      client.emit('error', { message: 'room is required' });
      return;
    }
    await this.roomService.leave(client, data.room);
    client.emit('left', { room: data.room });
    this.logger.log(`Client ${client.id} left room ${data.room}`);
  }
}
