import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrdersYpackController } from './controllers/ordersYpack.controller';
import { OrdersYpackService } from './services/ordersYpack.service';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [OrdersController, OrdersYpackController],
  providers: [OrdersService, OrdersYpackService],
})
export class OrdersModule {}
