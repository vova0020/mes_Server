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

  /**
   * Получить список операторов (сотрудники с ролью «оператор»).
   * Используется для заполнения фильтра operatorId на фронте.
   *
   * Возвращает: userId, fullName, position.
   */
  @Get('operators')
  async getOperators(): Promise<
    Array<{ userId: number; fullName: string; position: string | null }>
  > {
    return this.operatorProductivityService.getOperators();
  }

  /**
   * Получить список этапов производства 1-го уровня.
   * Используется для заполнения фильтра stageId на фронте.
   *
   * Возвращает: stageId, stageName, finalStage.
   */
  @Get('stages')
  async getStages(): Promise<
    Array<{ stageId: number; stageName: string; finalStage: boolean }>
  > {
    return this.operatorProductivityService.getStages();
  }

  /**
   * Получить список станков (рабочих мест).
   * Используется для заполнения фильтра machineId на фронте.
   *
   * Возвращает: machineId, machineName, machineCode, loadUnit.
   */
  @Get('machines')
  async getMachines(): Promise<
    Array<{
      machineId: number;
      machineName: string;
      machineCode: string | null;
      loadUnit: string;
    }>
  > {
    return this.operatorProductivityService.getMachines();
  }
}
