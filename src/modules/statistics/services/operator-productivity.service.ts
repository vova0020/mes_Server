import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { GetOperatorProductivityDto } from '../dto';

/**
 * Одна запись о выработанной продукции конкретным оператором на конкретном станке/этапе.
 * Формируется из MachineOperationHistory (обычные этапы) и PackingTask (финальный этап упаковки).
 */
export interface OperatorProductivityRecord {
  // Оператор
  operatorId: number;
  operatorName: string | null;
  // Этап производства, к которому привязан станок (на котором выполнял задачу)
  stageId: number;
  stageName: string | null;
  // Станок (рабочее место), на котором выполнял задачу
  machineId: number;
  machineName: string | null;
  machineCode: string | null;
  machineLoadUnit: string | null;
  // Задача/операция
  operationId: number;
  // Выполненное количество в единицах измерения станка
  quantityProcessed: number;
  // Время выполнения
  startedAt: Date;
  completedAt: Date;
  // Длительность в секундах
  durationSeconds: number;
}

/**
 * Суммарная выработка одного оператора.
 */
export interface OperatorProductivitySummary {
  operatorId: number;
  operatorName: string | null;
  // Суммарное время авторизации (привязки к станкам) в секундах
  totalAuthorizedSeconds: number;
  // Суммарное выполненное количество (по всем станкам, в разных единицах)
  totalQuantity: number;
  // Сколько раз привязывался к станку (активных/исторических привязок)
  bindingCount: number;
  // Детализация по станкам
  machines: Array<{
    machineId: number;
    machineName: string;
    machineCode: string | null;
    loadUnit: string;
    quantityProcessed: number;
    bindingCount: number;
  }>;
  // Детализация по этапам
  stages: Array<{
    stageId: number;
    stageName: string;
    quantityProcessed: number;
  }>;
}

/**
 * Сервис для расчёта выработки операторов.
 *
 * Данные о выполненной продукции берутся из:
 *  - MachineOperationHistory — обычные этапы производства (operatorId, machineId, routeStageId, quantityProcessed)
 *  - PackingTask + PackingTaskOperator — финальный этап (упаковка), где операторы связаны через junction-таблицу
 *
 * Время авторизации (привязки к станку) берётся из OperatorMachineBinding:
 *  duration = unboundAt - boundAt (для снятых привязок) или now - boundAt (для активных)
 */
@Injectable()
export class OperatorProductivityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить данные по выработке операторов с фильтрами.
   *
   * Фильтры: период (startDate/endDate), оператор (operatorId), станок (machineId),
   * этап (stageId), поиск по ФИО (search).
   */
  async getOperatorProductivity(
    dto: GetOperatorProductivityDto,
  ): Promise<OperatorProductivitySummary[]> {
    // Получаем ID только пользователей с ролью «оператор» — фильтруем по ним оба запроса
    const operatorRoleIds = await this.getOperatorIds();

    // 1. Получаем записи из MachineOperationHistory
    // Даты — опциональные фильтры: если дата не передана, ограничение по периоду не применяется
    // (ищем за всё время). Комбинирование любых фильтров: оператор / станок / этап / период.
    const operationWhere: any = {
      operatorId: { not: null, in: operatorRoleIds },
    };
    const operationDateFilter = this.buildDateFilter(dto);
    if (Object.keys(operationDateFilter).length > 0) {
      operationWhere.completedAt = operationDateFilter;
    }

    if (dto.machineId) {
      operationWhere.machineId = dto.machineId;
    }
    if (dto.operatorId) {
      operationWhere.operatorId = dto.operatorId;
    }
    if (dto.stageId) {
      operationWhere.routeStage = { stageId: dto.stageId };
    }

    const operations = await this.prisma.machineOperationHistory.findMany({
      where: operationWhere,
      include: {
        machine: {
          select: {
            machineId: true,
            machineName: true,
            machineCode: true,
            loadUnit: true,
          },
        },
        routeStage: {
          select: {
            stage: {
              select: {
                stageId: true,
                stageName: true,
              },
            },
          },
        },
        operator: {
          select: {
            userId: true,
            userDetail: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10000,
    });

    // 2. Получаем финальные станки (этапы упаковки) для определения их stageId
    const finalStageMachines = await this.prisma.machineStage.findMany({
      include: {
        machine: {
          select: {
            machineId: true,
            machineName: true,
            machineCode: true,
            loadUnit: true,
          },
        },
        stage: true,
      },
    });
    const finalMachineMap = new Map<number, any>();
    for (const ms of finalStageMachines) {
      finalMachineMap.set(ms.machineId, {
        machineId: ms.machineId,
        machineName: ms.machine.machineName,
        machineCode: ms.machine.machineCode,
        loadUnit: ms.machine.loadUnit,
        stageId: ms.stageId,
        stageName: ms.stage.stageName,
      });
    }

    // 3. Получаем задачи упаковки, где операторы участвовали через junction
    const packingWhere: any = {
      completedQuantity: { gt: 0 },
    };
    const packingDateFilter = this.buildDateFilter(dto);
    if (Object.keys(packingDateFilter).length > 0) {
      packingWhere.assignedAt = packingDateFilter;
    }
    // Участвовали только операторы с ролью «оператор»
    if (dto.operatorId) {
      packingWhere.operators = { some: { userId: dto.operatorId } };
    } else if (operatorRoleIds.length > 0) {
      packingWhere.operators = { some: { userId: { in: operatorRoleIds } } };
    }
    // Если запрошен конкретный финальный станок — фильтруем по machineId
    if (dto.machineId && finalMachineMap.has(dto.machineId)) {
      packingWhere.machineId = dto.machineId;
    }

    const packingTasks = await this.prisma.packingTask.findMany({
      where: packingWhere,
      include: {
        operators: {
          select: {
            userId: true,
            operator: {
              select: {
                userDetail: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        machine: {
          select: {
            machineId: true,
            machineName: true,
            machineCode: true,
            loadUnit: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10000,
    });

    // 4. Формируем плоский список записей о выработке
    const records: OperatorProductivityRecord[] = [];

    for (const op of operations) {
      if (!op.operatorId) continue;
      const operatorName = op.operator
        ? `${op.operator.userDetail?.firstName ?? ''} ${op.operator.userDetail?.lastName ?? ''}`.trim() || null
        : null;

      records.push({
        operatorId: op.operatorId,
        operatorName,
        stageId: op.routeStage?.stage?.stageId ?? 0,
        stageName: op.routeStage?.stage?.stageName ?? null,
        machineId: op.machine.machineId,
        machineName: op.machine.machineName,
        machineCode: op.machine.machineCode,
        machineLoadUnit: op.machine.loadUnit,
        operationId: op.operationId,
        quantityProcessed: Number(op.quantityProcessed),
        startedAt: op.startedAt,
        completedAt: op.completedAt,
        durationSeconds: op.duration,
      });
    }

    for (const task of packingTasks) {
      // Для каждого оператора в задаче упаковки
      for (const op of task.operators) {
        const machineInfo = finalMachineMap.get(task.machineId);
        const operatorName = op.operator
          ? `${op.operator.userDetail?.firstName ?? ''} ${op.operator.userDetail?.lastName ?? ''}`.trim() || null
          : null;

        records.push({
          operatorId: op.userId,
          operatorName,
          stageId: machineInfo?.stageId ?? 0,
          stageName: machineInfo?.stageName ?? 'Упаковка',
          machineId: task.machine.machineId,
          machineName: task.machine.machineName,
          machineCode: task.machine.machineCode,
          machineLoadUnit: task.machine.loadUnit,
          operationId: task.taskId,
          quantityProcessed: Number(task.completedQuantity),
          startedAt: task.assignedAt,
          completedAt: task.completedAt || task.assignedAt,
          durationSeconds: task.completedAt
            ? Math.floor(
                (task.completedAt.getTime() - task.assignedAt.getTime()) / 1000,
              )
            : 0,
        });
      }
    }

    // 5. Применяем фильтр по stageId (для не-финальных станков) на уровне приложения
    let filteredRecords = records;
    if (dto.stageId && finalMachineMap.size === 0) {
      filteredRecords = records.filter((r) => r.stageId === dto.stageId);
    }

    // 6. Применяем фильтр по поиску по ФИО
    if (dto.search) {
      const search = dto.search.toLowerCase();
      filteredRecords = filteredRecords.filter((r) =>
        r.operatorName?.toLowerCase().includes(search),
      );
    }

    // 7. Группируем по операторам
    const operatorsMap = new Map<number, OperatorProductivitySummary>();
    for (const rec of filteredRecords) {
      if (!operatorsMap.has(rec.operatorId)) {
        operatorsMap.set(rec.operatorId, {
          operatorId: rec.operatorId,
          operatorName: rec.operatorName,
          totalAuthorizedSeconds: 0,
          totalQuantity: 0,
          bindingCount: 0,
          machines: [],
          stages: [],
        });
      }
      const summary = operatorsMap.get(rec.operatorId)!;
      summary.totalQuantity += rec.quantityProcessed;

      // Детализация по станкам
      let machineEntry = summary.machines.find(
        (m) => m.machineId === rec.machineId,
      );
      if (!machineEntry) {
        machineEntry = {
          machineId: rec.machineId,
          machineName: rec.machineName ?? '',
          machineCode: rec.machineCode,
          loadUnit: rec.machineLoadUnit ?? '',
          quantityProcessed: 0,
          bindingCount: 0,
        };
        summary.machines.push(machineEntry);
      }
      machineEntry.quantityProcessed += rec.quantityProcessed;

      // Детализация по этапам
      let stageEntry = summary.stages.find(
        (s) => s.stageId === rec.stageId,
      );
      if (!stageEntry) {
        stageEntry = {
          stageId: rec.stageId,
          stageName: rec.stageName ?? '',
          quantityProcessed: 0,
        };
        summary.stages.push(stageEntry);
      }
      stageEntry.quantityProcessed += rec.quantityProcessed;
    }

    // 8. Получаем время авторизации (привязки к станкам) для каждого оператора
    const operatorIds = Array.from(operatorsMap.keys());
    if (operatorIds.length > 0) {
      const bindings = await this.prisma.operatorMachineBinding.findMany({
        where: {
          userId: { in: operatorIds },
        },
        select: {
          userId: true,
          boundAt: true,
          unboundAt: true,
          isActive: true,
        },
      });

      const bindingCountByOperator = new Map<number, number>();
      for (const b of bindings) {
        // Считаем длительность привязки
        let end = b.unboundAt;
        if (!end) {
          // Для активных привязок берём текущее время
          end = new Date();
        }
        const duration = Math.floor(
          (end.getTime() - b.boundAt.getTime()) / 1000,
        );
        const summary = operatorsMap.get(b.userId);
        if (summary) {
          summary.totalAuthorizedSeconds += duration;
        }
        const count = bindingCountByOperator.get(b.userId) || 0;
        bindingCountByOperator.set(b.userId, count + 1);
      }

      for (const summary of operatorsMap.values()) {
        summary.bindingCount = bindingCountByOperator.get(summary.operatorId) || 0;
      }
    }

    // 9. Сортируем по убыванию суммарной выработки
    return Array.from(operatorsMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity,
    );
  }

  /**
   * Формирует фильтр по дате из DTO для использования в where-условии Prisma.
   *
   * Правила:
   * - startDate → gte (включительно с начала дня)
   * - endDate → lte (включительно до конца дня)
   * - если поле не передано, соответствующее ограничение НЕ добавляется,
   *   что позволяет искать за всё время при отсутствии дат.
   */
  private buildDateFilter(
    dto: GetOperatorProductivityDto,
  ): Record<string, Date> {
    const filter: Record<string, Date> = {};

    if (dto.startDate) {
      const start = new Date(dto.startDate);
      start.setHours(0, 0, 0, 0);
      filter.gte = start;
    }

    if (dto.endDate) {
      const end = new Date(dto.endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }

    return filter;
  }

  /**
   * Получить ID всех пользователей с ролью «оператор».
   * Используется для фильтрации записей о выработке — показываем только операторов.
   */
  private async getOperatorIds(): Promise<number[]> {
    const roles = await this.prisma.userRole.findMany({
      where: {
        role: { roleName: 'operator' },
      },
      select: { userId: true },
    });
    return roles.map((r) => r.userId);
  }

  /**
   * Получить список сотрудников с ролью «оператор».
   * Возвращает ФИО и должность каждого оператора.
   */
  async getOperators(): Promise<Array<{ userId: number; fullName: string; position: string | null }>> {
    const operators = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              roleName: 'operator',
            },
          },
        },
      },
      select: {
        userId: true,
        userDetail: {
          select: {
            firstName: true,
            lastName: true,
            position: true,
          },
        },
      },
      orderBy: {
        userDetail: {
          lastName: 'asc',
        },
      },
    });

    return operators.map((op) => ({
      userId: op.userId,
      fullName:
        `${op.userDetail?.firstName ?? 'Неизвестно'} ${op.userDetail?.lastName ?? ''}`.trim(),
      position: op.userDetail?.position ?? null,
    }));
  }

  /**
   * Получить список этапов производства 1-го уровня.
   * Возвращает ID, название и флаг финального этапа (упаковка).
   */
  async getStages(): Promise<Array<{ stageId: number; stageName: string; finalStage: boolean }>> {
    const stages = await this.prisma.productionStageLevel1.findMany({
      orderBy: { stageName: 'asc' },
    });

    return stages.map((s) => ({
      stageId: s.stageId,
      stageName: s.stageName,
      finalStage: s.finalStage,
    }));
  }

  /**
   * Получить список станков (рабочих мест).
   * Возвращает ID, название, код и единица измерения каждого станка.
   */
  async getMachines(): Promise<Array<{ machineId: number; machineName: string; machineCode: string | null; loadUnit: string }>> {
    const machines = await this.prisma.machine.findMany({
      orderBy: { machineName: 'asc' },
    });

    return machines.map((m) => ({
      machineId: m.machineId,
      machineName: m.machineName,
      machineCode: m.machineCode,
      loadUnit: m.loadUnit,
    }));
  }
}
