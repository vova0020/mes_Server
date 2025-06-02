import { Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module';
import { MachinsMasterController } from './controllers/machinMaster.controller';
import { MachinMasterService } from './services/machinMaster.service';
import { MachinsController } from './controllers/machins.controller';
import { MachinsService } from './services/macins.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [MachinsMasterController, MachinsController],
  providers: [MachinMasterService, MachinsService],
  exports: [MachinMasterService, MachinsService],
})
export class MachinsModule {}
