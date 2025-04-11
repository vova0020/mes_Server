import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { PalletsController } from './controllers/pallets.controller';
import { PalletsService } from './services/pallets.service';

@Module({
  imports: [SharedModule],
  controllers: [PalletsController],
  providers: [PalletsService],
  exports: [PalletsService],
})
export class PalletsModule {}