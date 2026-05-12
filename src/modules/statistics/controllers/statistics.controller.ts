import { Controller, Get, Query } from '@nestjs/common';
import {
  StatisticsService,
  StageStats,
  MachineStats,
  DefectDetail,
  FilterOptions,
  MachineProductionRecord,
} from '../services/statistics.service';
import {
  GetProductionLineStatsDto,
  GetStageStatsDto,
  GetDefectStatsDto,
  GetMachineProductionDto,
} from '../dto';

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

  /**
   * Получить данные для фильтров страницы статистики брака.
   * Возвращает списки заказов, материалов, станков и этапов производства.
   */
  @Get('filter-options')
  async getFilterOptions(): Promise<FilterOptions> {
    return this.statisticsService.getFilterOptions();
  }

  /**
   * Получить данные учёта выпуска продукции по рабочим местам (станкам).
   * Фильтры: startDate, endDate, machineId (все опциональны).
   */
  @Get('machine-production')
  async getMachineProduction(
    @Query() dto: GetMachineProductionDto,
  ): Promise<MachineProductionRecord[]> {
    return this.statisticsService.getMachineProduction(dto);
  }
}
