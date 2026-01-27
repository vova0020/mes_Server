import { Module } from '@nestjs/common';
import { StatisticsController } from './controllers/statistics.controller';
import { MachineUptimeController } from './controllers/machine-uptime.controller';
import { StatisticsService } from './services/statistics.service';
import { MachineUptimeService } from './services/machine-uptime.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [StatisticsController, MachineUptimeController],
  providers: [StatisticsService, MachineUptimeService],
  exports: [StatisticsService, MachineUptimeService],
})
export class StatisticsModule {}
