import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventsService } from './services/events.service';
import { RoomManagerService } from './services/room-manager.service';
import { WebSocketRooms } from './types/rooms.types';

@WebSocketGateway({
  cors: {
    origin: '*', // Или укажите конкретные домены
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 30000,
  pingTimeout: 25000,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly roomManager: RoomManagerService,
  ) {}

  @WebSocketServer()
  server: Server;

  // ================================
  // Lifecycle методы
  // ================================

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('🚀 WebSocket Gateway инициализирован');

    // Запускаем периодическую очистку неактивных подписок
    setInterval(
      () => {
        this.eventsService.cleanup();
      },
      5 * 60 * 1000,
    ); // каждые 5 минут
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔗 Клиент подключен: ${client.id}`);

    // Отправляем клиенту информацию о доступных комнатах
    client.emit('roomsAvailable', {
      rooms: Object.values(WebSocketRooms),
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Клиент отключен: ${client.id}`);

    // Отключаем клиента от всех комнат
    await this.roomManager.leaveAllRooms(client);
  }

  // ================================
  // Обработчики подписки на комнаты
  // ================================

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: WebSocketRooms },
  ) {
    try {
      if (!Object.values(WebSocketRooms).includes(data.room)) {
        client.emit('error', {
          message: `Неизвестная комната: ${data.room}`,
          availableRooms: Object.values(WebSocketRooms),
        });
        return;
      }

      await this.roomManager.joinRoom(client, data.room);

      client.emit('roomJoined', {
        room: data.room,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Клиент ${client.id} присоединился к комнате "${data.room}"`,
      );
    } catch (error) {
      this.logger.error(`❌ Ошибка при присоединении к комнате:`, error);
      client.emit('error', {
        message: 'Ошибка при присоединении к комнате',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: WebSocketRooms },
  ) {
    try {
      await this.roomManager.leaveRoom(client, data.room);

      client.emit('roomLeft', {
        room: data.room,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ Клиент ${client.id} покинул комнату "${data.room}"`);
    } catch (error) {
      this.logger.error(`❌ Ошибка при выходе из комнаты:`, error);
      client.emit('error', {
        message: 'Ошибка при выходе из комнаты',
        error: error.message,
      });
    }
  }

  // ================================
  // Административные методы
  // ================================

  @SubscribeMessage('getRoomStats')
  handleGetRoomStats(@ConnectedSocket() client: Socket) {
    const stats = this.eventsService.getStats();
    client.emit('roomStats', stats);
  }

  @SubscribeMessage('getMyRooms')
  handleGetMyRooms(@ConnectedSocket() client: Socket) {
    const myRooms = this.roomManager.getClientRooms(client.id);
    client.emit('myRooms', {
      rooms: myRooms,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
    });
  }
}
