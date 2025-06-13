import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { MaterialGroupsController } from './controllers/materials/material-groups.controller';
import { MaterialsController } from './controllers/materials/materials.controller';
import { MaterialGroupsService } from './services/materials/material-groups.service';
import { MaterialsService } from './services/materials/materials.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { ProductionStagesLevel1Service } from './services/flows/production-stages-level1.service';
import { ProductionStagesLevel2Service } from './services/flows/production-stages-level2.service';
import { ProductionStagesLevel1Controller } from './controllers/flows/production-stages-level1.controller';
import { ProductionStagesLevel2Controller } from './controllers/flows/production-stages-level2.controller';

import { ProductionLinesService } from './services/flows/production-lines.service';
import { ProductionLinesController } from './controllers/flows/production-lines.controller';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
    WebsocketModule,
  ],
  controllers: [
    MaterialGroupsController,
    MaterialsController,
    ProductionLinesController,
    ProductionStagesLevel1Controller,
    ProductionStagesLevel2Controller,
  ],
  providers: [
    MaterialGroupsService,
    MaterialsService,
    ProductionLinesService,
    ProductionStagesLevel1Service,
    ProductionStagesLevel2Service,
  ],
  exports: [
    MaterialGroupsService,
    MaterialsService,
    ProductionLinesService,
    ProductionStagesLevel1Service,
    ProductionStagesLevel2Service,
  ], // Экспортируем сервисы для использования в других модулях
})
export class SettingsModule { }
