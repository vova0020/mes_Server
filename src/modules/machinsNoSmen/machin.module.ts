import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { MachinNoSmenController } from './controllers/machinNoSmen.controller';
import { MachinNoSmenService } from './services/machinNoSmen.service';

@Module({
  imports: [SharedModule],
  controllers: [MachinNoSmenController],
  providers: [MachinNoSmenService],
  exports: [MachinNoSmenService],
})
export class MachinModule {}