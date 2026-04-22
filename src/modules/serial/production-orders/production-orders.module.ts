import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ProductionOrdersController } from './controllers/production-orders.controller';
import { ProductionOrdersService } from './services/production-orders.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
    WebsocketModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService],
  exports: [ProductionOrdersService],
})
export class ProductionOrdersModule {}