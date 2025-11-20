import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService, StageStats, MachineStats } from '../services/statistics.service';
import { GetProductionLineStatsDto, GetStageStatsDto } from '../dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('production-lines')
  async getProductionLines() {
    return this.statisticsService.getProductionLines();
  }

  @Get('production-line')
  async getProductionLineStats(@Query() dto: GetProductionLineStatsDto): Promise<StageStats[]> {
    return this.statisticsService.getProductionLineStats(dto);
  }

  @Get('stage')
  async getStageStats(@Query() dto: GetStageStatsDto): Promise<MachineStats[]> {
    return this.statisticsService.getStageStats(dto);
  }
}
