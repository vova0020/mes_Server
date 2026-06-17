import { Controller, Get, Query } from '@nestjs/common';
import {
  StatisticsService,
  StageStats,
  MachineStats,
  DefectDetail,
  FilterOptions,
  MachineProductionRecord,
  UnreturnedDefectsFilterOptions,
  UnreturnedDefectRecord,
} from '../services/statistics.service';
import { StatisticsOptimizedService } from '../services/statistics-optimized.service';
import {
  GetProductionLineStatsDto,
  GetStageStatsDto,
  GetDefectStatsDto,
  GetMachineProductionDto,
  GetUnreturnedDefectsDto,
} from '../dto';

@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statisticsOptimizedService: StatisticsOptimizedService,
  ) {}

  @Get('production-lines')
  async getProductionLines() {
    return this.statisticsService.getProductionLines();
  }

  @Get('production-line')
  async getProductionLineStats(
    @Query() dto: GetProductionLineStatsDto,
  ): Promise<StageStats[]> {
    return this.statisticsService.getProductionLineStats(dto);
  }

  @Get('stage')
  async getStageStats(@Query() dto: GetStageStatsDto): Promise<MachineStats[]> {
    return this.statisticsService.getStageStats(dto);
  }

  @Get('defects')
  async getDefectStats(
    @Query() dto: GetDefectStatsDto,
  ): Promise<DefectDetail[]> {
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
   * Фильтры: startDate, endDate, machineId, orderId, stageId (все опциональны).
   * ИСПОЛЬЗУЕТ ОПТИМИЗИРОВАННУЮ ВЕРСИЮ для решения проблемы зависания при фильтрации по orderId
   */
  @Get('machine-production')
  async getMachineProduction(
    @Query() dto: GetMachineProductionDto,
  ): Promise<MachineProductionRecord[]> {
    return this.statisticsOptimizedService.getMachineProduction(dto);
  }

  /**
   * Получить фильтры для страницы невозвращенных деталей из брака.
   * Возвращает списки заказов и упаковок с невозвращенными деталями.
   */
  @Get('unreturned-defects/filter-options')
  async getUnreturnedDefectsFilterOptions(): Promise<UnreturnedDefectsFilterOptions> {
    return this.statisticsService.getUnreturnedDefectsFilterOptions();
  }

  /**
   * Получить данные по невозвращенным деталям из брака.
   * Фильтры: orderId, packageId (опциональны).
   */
  @Get('unreturned-defects')
  async getUnreturnedDefects(
    @Query() dto: GetUnreturnedDefectsDto,
  ): Promise<UnreturnedDefectRecord[]> {
    return this.statisticsService.getUnreturnedDefects(dto);
  }
}
