import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Или укажите конкретные домены
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 30000,
  pingTimeout: 25000,
}) // Можно указать порт или namespace, если нужно
export class EventsGateway {
  // С помощью декоратора @WebSocketServer() получаем экземпляр Socket.IO-сервера
  @WebSocketServer()
  server: Server;

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
}