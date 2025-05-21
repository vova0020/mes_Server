import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

type EventPayload = Record<string, any>;

@Injectable()
export class EventsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToRoom(room: string, event: string, payload: EventPayload) {
    this.server?.to(room).emit(event, payload);
  }

  emitToAll(event: string, payload: EventPayload) {
    this.server?.emit(event, payload);
  }
}
