import { Module } from '@nestjs/common';
import { StatisticsController } from './controllers/statistics.controller';
import { MachineUptimeController } from './controllers/machine-uptime.controller';
import { OperatorProductivityController } from './controllers/operator-productivity.controller';
import { StatisticsService } from './services/statistics.service';
import { StatisticsOptimizedService } from './services/statistics-optimized.service';
import { MachineUptimeService } from './services/machine-uptime.service';
import { OperatorProductivityService } from './services/operator-productivity.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [
    StatisticsController,
    MachineUptimeController,
    OperatorProductivityController,
  ],
  providers: [
    StatisticsService,
    StatisticsOptimizedService,
    MachineUptimeService,
    OperatorProductivityService,
  ],
  exports: [
    StatisticsService,
    StatisticsOptimizedService,
    MachineUptimeService,
    OperatorProductivityService,
  ],
})
export class StatisticsModule {}
