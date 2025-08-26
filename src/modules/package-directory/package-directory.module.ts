import { Module } from '@nestjs/common';
import { PackageDirectoryController } from './controllers/package-directory.controller';
import { PackageDirectoryService } from './services/package-directory.service';

import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [PackageDirectoryController],
  providers: [PackageDirectoryService],
  exports: [PackageDirectoryService],
})
export class PackageDirectoryModule {}