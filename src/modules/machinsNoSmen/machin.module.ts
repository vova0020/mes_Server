import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { MachinNoSmenController } from './controllers/machinNoSmen.controller';
import { MachinNoSmenService } from './services/machinNoSmen.service';
import { PalletController } from './controllers/pallet.controller';
import { PalletService } from './services/pallet.service';

@Module({
  imports: [SharedModule],
  controllers: [MachinNoSmenController, PalletController],
  providers: [MachinNoSmenService, PalletService],
  exports: [MachinNoSmenService, PalletService],
})
export class MachinNoSmenModule {}