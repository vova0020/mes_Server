import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { MaterialGroupsController } from './controllers/material-groups.controller';
import { MaterialsController } from './controllers/materials.controller';
import { MaterialGroupsService } from './services/material-groups.service';
import { MaterialsService } from './services/materials.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule, // Импортируем SharedModule для доступа к PrismaService
  ],
  controllers: [MaterialGroupsController, MaterialsController],
  providers: [MaterialGroupsService, MaterialsService],
  exports: [MaterialGroupsService, MaterialsService], // Экспортируем сервисы для использования в других модулях
})
export class SettingsModule {}
