import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrderManagementController } from './controllers/order-management.controller';
import { OrderStatisticsController } from './controllers/order-statistics.controller';
import { OrderParserController } from './controllers/order-parser.controller';
import { OrderManagementService } from './services/order-management.service';
import { OrderStatisticsService } from './services/order-statistics.service';
import { OrderParserService } from './services/order-parser.service';
import { OrderValidationService } from './services/order-validation.service';
import { OrderFromFileService } from './services/order-from-file.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
    WebsocketModule,
  ],
  controllers: [
    OrderManagementController,
    OrderStatisticsController,
    OrderParserController,
  ],
  providers: [
    OrderManagementService,
    OrderStatisticsService,
    OrderParserService,
    OrderValidationService,
    OrderFromFileService,
  ],
  exports: [OrderManagementService, OrderStatisticsService],
})
export class OrderManagementModule {}