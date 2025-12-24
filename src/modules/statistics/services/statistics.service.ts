import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  GetProductionLineStatsDto,
  GetStageStatsDto,
  UnitOfMeasurement,
  DateRangeType,
} from '../dto';

export interface DataPoint {
  date: string; // ISO date string
  value: number;
}

export interface StageStats {
  stageId: number;
  stageName: string;
  totalValue: number;
  unit: UnitOfMeasurement;
  dataPoints: DataPoint[]; // Данные по датам для диаграммы
}

export interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;
  unit: string; // Единица измерения станка
  dataPoints: DataPoint[]; // Данные по датам для диаграммы
}

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getProductionLineStats(dto: GetProductionLineStatsDto): Promise<StageStats[]> {
    const { startDate, endDate } = this.calculateDateRange(dto);

    // Получаем этапы потока
    const lineStages = await this.prisma.lineStage.findMany({
      where: { lineId: dto.lineId },
      include: {
        stage: true,
      },
    });

    const stageIds = lineStages.map((ls) => ls.stageId);

    // Получаем маршруты для этого потока
    const routes = await this.prisma.route.findMany({
      where: { lineId: dto.lineId },
      include: {
        routeStages: {
          where: { stageId: { in: stageIds } },
        },
      },
    });

    const routeIds = routes.map((r) => r.routeId);

    const stats: StageStats[] = [];

    for (const lineStage of lineStages) {
      const stageId = lineStage.stageId;
      const isFinalStage = lineStage.stage.finalStage;

      const unit = dto.unit || UnitOfMeasurement.PIECES;

      let dataPoints: DataPoint[] = [];

      if (isFinalStage) {
        // Для финального этапа (упаковка) считаем упакованные упаковки
        dataPoints = await this.calculatePackingStageStatsWithDates(
          routeIds,
          stageId,
          startDate,
          endDate,
          unit,
        );
      } else {
        // Для обычных этапов считаем обработанные поддоны
        dataPoints = await this.calculateRegularStageStatsWithDates(
          routeIds,
          stageId,
          startDate,
          endDate,
          unit,
        );
      }

      const totalValue = dataPoints.reduce((sum, dp) => sum + dp.value, 0);

      stats.push({
        stageId: lineStage.stageId,
        stageName: lineStage.stage.stageName,
        totalValue,
        unit,
        dataPoints,
      });
    }

    return stats;
  }

  async getStageStats(dto: GetStageStatsDto): Promise<MachineStats[]> {
    const { startDate, endDate } = this.calculateDateRange(dto);

    // Проверяем, является ли этап финальным (упаковка)
    const stage = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: dto.stageId },
    });

    if (stage?.finalStage) {
      // Для финального этапа используем PackingTask
      return this.calculatePackingMachineStats(
        dto.lineId,
        startDate,
        endDate,
      );
    }

    // Получаем станки этапа
    const machineStages = await this.prisma.machineStage.findMany({
      where: {
        stageId: dto.stageId,
      },
      include: {
        machine: true,
      },
    });

    // Получаем маршруты для этого потока
    const routes = await this.prisma.route.findMany({
      where: { lineId: dto.lineId },
      include: {
        routeStages: {
          where: { stageId: dto.stageId },
        },
      },
    });

    const routeStageIds = routes.flatMap((r) =>
      r.routeStages.map((rs) => rs.routeStageId),
    );

    const stats: MachineStats[] = [];

    for (const machineStage of machineStages) {
      const machineUnit = machineStage.machine.loadUnit;
      const dataPoints = await this.calculateMachineStatsWithDates(
        machineStage.machineId,
        routeStageIds,
        startDate,
        endDate,
      );

      const totalValue = dataPoints.reduce((sum, dp) => sum + dp.value, 0);

      stats.push({
        machineId: machineStage.machineId,
        machineName: machineStage.machine.machineName,
        totalValue,
        unit: machineUnit,
        dataPoints,
      });
    }

    return stats;
  }

  private async calculateRegularStageStatsWithDates(
    routeIds: number[],
    stageId: number,
    startDate: Date,
    endDate: Date,
    unit: UnitOfMeasurement,
  ): Promise<DataPoint[]> {
    // Получаем прогресс по поддонам для этого этапа
    const palletProgress = await this.prisma.palletStageProgress.findMany({
      where: {
        routeStage: {
          routeId: { in: routeIds },
          stageId: stageId,
        },
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        pallet: {
          include: {
            part: true,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    return this.groupByDate(palletProgress.map(p => ({
      date: p.completedAt!,
      pallet: p.pallet,
    })), unit);
  }

  private async calculatePackingStageStatsWithDates(
    routeIds: number[],
    stageId: number,
    startDate: Date,
    endDate: Date,
    unit: UnitOfMeasurement,
  ): Promise<DataPoint[]> {
    const packingTasks = await this.prisma.packingTask.findMany({
      where: {
        completedQuantity: { gt: 0 },
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
        package: {
          composition: {
            some: {
              routeId: { in: routeIds },
            },
          },
        },
      },
      include: {
        package: {
          include: {
            composition: {
              where: {
                routeId: { in: routeIds },
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });

    const dataByDate = new Map<string, number>();

    for (const task of packingTasks) {
      const dateKey = task.assignedAt.toISOString().split('T')[0];
      const completedQty = Number(task.completedQuantity);
      let value = 0;

      if (unit === UnitOfMeasurement.PIECES) {
        value = completedQty;
      } else {
        let areaPerPackage = 0;
        for (const comp of task.package.composition) {
          const partArea = Number(comp.finishedLength || 0) * Number(comp.finishedWidth || 0);
          const partAreaM2 = partArea / 1000000;
          areaPerPackage += partAreaM2 * Number(comp.quantityPerPackage);
        }
        value = areaPerPackage * completedQty;
      }

      dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + value);
    }

    return Array.from(dataByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculateMachineStatsWithDates(
    machineId: number,
    routeStageIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<DataPoint[]> {
    // Вариант 1: Пробуем получить из MachineOperationHistory
    const operations = await this.prisma.machineOperationHistory.findMany({
      where: {
        machineId: machineId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        routeStageId: { in: routeStageIds },
      },
    });

    if (operations.length > 0) {
      const dataByDate = new Map<string, number>();

      for (const op of operations) {
        const dateKey = op.completedAt!.toISOString().split('T')[0];
        const quantity = Number(op.quantityProcessed);
        dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + quantity);
      }

      return Array.from(dataByDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Вариант 2: Если нет истории операций, используем MachineAssignment
    const assignments = await this.prisma.machineAssignment.findMany({
      where: {
        machineId: machineId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        pallet: {
          include: {
            part: {
              include: {
                route: {
                  include: {
                    routeStages: {
                      where: {
                        routeStageId: { in: routeStageIds },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Фильтруем только те назначения, где деталь проходит нужные этапы
    const filteredAssignments = assignments.filter(
      (a) => a.pallet.part.route.routeStages.length > 0,
    );

    const dataByDate = new Map<string, number>();

    for (const assignment of filteredAssignments) {
      const dateKey = assignment.completedAt!.toISOString().split('T')[0];
      const quantity = Number(assignment.pallet.quantity);
      dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + quantity);
    }

    return Array.from(dataByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculatePackingMachineStats(
    lineId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<MachineStats[]> {
    // Получаем маршруты для этой линии
    const routes = await this.prisma.route.findMany({
      where: { lineId },
      select: { routeId: true },
    });
    const routeIds = routes.map(r => r.routeId);

    // Получаем задачи упаковки с completedQuantity > 0
    const packingTasks = await this.prisma.packingTask.findMany({
      where: {
        completedQuantity: { gt: 0 },
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
        package: {
          composition: {
            some: {
              routeId: { in: routeIds },
            },
          },
        },
      },
      include: {
        machine: true,
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });

    // Группируем по станкам
    const machineDataMap = new Map<number, { name: string; unit: string; dateMap: Map<string, number> }>();

    for (const task of packingTasks) {
      if (!machineDataMap.has(task.machineId)) {
        machineDataMap.set(task.machineId, {
          name: task.machine.machineName,
          unit: task.machine.loadUnit,
          dateMap: new Map(),
        });
      }

      const machineData = machineDataMap.get(task.machineId)!;
      const dateKey = task.assignedAt.toISOString().split('T')[0];
      const value = Number(task.completedQuantity);

      machineData.dateMap.set(dateKey, (machineData.dateMap.get(dateKey) || 0) + value);
    }

    // Формируем результат
    const stats: MachineStats[] = [];

    for (const [machineId, machineData] of machineDataMap.entries()) {
      const dataPoints = Array.from(machineData.dateMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalValue = dataPoints.reduce((sum, dp) => sum + dp.value, 0);

      stats.push({
        machineId,
        machineName: machineData.name,
        totalValue,
        unit: machineData.unit,
        dataPoints,
      });
    }

    return stats;
  }

  private groupByDate(
    items: Array<{ date: Date; pallet: { quantity: any; part: any } }>,
    unit: UnitOfMeasurement,
  ): DataPoint[] {
    const dataByDate = new Map<string, number>();

    for (const item of items) {
      const dateKey = item.date.toISOString().split('T')[0];
      const quantity = Number(item.pallet.quantity);
      const part = item.pallet.part;

      let value = 0;
      if (unit === UnitOfMeasurement.PIECES) {
        value = quantity;
      } else {
        const length = Number(part.finishedLength || 0);
        const width = Number(part.finishedWidth || 0);
        const area = (length * width) / 1000000; // мм² в м²
        value = area * quantity;
      }

      dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + value);
    }

    return Array.from(dataByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateDateRange(
    dto: GetProductionLineStatsDto | GetStageStatsDto,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dto.dateRangeType === DateRangeType.CUSTOM) {
      startDate = new Date(dto.startDate!);
      endDate = new Date(dto.endDate!);
    } else {
      const baseDate = dto.date ? new Date(dto.date) : now;
      endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999);

      switch (dto.dateRangeType) {
        case DateRangeType.DAY:
          startDate = new Date(baseDate);
          startDate.setHours(0, 0, 0, 0);
          break;
        case DateRangeType.WEEK:
          startDate = new Date(baseDate);
          startDate.setDate(baseDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case DateRangeType.MONTH:
          startDate = new Date(baseDate);
          startDate.setMonth(baseDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case DateRangeType.YEAR:
          startDate = new Date(baseDate);
          startDate.setFullYear(baseDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
    }

    return { startDate, endDate };
  }

  async getProductionLines() {
    return this.prisma.productionLine.findMany({
      select: {
        lineId: true,
        lineName: true,
        lineType: true,
      },
    });
  }
}
