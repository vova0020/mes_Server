import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService, StageStats, MachineStats, DefectDetail } from '../services/statistics.service';
import { GetProductionLineStatsDto, GetStageStatsDto, GetDefectStatsDto } from '../dto';

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

  @Get('defects')
  async getDefectStats(@Query() dto: GetDefectStatsDto): Promise<DefectDetail[]> {
    return this.statisticsService.getDefectStats(dto);
  }
}
