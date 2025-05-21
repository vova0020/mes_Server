import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { MachinNoSmenController } from './controllers/machinNoSmen.controller';
import { MachinNoSmenService } from './services/machinNoSmen.service';
import { PalletController } from './controllers/pallet.controller';
import { PalletService } from './services/pallet.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [MachinNoSmenController, PalletController],
  providers: [MachinNoSmenService, PalletService],
  exports: [MachinNoSmenService, PalletService],
})
export class MachinNoSmenModule {}