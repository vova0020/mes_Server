import { Module } from '@nestjs/common';
import { SharedModule } from '../../../shared/shared.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { CustomOrderParserController } from './controllers/custom-order-parser.controller';
import { CustomOrderParserService } from './services/custom-order-parser.service';
import { CustomOrderFromFileService } from './services/custom-order-from-file.service';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [CustomOrderParserController],
  providers: [CustomOrderParserService, CustomOrderFromFileService],
  exports: [CustomOrderParserService, CustomOrderFromFileService],
})
export class CustomOrderManagementModule {}
