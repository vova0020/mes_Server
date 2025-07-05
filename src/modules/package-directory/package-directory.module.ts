import { Module } from '@nestjs/common';
import { PackageDirectoryController } from './controllers/package-directory.controller';
import { PackageDirectoryService } from './services/package-directory.service';
import { ParserModule } from './parser/parser.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule, ParserModule],
  controllers: [PackageDirectoryController],
  providers: [PackageDirectoryService],
  exports: [PackageDirectoryService],
})
export class PackageDirectoryModule {}