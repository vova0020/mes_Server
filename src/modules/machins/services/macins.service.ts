import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { MachineResponseDto, MachineStatus } from '../dto/machineNoSmen.dto';
import { SocketService } from '../../websocket/services/socket.service';
import { MachineStatus as PrismaMachineStatus } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class MachinsService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
    private auditService: AuditService,
  ) {}

  /**
   * Получить подробную информацию о станке по его ID
   */
  async getMachineById(id: number): Promise<MachineResponseDto> {
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: id },
      include: {
        machinesStages: {
          include: {
            stage: true,
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${id} не найден`);
    }

    // Проверяем, привязан ли станок к финальному этапу (упаковка)
    const isFinalStage = machine.machinesStages.some(
      (ms) => ms.stage.finalStage,
    );

    let completedQuantity: number;

    if (isFinalStage) {
      // Для финального этапа считаем из PackingTask (как в getPackingMachinesByStageId)
      // Получаем завершенные задачи после сброса счетчика
      const completedTasks = await this.prisma.packingTask.findMany({
        where: {
          machineId: id,
          ...(machine.counterResetAt && {
            completedAt: {
              gte: machine.counterResetAt,
            },
          }),
          status: 'COMPLETED',
        },
      });

      // Получаем частично выполненные задачи после сброса счетчика
      const partialTasks = await this.prisma.packingTask.findMany({
        where: {
          machineId: id,
          ...(machine.counterResetAt && {
            assignedAt: {
              gte: machine.counterResetAt,
            },
          }),
          status: { in: ['IN_PROGRESS', 'PARTIALLY_COMPLETED'] },
          completedQuantity: { gt: 0 },
        },
      });

      const completedAmount = completedTasks.reduce(
        (sum, task) => sum + Number(task.completedQuantity),
        0,
      );

      const partialAmount = partialTasks.reduce(
        (sum, task) => sum + Number(task.completedQuantity),
        0,
      );

      const savedPartialAmount = Number(machine.partiallyCompleted) || 0;

      completedQuantity = completedAmount + partialAmount + savedPartialAmount;
    } else {
      // Для обычных этапов считаем из MachineAssignment
      const completedAssignments = await this.prisma.machineAssignment.findMany(
        {
          where: {
            machineId: id,
            completedAt: {
              not: null,
            },
            ...(machine.counterResetAt && {
              completedAt: {
                gte: machine.counterResetAt,
              },
            }),
          },
          include: {
            pallet: {
              select: {
                quantity: true,
                part: true,
              },
            },
          },
        },
      );

      const filteredAssignments = completedAssignments.filter((assignment) => {
        const isAfterReset =
          machine.counterResetAt && assignment.completedAt
            ? assignment.completedAt > machine.counterResetAt
            : true;
        return isAfterReset;
      });

      // Рассчитываем выполненное количество в зависимости от единицы измерения
      if (machine.loadUnit === 'м²') {
        completedQuantity = filteredAssignments.reduce((total, assignment) => {
          const part = assignment.pallet.part;
          const quantity = Number(assignment.processedQuantity || 0);
          return total + this.calculateSquareMeters(part, quantity);
        }, 0);
      } else if (machine.loadUnit === 'м³') {
        completedQuantity = filteredAssignments.reduce((total, assignment) => {
          const part = assignment.pallet.part;
          const quantity = Number(assignment.processedQuantity || 0);
          return total + this.calculateCubicMeters(part, quantity);
        }, 0);
      } else if (machine.loadUnit === 'м') {
        completedQuantity = filteredAssignments.reduce((total, assignment) => {
          const part = assignment.pallet.part;
          const quantity = Number(assignment.processedQuantity || 0);
          if (part.finishedLength != null) {
            return total + (part.finishedLength * quantity) / 1000;
          }
          return total;
        }, 0);
      } else if (machine.loadUnit === 'м кромки') {
        completedQuantity = filteredAssignments.reduce((total, assignment) => {
          const part = assignment.pallet.part;
          const quantity = Number(assignment.processedQuantity || 0);
          return total + this.calculateEdgeProcessingMeters(part, quantity);
        }, 0);
      } else {
        // Расчет в штуках
        completedQuantity = filteredAssignments.reduce(
          (total, assignment) =>
            total + Number(assignment.processedQuantity || 0),
          0,
        );
      }
    }

    // Рассчитываем процент выполнения
    const recommendedLoad = Number(machine.recommendedLoad);
    const roundedCompletedQuantity = Math.round(completedQuantity);
    const completionPercentage =
      recommendedLoad > 0
        ? Math.round((roundedCompletedQuantity / recommendedLoad) * 100)
        : 0;

    // Получаем первый связанный этап (участок) для обратной совместимости
    const firstStage = machine.machinesStages[0]?.stage || null;

    return {
      id: machine.machineId,
      name: machine.machineName,
      status: machine.status,
      recommendedLoad: recommendedLoad,
      noShiftAssignment: machine.noSmenTask,
      segmentId: firstStage?.stageId || null,
      segmentName: firstStage?.stageName || null,
      completedQuantity: roundedCompletedQuantity,
      completionPercentage: completionPercentage,
    };
  }

  /**
   * Обновить статус станка
   */
  async updateMachineStatus(
    machineId: number,
    status: MachineStatus,
  ): Promise<MachineResponseDto> {
    // Проверяем существует ли станок
    const existingMachine = await this.prisma.machine.findUnique({
      where: { machineId: machineId },
    });

    if (!existingMachine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    const oldStatus = existingMachine.status;

    // Обновляем статус станка - явно приводим к типу Prisma
    const updatedMachine = await this.prisma.machine.update({
      where: { machineId: machineId },
      data: { status: status as PrismaMachineStatus },
      include: {
        machinesStages: {
          include: {
            stage: true,
          },
        },
      },
    });

    // Логируем изменение статуса
    await this.auditService.logMachineStatusChange(
      machineId,
      oldStatus,
      status as PrismaMachineStatus,
      undefined,
    );

    // Получаем первый связанный этап (участок) для обратной совместимости
    const firstStage = updatedMachine.machinesStages[0]?.stage || null;

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'machine:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'machine_setting:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:statisticks'],
      'statisticks:event',
      { status: 'updated' },
    );

    return {
      id: updatedMachine.machineId,
      name: updatedMachine.machineName,
      status: updatedMachine.status,
      recommendedLoad: Number(updatedMachine.recommendedLoad),
      noShiftAssignment: updatedMachine.noSmenTask,
      segmentId: firstStage?.stageId || null,
      segmentName: firstStage?.stageName || null,
    };
  }

  /**
   * Вычисляет площадь в квадратных метрах на основе данных детали
   */
  private calculateSquareMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;

    if (!length || !width || length <= 0 || width <= 0) {
      return 0;
    }

    return (length * width * quantity) / 1000000;
  }

  /**
   * Вычисляет объем в кубических метрах на основе данных детали
   */
  private calculateCubicMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;
    const thickness = part.thickness;

    if (
      !length ||
      !width ||
      !thickness ||
      length <= 0 ||
      width <= 0 ||
      thickness <= 0
    ) {
      return 0;
    }

    return (length * width * thickness * quantity) / 1000000000;
  }

  /**
   * Вычисляет м кромки на основе заполненных полей облицовки
   */
  private calculateEdgeProcessingMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;

    if (!length || !width || length <= 0 || width <= 0) {
      return 0;
    }

    let edgeLength = 0;

    if (part.edgingNameL1) {
      edgeLength += length;
    }
    if (part.edgingNameL2) {
      edgeLength += length;
    }
    if (part.edgingNameW1) {
      edgeLength += width;
    }
    if (part.edgingNameW2) {
      edgeLength += width;
    }

    return (edgeLength * quantity) / 1000;
  }
}
