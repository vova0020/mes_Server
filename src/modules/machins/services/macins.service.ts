import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { MachineResponseDto, MachineStatus } from '../dto/machineNoSmen.dto';
import { EventsService } from '../../websocket/services/events.service';
import { WebSocketRooms } from '../../websocket/types/rooms.types';
import { MachineStatus as PrismaMachineStatus } from '@prisma/client';

@Injectable()
export class MachinsService {
  constructor(
    private prisma: PrismaService,
    private readonly eventsService: EventsService,
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

    // Получаем первый связанный этап (участок) для обратной совместимости
    const firstStage = machine.machinesStages[0]?.stage || null;

    return {
      id: machine.machineId,
      name: machine.machineName,
      status: machine.status,
      recommendedLoad: Number(machine.recommendedLoad),
      noShiftAssignment: machine.noSmenTask,
      segmentId: firstStage?.stageId || null,
      segmentName: firstStage?.stageName || null,
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

    // Получаем первый связанный этап (участок) для обратной совместимости
    const firstStage = updatedMachine.machinesStages[0]?.stage || null;

    // Отправляем событие через новый WebSocket API
    this.eventsService.emitToRoom(
      WebSocketRooms.PRODUCT_MACHINES,
      'machineStatusUpdated',
      {
        machine: {
          id: updatedMachine.machineId,
          name: updatedMachine.machineName,
          status: updatedMachine.status,
          recommendedLoad: Number(updatedMachine.recommendedLoad),
          noShiftAssignment: updatedMachine.noSmenTask,
          segmentId: firstStage?.stageId || null,
          segmentName: firstStage?.stageName || null,
        },
        timestamp: new Date().toISOString(),
      }
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
}