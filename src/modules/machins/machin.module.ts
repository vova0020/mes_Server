import { Module } from '@nestjs/common';
import { MachinsController } from './controllers/machin.controller';
import { MachinService } from './services/machin.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [MachinsController],
  providers: [MachinService],
  exports: [MachinService],
})
export class MachinsModule {}
