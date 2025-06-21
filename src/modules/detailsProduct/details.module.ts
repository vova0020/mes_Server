import { Module } from '@nestjs/common';
import { DetailsMasterController } from './controllers/detailsMaster.controller';
import { DetailsMasterService } from './services/detailsMaster.service';
import { SharedModule } from '../../shared/shared.module';
import { DetailsMachinsController } from './controllers/dateilsMachins.controller';
import { DetailsMachinNoSmenService } from './services/detailsMachinNoSmen.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { TaskDetailService } from './services/taskDetailMachin.service';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [DetailsMasterController, DetailsMachinsController],
  providers: [
    DetailsMasterService,
    DetailsMachinNoSmenService,
    TaskDetailService,
  ],
  exports: [
    DetailsMasterService,
    DetailsMachinNoSmenService,
    TaskDetailService,
  ],
})
export class DetailsModule {}
