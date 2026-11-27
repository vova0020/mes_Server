import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SharedModule } from '../../shared/shared.module';
import { MachinsMasterController } from './controllers/machinMaster.controller';
import { MachinMasterService } from './services/machinMaster.service';
import { MachinsController } from './controllers/machins.controller';
import { MachinsService } from './services/macins.service';
import { MachineSchedulerService } from './services/machine-scheduler.service';
import { MasterOperatorBindingController } from './controllers/master-operator-binding.controller';
import { MasterOperatorBindingService } from './services/master-operator-binding.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    SharedModule,
    WebsocketModule,
    SettingsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    MachinsMasterController,
    MachinsController,
    MasterOperatorBindingController,
  ],
  providers: [
    MachinMasterService,
    MachinsService,
    MachineSchedulerService,
    MasterOperatorBindingService,
  ],
  exports: [MachinMasterService, MachinsService, MasterOperatorBindingService],
})
export class MachinsModule {}
