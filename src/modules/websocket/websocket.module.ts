import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './services/events.service';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway], // Экспортируем сервис для других модулей
})
export class WebsocketModule {}