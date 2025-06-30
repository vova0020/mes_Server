import { Module } from '@nestjs/common';
import { PackagingController } from './controllers/packaging.controller';
import { PackagePartsController } from './controllers/package-parts.controller';
import { PartPalletsController } from './controllers/part-pallets.controller';
import { PackingAssignmentController } from './controllers/packing-assignment.controller';
import { PackingTaskManagementController } from './controllers/packing-task-management.controller';
import { PackagingService } from './services/packaging.service';
import { PackagePartsService } from './services/package-parts.service';
import { PartPalletsService } from './services/part-pallets.service';
import { PackingAssignmentService } from './services/packing-assignment.service';
import { PackingTaskManagementService } from './services/packing-task-management.service';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [
    PackagingController,
    PackagePartsController,
    PartPalletsController,
    PackingAssignmentController,
    PackingTaskManagementController,
  ],
  providers: [
    PackagingService,
    PackagePartsService,
    PartPalletsService,
    PackingAssignmentService,
    PackingTaskManagementService,
  ],
})
export class PackagingModule {}
