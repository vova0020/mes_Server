import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsMasterController } from './controllers/palletsMaster.controller';
import { PalletsMasterService } from './services/pallets-Master.service';
import { PalletMachinController } from './controllers/palletsMachin.controller';
import { PalletMachineService } from './services/pallets-Machine.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { PalletsMachineTaskService } from './services/pallets-Machine-task.service';
import { PalletsMachinsNoSmenController } from './controllers/palletsMachinsNoSmen.controller';
import { PalletMachineNoSmenService } from './services/pallets-MachineNoSmen.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SharedModule, WebsocketModule, AuditModule],
  controllers: [
    PalletsMasterController,
    PalletMachinController,
    PalletsMachinsNoSmenController,
  ],
  providers: [
    PalletsMasterService,
    PalletMachineService,
    PalletsMachineTaskService,
    PalletMachineNoSmenService,
  ],
  exports: [
    PalletsMasterService,
    PalletMachineService,
    PalletsMachineTaskService,
    PalletMachineNoSmenService,
  ],
})
export class PalletsModule {}
