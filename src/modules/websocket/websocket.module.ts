import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './services/events.service';
import { RoomManagerService } from './services/room-manager.service';

@Module({
  providers: [EventsGateway, EventsService, RoomManagerService],
  exports: [EventsGateway, EventsService, RoomManagerService],
})
export class WebsocketModule {}
