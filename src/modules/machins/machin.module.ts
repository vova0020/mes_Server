import { Module } from '@nestjs/common';
import { MachinsController } from './controllers/machin.controller';
import { MachinService } from './services/machin.service';
import { SharedModule } from '../../shared/shared.module';
import { MachineSegmentController } from './controllers/machine-segment.controller';
import { MachineSegmentService } from './services/machine-segment.service';

@Module({
  imports: [SharedModule],
  controllers: [MachinsController, MachineSegmentController],
  providers: [MachinService, MachineSegmentService],
  exports: [MachinService, MachineSegmentService],
})
export class MachinsModule {}
