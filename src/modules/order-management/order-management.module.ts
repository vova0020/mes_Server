import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrderManagementController } from './controllers/order-management.controller';
import { OrderStatisticsController } from './controllers/order-statistics.controller';
import { OrderManagementService } from './services/order-management.service';
import { OrderStatisticsService } from './services/order-statistics.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
    WebsocketModule,
  ],
  controllers: [OrderManagementController, OrderStatisticsController],
  providers: [OrderManagementService, OrderStatisticsService],
  exports: [OrderManagementService, OrderStatisticsService],
})
export class OrderManagementModule {}