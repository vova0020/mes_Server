import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  GetProductionLineStatsDto,
  GetStageStatsDto,
  UnitOfMeasurement,
  DateRangeType,
  GetDefectStatsDto,
  GetMachineProductionDto,
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

/**
 * Интерфейс для одного события возврата детали в производство.
 * Каждая запись соответствует одному вызову POST /master/return-parts.
 */
export interface DefectReturnEvent {
  movementId: number;
  returnedAt: Date;
  returnedQuantity: number;
  // Этап маршрута (RouteStage) куда вернули
  returnToRouteStageId: number;
  // Название этапа производства (ProductionStageLevel1)
  returnToStageName: string | null;
  // Станок куда вернули (опционально)
  returnToMachineId: number | null;
  returnToMachineName: string | null;
  // Поддон на который вернули
  returnPalletId: number | null;
  returnPalletName: string | null;
  // Кто выполнил возврат
  returnedByUserId: number | null;
}

/**
 * Интерфейс для детальной информации об отбракованной детали
 */
export interface DefectDetail {
  reclamationId: number;
  partId: number;
  partCode: string;
  partName: string;
  // Количество отбракованных деталей по данной рекламации
  defectQuantity: number;
  // Суммарное количество возвращённых деталей по данной детали (все возвраты)
  totalReturnedQuantity: number;
  defectTypes: string[];
  detectedAt: Date;
  processedAt: Date | null;
  status: string;
  qualityAction: string | null;
  note: string | null;
  // Информация о месте обнаружения брака
  stageId: number;
  stageName: string;
  machineId: number | null;
  machineName: string | null;
  palletId: number | null;
  palletName: string | null;
  // Все упаковки и заказы, к которым привязана деталь
  packages: Array<{
    packageId: number;
    packageCode: string;
    packageName: string;
    orderId: number;
    orderBatchNumber: string;
    orderName: string;
  }>;
  // Информация о материале
  materialId: number | null;
  materialName: string | null;
  materialSku: string | null;
  // Информация о работнике
  reportedById: number | null;
  reportedByName: string | null;
  confirmedById: number | null;
  confirmedByName: string | null;
  // Все события возврата детали в производство (пустой массив если не возвращали)
  returnEvents: DefectReturnEvent[];
}

/**
 * Одна запись операции на станке (для учёта выпуска продукции)
 */
export interface MachineProductionRecord {
  // Идентификатор операции
  operationId: number;
  // Станок
  machineId: number;
  machineName: string;
  machineLoadUnit: string;
  // Деталь
  partId: number;
  partCode: string;
  partName: string;
  partSize: string;
  // Материал детали
  materialId: number | null;
  materialName: string | null;
  materialSku: string | null;
  // Поддон
  palletId: number;
  palletName: string;
  // Этап маршрута
  routeStageId: number;
  stageId: number;
  stageName: string;
  // Количество обработанных деталей
  quantityProcessed: number;
  // Время начала и завершения операции
  startedAt: Date;
  completedAt: Date;
  // Длительность операции в секундах
  durationSeconds: number;
  // Оператор (если указан)
  operatorId: number | null;
  operatorName: string | null;
  // Заказы и упаковки, к которым относится деталь
  packages: Array<{
    packageId: number;
    packageCode: string;
    packageName: string;
    orderId: number;
    orderBatchNumber: string;
    orderName: string;
  }>;
}

/**
 * Интерфейс для данных фильтров страницы статистики брака
 */
export interface FilterOptions {
  orders: Array<{
    orderId: number;
    batchNumber: string;
    orderName: string;
  }>;
  materials: Array<{
    materialId: number;
    materialName: string;
    article: string;
  }>;
  machines: Array<{
    machineId: number;
    machineName: string;
  }>;
  stages: Array<{
    stageId: number;
    stageName: string;
  }>;
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
        dto.stageId,
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
        unit: machineStage.machine.loadUnit,
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
    // Получаем routeStageIds для этого этапа
    const routeStages = await this.prisma.routeStage.findMany({
      where: {
        routeId: { in: routeIds },
        stageId: stageId,
      },
      select: { routeStageId: true },
    });

    const routeStageIds = routeStages.map(rs => rs.routeStageId);

    // Используем MachineAssignment с processedQuantity
    const assignments = await this.prisma.machineAssignment.findMany({
      where: {
        routeStageId: { in: routeStageIds },
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        processedQuantity: { not: 0 },
      },
      include: {
        pallet: {
          include: {
            part: {
              select: {
                finishedLength: true,
                finishedWidth: true,
              },
            },
          },
        },
      },
    });

    const dataByDate = new Map<string, number>();

    for (const assignment of assignments) {
      const dateKey = assignment.completedAt!.toISOString().split('T')[0];
      const quantity = Number(assignment.processedQuantity || 0);
      
      let value = 0;
      if (unit === UnitOfMeasurement.PIECES) {
        value = quantity;
      } else {
        const length = Number(assignment.pallet.part.finishedLength || 0);
        const width = Number(assignment.pallet.part.finishedWidth || 0);
        const area = (length * width) / 1000000; // мм² в м²
        value = area * quantity;
      }

      dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + value);
    }

    return Array.from(dataByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
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
        machine: {
          machinesStages: {
            some: {
              stageId: stageId,
            },
          },
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
    // Используем MachineAssignment с processedQuantity
    const assignments = await this.prisma.machineAssignment.findMany({
      where: {
        machineId: machineId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        routeStageId: { in: routeStageIds },
        processedQuantity: { not: 0 },
      },
      include: {
        pallet: {
          include: {
            part: {
              select: {
                finishedLength: true,
                finishedWidth: true,
                thickness: true,
                edgingNameL1: true,
                edgingNameL2: true,
                edgingNameW1: true,
                edgingNameW2: true,
              },
            },
          },
        },
        machine: {
          select: {
            loadUnit: true,
          },
        },
      },
    });

    const dataByDate = new Map<string, number>();

    for (const assignment of assignments) {
      const dateKey = assignment.completedAt!.toISOString().split('T')[0];
      const quantity = Number(assignment.processedQuantity || 0);
      
      let value = 0;
      const machineUnit = assignment.machine.loadUnit;
      const part = assignment.pallet.part;
      
      if (machineUnit === 'шт' || machineUnit === 'pcs') {
        value = quantity;
      } else if (machineUnit === 'м²') {
        const length = Number(part.finishedLength || 0);
        const width = Number(part.finishedWidth || 0);
        value = (length * width * quantity) / 1000000;
      } else if (machineUnit === 'м³') {
        const length = Number(part.finishedLength || 0);
        const width = Number(part.finishedWidth || 0);
        const thickness = Number(part.thickness || 0);
        value = (length * width * thickness * quantity) / 1000000000;
      } else if (machineUnit === 'м') {
        const length = Number(part.finishedLength || 0);
        value = (length * quantity) / 1000;
      } else if (machineUnit === 'м кромки') {
        const length = Number(part.finishedLength || 0);
        const width = Number(part.finishedWidth || 0);
        let edgeLength = 0;
        if (part.edgingNameL1) edgeLength += length;
        if (part.edgingNameL2) edgeLength += length;
        if (part.edgingNameW1) edgeLength += width;
        if (part.edgingNameW2) edgeLength += width;
        value = (edgeLength * quantity) / 1000;
      } else {
        const length = Number(part.finishedLength || 0);
        const width = Number(part.finishedWidth || 0);
        value = (length * width * quantity) / 1000000;
      }
      
      dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + value);
    }

    return Array.from(dataByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculatePackingMachineStats(
    lineId: number,
    startDate: Date,
    endDate: Date,
    stageId: number,
  ): Promise<MachineStats[]> {
    // Получаем маршруты для этой линии
    const routes = await this.prisma.route.findMany({
      where: { lineId },
      select: { routeId: true },
    });
    const routeIds = routes.map(r => r.routeId);

    // Получаем задачи упаковки с completedQuantity > 0 только для станков данного этапа
    const packingTasks = await this.prisma.packingTask.findMany({
      where: {
        completedQuantity: { gt: 0 },
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
        machine: {
          machinesStages: {
            some: {
              stageId: stageId,
            },
          },
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

  /**
   * Получить детальную статистику по отбракованным деталям с фильтрами.
   *
   * Логика возврата:
   * При вызове POST /master/return-parts сервис создаёт запись InventoryMovement с:
   *   reason = 'RETURN_FROM_RECLAMATION', deltaQuantity > 0, returnToStageId = routeStageId этапа возврата
   * sourceReclamationId НЕ заполняется, поэтому возвраты ищем по partId + reason.
   */
  async getDefectStats(dto: GetDefectStatsDto): Promise<DefectDetail[]> {
    // Строим условия WHERE для рекламаций
    const reclamationWhere: {
      createdAt?: { gte?: Date; lte?: Date };
      routeStage?: { stageId: number };
      reportedById?: number;
    } = {};

    if (dto.startDate || dto.endDate) {
      reclamationWhere.createdAt = {};
      if (dto.startDate) {
        reclamationWhere.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        reclamationWhere.createdAt.lte = endDate;
      }
    }

    if (dto.stageId) {
      reclamationWhere.routeStage = { stageId: dto.stageId };
    }

    if (dto.workerId) {
      reclamationWhere.reportedById = dto.workerId;
    }

    // Получаем рекламации с полной информацией
    const reclamations = await this.prisma.reclamation.findMany({
      where: reclamationWhere,
      include: {
        part: {
          include: {
            material: true,
            productionPackageParts: {
              include: {
                package: {
                  include: {
                    order: true,
                  },
                },
              },
            },
          },
        },
        // Этап маршрута где обнаружен брак → включаем ProductionStageLevel1
        routeStage: {
          include: {
            stage: true,
          },
        },
        machine: true,
        pallet: true,
        reportedBy: {
          include: {
            userDetail: true,
          },
        },
        confirmedBy: {
          include: {
            userDetail: true,
          },
        },
        defects: {
          include: {
            defectType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Фильтруем по заказу, материалу и цвету на уровне приложения
    let filteredReclamations = reclamations;

    if (dto.orderId) {
      filteredReclamations = filteredReclamations.filter((rec) =>
        rec.part.productionPackageParts.some(
          (ppp) => ppp.package.orderId === dto.orderId,
        ),
      );
    }

    if (dto.materialId) {
      filteredReclamations = filteredReclamations.filter(
        (rec) => rec.part.materialId === dto.materialId,
      );
    }

    if (dto.color) {
      filteredReclamations = filteredReclamations.filter((rec) =>
        rec.part.material?.materialName
          .toLowerCase()
          .includes(dto.color!.toLowerCase()),
      );
    }

    // Собираем уникальные partId для пакетного запроса возвратов
    const partIds = [...new Set(filteredReclamations.map((r) => r.partId))];

    // Получаем ВСЕ возвраты по этим деталям одним запросом.
    // При вызове POST /master/return-parts создаётся InventoryMovement с:
    //   reason = 'RETURN_FROM_RECLAMATION', deltaQuantity > 0
    // sourceReclamationId не заполняется, поэтому ищем по partId + reason.
    const returnMovements =
      partIds.length > 0
        ? await this.prisma.inventoryMovement.findMany({
            where: {
              partId: { in: partIds },
              reason: 'RETURN_FROM_RECLAMATION',
              deltaQuantity: { gt: 0 },
            },
            include: {
              // returnToStage — RouteStage, включаем ProductionStageLevel1 для stageName
              returnToStage: {
                include: {
                  stage: true,
                },
              },
              returnToMachine: true,
              pallet: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          })
        : [];

    // Группируем ВСЕ возвраты по partId → массив событий
    const returnEventsByPartId = new Map<
      number,
      (typeof returnMovements)
    >();
    for (const mv of returnMovements) {
      if (!returnEventsByPartId.has(mv.partId)) {
        returnEventsByPartId.set(mv.partId, []);
      }
      returnEventsByPartId.get(mv.partId)!.push(mv);
    }

    // Формируем результат
    const defectDetails: DefectDetail[] = filteredReclamations.map((rec) => {
      const partReturns = returnEventsByPartId.get(rec.partId) ?? [];

      // Преобразуем каждое движение в DefectReturnEvent
      const returnEvents: DefectReturnEvent[] = partReturns
        .filter((mv) => mv.returnToStageId !== null)
        .map((mv) => ({
          movementId: mv.movementId,
          returnedAt: mv.createdAt,
          returnedQuantity: Number(mv.deltaQuantity),
          returnToRouteStageId: mv.returnToStageId!,
          returnToStageName: mv.returnToStage?.stage?.stageName ?? null,
          returnToMachineId: mv.returnToMachineId,
          returnToMachineName: mv.returnToMachine?.machineName ?? null,
          returnPalletId: mv.palletId,
          returnPalletName: mv.pallet?.palletName ?? null,
          returnedByUserId: mv.userId,
        }));

      // Суммарное количество возвращённых деталей по всем событиям
      const totalReturnedQuantity = partReturns.reduce(
        (sum, mv) => sum + Number(mv.deltaQuantity),
        0,
      );

      // Все упаковки и заказы, к которым привязана деталь
      const packages = rec.part.productionPackageParts.map((ppp) => ({
        packageId: ppp.packageId,
        packageCode: ppp.package.packageCode,
        packageName: ppp.package.packageName,
        orderId: ppp.package.orderId,
        orderBatchNumber: ppp.package.order.batchNumber,
        orderName: ppp.package.order.orderName,
      }));

      return {
        reclamationId: rec.reclamationId,
        partId: rec.partId,
        partCode: rec.part.partCode,
        partName: rec.part.partName,
        defectQuantity: Number(rec.quantity),
        totalReturnedQuantity,
        defectTypes: rec.defects.map((d) => d.defectType.name),
        detectedAt: rec.createdAt,
        processedAt: rec.processedAt,
        status: rec.status,
        qualityAction: rec.qualityAction,
        note: rec.note,
        // Место обнаружения брака
        stageId: rec.routeStage.stageId,
        stageName: rec.routeStage.stage.stageName,
        machineId: rec.machineId,
        machineName: rec.machine?.machineName ?? null,
        palletId: rec.palletId,
        palletName: rec.pallet?.palletName ?? null,
        // Все упаковки и заказы (может быть несколько)
        packages,
        // Материал
        materialId: rec.part.materialId,
        materialName: rec.part.material?.materialName ?? null,
        materialSku: rec.part.material?.article ?? null,
        // Работники
        reportedById: rec.reportedById,
        reportedByName: rec.reportedBy
          ? `${rec.reportedBy.userDetail?.firstName ?? ''} ${rec.reportedBy.userDetail?.lastName ?? ''}`.trim()
          : null,
        confirmedById: rec.confirmedById,
        confirmedByName: rec.confirmedBy
          ? `${rec.confirmedBy.userDetail?.firstName ?? ''} ${rec.confirmedBy.userDetail?.lastName ?? ''}`.trim()
          : null,
        // Все события возврата (пустой массив если не возвращали)
        returnEvents,
      };
    });

    return defectDetails;
  }

  /**
   * Получить данные для фильтров страницы статистики брака:
   * - список заказов
   * - список материалов
   * - список станков (рабочих мест)
   * - список этапов производства (ProductionStageLevel1)
   */
  async getFilterOptions(): Promise<FilterOptions> {
    const [orders, materials, machines, stages] = await Promise.all([
      // Заказы: id, номер партии, название
      this.prisma.order.findMany({
        select: {
          orderId: true,
          batchNumber: true,
          orderName: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Материалы: id, название, артикул
      this.prisma.material.findMany({
        select: {
          materialId: true,
          materialName: true,
          article: true,
        },
        orderBy: { materialName: 'asc' },
      }),

      // Станки: id, название
      this.prisma.machine.findMany({
        select: {
          machineId: true,
          machineName: true,
        },
        orderBy: { machineName: 'asc' },
      }),

      // Этапы производства 1-го уровня: id, название
      this.prisma.productionStageLevel1.findMany({
        select: {
          stageId: true,
          stageName: true,
        },
        orderBy: { stageName: 'asc' },
      }),
    ]);

    return { orders, materials, machines, stages };
  }

  /**
   * Получить данные учёта выпуска продукции по рабочим местам (станкам).
   * Источник данных — таблица MachineOperationHistory (история завершённых операций).
   * Фильтры: период (startDate/endDate), конкретный станок (machineId).
   */
  async getMachineProduction(dto: GetMachineProductionDto): Promise<MachineProductionRecord[]> {
    // Строим условие WHERE
    const where: {
      machineId?: number;
      completedAt?: { gte?: Date; lte?: Date };
    } = {};

    if (dto.machineId) {
      where.machineId = dto.machineId;
    }

    if (dto.startDate || dto.endDate) {
      where.completedAt = {};
      if (dto.startDate) {
        where.completedAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.completedAt.lte = endDate;
      }
    }

    const operations = await this.prisma.machineOperationHistory.findMany({
      where,
      include: {
        machine: {
          select: {
            machineId: true,
            machineName: true,
            loadUnit: true,
          },
        },
        part: {
          include: {
            material: {
              select: {
                materialId: true,
                materialName: true,
                article: true,
              },
            },
            productionPackageParts: {
              include: {
                package: {
                  include: {
                    order: {
                      select: {
                        orderId: true,
                        batchNumber: true,
                        orderName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        pallet: {
          select: {
            palletId: true,
            palletName: true,
          },
        },
        routeStage: {
          include: {
            stage: {
              select: {
                stageId: true,
                stageName: true,
              },
            },
          },
        },
        operator: {
          include: {
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
    });

    return operations.map((op) => {
      const packages = op.part.productionPackageParts.map((ppp) => ({
        packageId: ppp.packageId,
        packageCode: ppp.package.packageCode,
        packageName: ppp.package.packageName,
        orderId: ppp.package.orderId,
        orderBatchNumber: ppp.package.order.batchNumber,
        orderName: ppp.package.order.orderName,
      }));

      const operatorName = op.operator
        ? `${op.operator.userDetail?.firstName ?? ''} ${op.operator.userDetail?.lastName ?? ''}`.trim() || null
        : null;

      return {
        operationId: op.operationId,
        machineId: op.machine.machineId,
        machineName: op.machine.machineName,
        machineLoadUnit: op.machine.loadUnit,
        partId: op.part.partId,
        partCode: op.part.partCode,
        partName: op.part.partName,
        partSize: op.part.size,
        materialId: op.part.material?.materialId ?? null,
        materialName: op.part.material?.materialName ?? null,
        materialSku: op.part.material?.article ?? null,
        palletId: op.pallet.palletId,
        palletName: op.pallet.palletName,
        routeStageId: op.routeStageId,
        stageId: op.routeStage.stage.stageId,
        stageName: op.routeStage.stage.stageName,
        quantityProcessed: Number(op.quantityProcessed),
        startedAt: op.startedAt,
        completedAt: op.completedAt,
        durationSeconds: op.duration,
        operatorId: op.operatorId,
        operatorName,
        packages,
      };
    });
  }
}
