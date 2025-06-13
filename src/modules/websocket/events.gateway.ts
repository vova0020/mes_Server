import { OnGatewayInit } from '@nestjs/websockets';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventsService } from './services/events.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Или укажите конкретные домены
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 30000,
  pingTimeout: 25000,
}) // Можно указать порт или namespace, если нужно
export class EventsGateway implements OnGatewayInit {
  constructor(private readonly eventsService: EventsService) {}

  // С помощью декоратора @WebSocketServer() получаем экземпляр Socket.IO-сервера
  @WebSocketServer()
  server: Server;

  // Инициализация после создания сервера
  afterInit(server: Server) {
    this.eventsService.setServer(server);
  }

  // Обработчик события от клиента для присоединения к комнате "orders"
  @SubscribeMessage('joinPalletsRoom')
  handleJoinOrdersRoom(@ConnectedSocket() client: Socket) {
    client.join('palets');
  }

  // Обработчик события от клиента для присоединения к комнате "machines"
  @SubscribeMessage('joinMachinesRoom')
  handleJoinMachinesRoom(@ConnectedSocket() client: Socket) {
    client.join('machines');
  }

  // Обработчик события от клиента для присоединения к комнате "materials"
  @SubscribeMessage('joinMaterialsRoom')
  handleJoinMaterialsRoom(@ConnectedSocket() client: Socket) {
    client.join('materials');
  }

  // Обработчик события от клиента для присоединения к комнате "materialGroups"
  @SubscribeMessage('joinMaterialGroupsRoom')
  handleJoinMaterialGroupsRoom(@ConnectedSocket() client: Socket) {
    client.join('materialGroups');
  }
}