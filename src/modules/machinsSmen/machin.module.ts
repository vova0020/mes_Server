import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';

import { PalletController } from './controllers/pallet.controller';
import { PalletService } from './services/pallet.service';
import { TaskDetailController } from './controllers/taskDetail.controller';
import { TaskDetailService } from './services/taskDetail.service';
import { MachinSmenController } from './controllers/machinSmen.controller';
import { MachinSmenService } from './services/machinSmen.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [PalletController, TaskDetailController, MachinSmenController],
  providers: [PalletService, TaskDetailService, MachinSmenService],
  exports: [PalletService, TaskDetailService, MachinSmenService],
})
export class MachinModule {}