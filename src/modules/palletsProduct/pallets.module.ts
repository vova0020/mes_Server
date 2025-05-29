import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsMasterController } from './controllers/palletsMaster.controller';
import { PalletsMasterService } from './services/pallets-Master.service';
import { PalletMachinController } from './controllers/palletsMachin.controller';
import { PalletMachineService } from './services/pallets-Machine.service';
import { TaskDetailService } from './services/taskDetail.service';

@Module({
  imports: [SharedModule],
  controllers: [PalletsMasterController, PalletMachinController],
  providers: [PalletsMasterService, PalletMachineService, TaskDetailService],
  exports: [PalletsMasterService, PalletMachineService, TaskDetailService],
})
export class PalletsModule {}