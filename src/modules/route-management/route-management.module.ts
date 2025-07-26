import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RouteManagementController } from './controllers/route-management.controller';
import { RouteManagementService } from './services/route-management.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
    WebsocketModule,
  ],
  controllers: [
    RouteManagementController,
  ],
  providers: [
    RouteManagementService,
  ],
  exports: [
    RouteManagementService,
  ],
})
export class RouteManagementModule {}