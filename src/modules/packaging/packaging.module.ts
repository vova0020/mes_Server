import { Module } from '@nestjs/common';
import { PackagingController } from './controllers/packaging.controller';
import { PackagePartsController } from './controllers/package-parts.controller';
import { PartPalletsController } from './controllers/part-pallets.controller';
import { PackagingService } from './services/packaging.service';
import { PackagePartsService } from './services/package-parts.service';
import { PartPalletsService } from './services/part-pallets.service';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [PackagingController, PackagePartsController, PartPalletsController],
  providers: [PackagingService, PackagePartsService, PartPalletsService],
})
export class PackagingModule {}