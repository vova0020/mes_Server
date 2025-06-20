import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { MaterialGroupsController } from './controllers/materials/material-groups.controller';
import { MaterialsController } from './controllers/materials/materials.controller';
import { MaterialGroupsService } from './services/materials/material-groups.service';
import { MaterialsService } from './services/materials/materials.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { ProductionStagesLevel1Service } from './services/line/production-stages-level1.service';
import { ProductionStagesLevel2Service } from './services/line/production-stages-level2.service';
import { ProductionStagesLevel1Controller } from './controllers/line/production-stages-level1.controller';
import { ProductionStagesLevel2Controller } from './controllers/line/production-stages-level2.controller';
import { ProductionLinesService } from './services/line/production-lines.service';
import { ProductionLinesController } from './controllers/line/production-lines.controller';
import { RoutesController } from './controllers/route/routes.controller';
import { RoutesService } from './services/route/routes.service';
import { RouteStagesService } from './services/route/route-stages.service';
import { MachinesService } from './services/machines/machines.service';
import { MachinesController } from './controllers/machines/machines.controller';
import { BuffersController } from './controllers/buffers/buffers.controller';
import { BuffersService } from './services/buffers/buffers.service';
import { BufferCellsService } from './services/buffers/buffer-cells.service';
import { BufferStagesService } from './services/buffers/buffer-stages.service';
import { UsersService } from './services/users/users.service';
import { UsersController } from './controllers/users/users.controller';
import { PickersService } from './services/users/pickers.service';

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
    RoutesController,
    MachinesController,
    BuffersController,
    UsersController,
  ],
  providers: [
    MaterialGroupsService,
    MaterialsService,
    ProductionLinesService,
    ProductionStagesLevel1Service,
    ProductionStagesLevel2Service,
    RoutesService,
    RouteStagesService,
    MachinesService,
    BuffersService,
    BufferCellsService,
    BufferStagesService,
    UsersService,
    PickersService,
  ],
  exports: [
    MaterialGroupsService,
    MaterialsService,
    ProductionLinesService,
    ProductionStagesLevel1Service,
    ProductionStagesLevel2Service,
    RoutesService,
    RouteStagesService,
    MachinesService,
    BuffersService,
    BufferCellsService,
    BufferStagesService,
    UsersService,
    PickersService,
  ],
})
export class SettingsModule {}