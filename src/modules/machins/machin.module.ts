import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SharedModule } from '../../shared/shared.module';
import { MachinsMasterController } from './controllers/machinMaster.controller';
import { MachinMasterService } from './services/machinMaster.service';
import { MachinsController } from './controllers/machins.controller';
import { MachinsService } from './services/macins.service';
import { MachineSchedulerService } from './services/machine-scheduler.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule, ScheduleModule.forRoot()],
  controllers: [MachinsMasterController, MachinsController],
  providers: [MachinMasterService, MachinsService, MachineSchedulerService],
  exports: [MachinMasterService, MachinsService],
})
export class MachinsModule {}
