import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsController } from './controllers/pallets.controller';
import { PalletsService } from './services/pallets.service';
import { PalletOperationsController } from './controllers/pallet-operations.controller';
import { PalletOperationsService } from './services/pallet-operations.service';

@Module({
  imports: [SharedModule],
  controllers: [PalletsController, PalletOperationsController],
  providers: [PalletsService, PalletOperationsService],
  exports: [PalletsService, PalletOperationsService],
})
export class PalletsModule {}