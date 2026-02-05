import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PackageDirectoryController } from './controllers/package-directory.controller';
import { PackageParserController } from './controllers/package-parser.controller';
import { PackageDirectoryService } from './services/package-directory.service';
import { PackageParserService } from './services/package-parser.service';
import { PackagesManagementService } from './services/packages-management.service';
import { PackageValidationService } from './services/package-validation.service';

import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    SharedModule,
    WebsocketModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [PackageDirectoryController, PackageParserController],
  providers: [
    PackageDirectoryService,
    PackageParserService,
    PackagesManagementService,
    PackageValidationService,
  ],
  exports: [
    PackageDirectoryService,
    PackageParserService,
    PackagesManagementService,
    PackageValidationService,
  ],
})
export class PackageDirectoryModule {}