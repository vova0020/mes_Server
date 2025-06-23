import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsMasterController } from './controllers/palletsMaster.controller';
import { PalletsMasterService } from './services/pallets-Master.service';
import { PalletMachinController } from './controllers/palletsMachin.controller';
import { PalletMachineService } from './services/pallets-Machine.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { PalletsMachineTaskService } from './services/pallets-Machine-task.service';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [PalletsMasterController, PalletMachinController],
  providers: [
    PalletsMasterService,
    PalletMachineService,
    PalletsMachineTaskService,
  ],
  exports: [
    PalletsMasterService,
    PalletMachineService,
    PalletsMachineTaskService,
  ],
})
export class PalletsModule {}
