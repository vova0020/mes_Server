import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './services/events.service';

@Module({
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService], // Экспортируем оба сервиса для других модулей
})
export class WebsocketModule {}