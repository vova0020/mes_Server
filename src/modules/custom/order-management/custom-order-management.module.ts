import { Module } from '@nestjs/common';
import { SharedModule } from '../../../shared/shared.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { CustomOrderParserController } from './controllers/custom-order-parser.controller';
import { CustomOrderStatisticsController } from './controllers/custom-order-statistics.controller';
import { CustomOrderParserService } from './services/custom-order-parser.service';
import { CustomOrderFromFileService } from './services/custom-order-from-file.service';
import { CustomOrderStatisticsService } from './services/custom-order-statistics.service';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [CustomOrderParserController, CustomOrderStatisticsController],
  providers: [
    CustomOrderParserService,
    CustomOrderFromFileService,
    CustomOrderStatisticsService,
  ],
  exports: [
    CustomOrderParserService,
    CustomOrderFromFileService,
    CustomOrderStatisticsService,
  ],
})
export class CustomOrderManagementModule {}
