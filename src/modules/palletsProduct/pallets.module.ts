import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsMasterController } from './controllers/palletsMaster.controller';
import { PalletsMasterService } from './services/pallets-Master.service';
import { PalletMachinController } from './controllers/palletsMachin.controller';
import { PalletMachineService } from './services/pallets-Machine.service';
import { TaskDetailService } from './services/taskDetail.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [PalletsMasterController, PalletMachinController],
  providers: [PalletsMasterService, PalletMachineService, TaskDetailService],
  exports: [PalletsMasterService, PalletMachineService, TaskDetailService],
})
export class PalletsModule {}