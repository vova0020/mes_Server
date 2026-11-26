import { Controller, Get, Query } from '@nestjs/common';
import {
  OperatorProductivitySummary,
  OperatorProductivityService,
} from '../services/operator-productivity.service';
import { GetOperatorProductivityDto } from '../dto';

/**
 * Контроллер для получения данных по выработке операторов.
 *
 * Endpoints:
 * GET /statistics/operator-productivity — данные по выработке операторов с фильтрами.
 */
@Controller('statistics')
export class OperatorProductivityController {
  constructor(
    private readonly operatorProductivityService: OperatorProductivityService,
  ) {}

  /**
   * Получить данные по выработке операторов.
   *
   * Фильтры (все опциональны): startDate, endDate, operatorId, machineId, stageId, search.
   *
   * Возвращает суммарную выработку каждого оператора:
   * - суммарное время авторизации (привязки к станкам)
   * - суммарное выполненное количество в единицах измерения станка
   * - количество привязок к станкам
   * - детализация по станкам и этапам
   */
  @Get('operator-productivity')
  async getOperatorProductivity(
    @Query() dto: GetOperatorProductivityDto,
  ): Promise<OperatorProductivitySummary[]> {
    return this.operatorProductivityService.getOperatorProductivity(dto);
  }
}
