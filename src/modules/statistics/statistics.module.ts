import { Module } from '@nestjs/common';
import { StatisticsController } from './controllers/statistics.controller';
import { StatisticsService } from './services/statistics.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
