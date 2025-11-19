import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma.service';
import { EventType, MachineStatus, OrderStatus, PartStatus, PackageStatus } from '@prisma/client';
import { StatusChangeData, OperationData, MovementData } from '../interfaces/audit-context.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  // ========================================
  // Общие события
  // ========================================

  async logEvent(
    eventType: EventType,
    entityType: string,
    entityId: number,
    userId?: number,
    oldValue?: any,
    newValue?: any,
    metadata?: any,
  ) {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType,
          entityType,
          entityId,
          userId,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log event: ${error.message}`);
    }
  }

  // ========================================
  // Станки
  // ========================================

  async logMachineStatusChange(
    machineId: number,
    oldStatus: MachineStatus,
    newStatus: MachineStatus,
    changedBy?: number,
    reason?: string,
  ) {
    try {
      // Вычисляем длительность в предыдущем статусе
      const lastHistory = await this.prisma.machineStatusHistory.findFirst({
        where: { machineId },
        orderBy: { createdAt: 'desc' },
      });

      const duration = lastHistory
        ? Math.floor((Date.now() - lastHistory.createdAt.getTime()) / 1000)
        : null;

      await Promise.all([
        this.prisma.machineStatusHistory.create({
          data: {
            machineId,
            oldStatus,
            newStatus,
            changedBy,
            reason,
            duration,
          },
        }),
        this.logEvent(
          EventType.MACHINE_STATUS_CHANGED,
          'machine',
          machineId,
          changedBy,
          { status: oldStatus },
          { status: newStatus },
          { reason },
        ),
      ]);
    } catch (error) {
      this.logger.error(`Failed to log machine status change: ${error.message}`);
    }
  }

  async logMachineOperation(data: OperationData) {
    try {
      const duration = Math.floor(
        (data.completedAt.getTime() - data.startedAt.getTime()) / 1000,
      );

      await this.prisma.machineOperationHistory.create({
        data: {
          machineId: data.machineId,
          palletId: data.palletId,
          partId: data.partId,
          routeStageId: data.routeStageId,
          quantityProcessed: data.quantityProcessed,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          operatorId: data.operatorId,
          duration,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log machine operation: ${error.message}`);
    }
  }

  // ========================================
  // Заказы
  // ========================================

  async logOrderStatusChange(
    orderId: number,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
    changedBy?: number,
    reason?: string,
  ) {
    try {
      await Promise.all([
        this.prisma.orderStatusHistory.create({
          data: {
            orderId,
            oldStatus,
            newStatus,
            changedBy,
            reason,
          },
        }),
        this.logEvent(
          EventType.ORDER_STATUS_CHANGED,
          'order',
          orderId,
          changedBy,
          { status: oldStatus },
          { status: newStatus },
          { reason },
        ),
      ]);
    } catch (error) {
      this.logger.error(`Failed to log order status change: ${error.message}`);
    }
  }

  // ========================================
  // Детали
  // ========================================

  async logPartStatusChange(
    partId: number,
    oldStatus: PartStatus,
    newStatus: PartStatus,
    routeStageId?: number,
    machineId?: number,
  ) {
    try {
      await Promise.all([
        this.prisma.partStatusHistory.create({
          data: {
            partId,
            oldStatus,
            newStatus,
            routeStageId,
            machineId,
          },
        }),
        this.logEvent(
          EventType.PART_STATUS_CHANGED,
          'part',
          partId,
          undefined,
          { status: oldStatus },
          { status: newStatus },
          { routeStageId, machineId },
        ),
      ]);
    } catch (error) {
      this.logger.error(`Failed to log part status change: ${error.message}`);
    }
  }

  // ========================================
  // Поддоны
  // ========================================

  async logPalletMovement(data: MovementData) {
    try {
      await Promise.all([
        this.prisma.palletMovementHistory.create({
          data: {
            palletId: data.palletId,
            fromCellId: data.fromCellId,
            toCellId: data.toCellId,
            machineId: data.machineId,
            movementType: data.movementType,
            quantity: data.quantity,
            movedBy: data.movedBy,
          },
        }),
        this.logEvent(
          data.movementType === 'TO_MACHINE'
            ? EventType.PALLET_MOVED_TO_MACHINE
            : data.movementType === 'TO_PACKAGE'
              ? EventType.PALLET_ASSIGNED_TO_PACKAGE
              : EventType.PALLET_MOVED_TO_BUFFER,
          'pallet',
          data.palletId,
          data.movedBy,
          { fromCellId: data.fromCellId, machineId: data.machineId },
          { toCellId: data.toCellId, quantity: data.quantity },
          { movementType: data.movementType },
        ),
      ]);
    } catch (error) {
      this.logger.error(`Failed to log pallet movement: ${error.message}`);
    }
  }

  // ========================================
  // Упаковки
  // ========================================

  async logPackageStatusChange(
    packageId: number,
    oldStatus: PackageStatus,
    newStatus: PackageStatus,
    changedBy?: number,
  ) {
    try {
      await Promise.all([
        this.prisma.packageStatusHistory.create({
          data: {
            packageId,
            oldStatus,
            newStatus,
            changedBy,
          },
        }),
        this.logEvent(
          EventType.PACKAGE_STATUS_CHANGED,
          'package',
          packageId,
          changedBy,
          { status: oldStatus },
          { status: newStatus },
        ),
      ]);
    } catch (error) {
      this.logger.error(`Failed to log package status change: ${error.message}`);
    }
  }

  // ========================================
  // Рекламации
  // ========================================

  async logReclamationAction(
    reclamationId: number,
    action: string,
    performedBy?: number,
    oldStatus?: string,
    newStatus?: string,
    comment?: string,
  ) {
    try {
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId,
          action,
          oldStatus,
          newStatus,
          performedBy,
          comment,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log reclamation action: ${error.message}`);
    }
  }

  // ========================================
  // Брак
  // ========================================

  async logDefect(
    machineId: number,
    partId: number,
    defectType: string,
    quantity: number,
    routeStageId?: number,
  ) {
    try {
      await this.prisma.defectStatsByMachine.create({
        data: {
          machineId,
          partId,
          defectType,
          quantity,
          routeStageId,
          detectedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log defect: ${error.message}`);
    }
  }

  // ========================================
  // Производительность операторов
  // ========================================

  async updateOperatorPerformance(
    operatorId: number,
    machineId: number,
    quantityProcessed: number,
    defectQuantity: number,
    workDuration: number,
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.operatorPerformanceStats.upsert({
        where: {
          operatorId_machineId_date: {
            operatorId,
            machineId,
            date: today,
          },
        },
        create: {
          operatorId,
          machineId,
          date: today,
          quantityProcessed,
          defectQuantity,
          workDuration,
        },
        update: {
          quantityProcessed: { increment: quantityProcessed },
          defectQuantity: { increment: defectQuantity },
          workDuration: { increment: workDuration },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update operator performance: ${error.message}`);
    }
  }
}
