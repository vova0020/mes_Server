import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { MachineResponseDto, MachineStatus } from '../dto/machineNoSmen.dto';
import { EventsGateway } from 'src/modules/websocket/events.gateway';

@Injectable()
export class MachinsService {
  constructor(
    private prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Получить подробную информацию о станке по его ID
   */
  async getMachineById(id: number): Promise<MachineResponseDto> {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        segment: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${id} не найден`);
    }

    return {
      id: machine.id,
      name: machine.name,
      status: machine.status,
      recommendedLoad: machine.recommendedLoad,
      noShiftAssignment: machine.noShiftAssignment,
      segmentId: machine.segmentId,
      segmentName: machine.segment?.name || null,
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
      where: { id: machineId },
    });

    if (!existingMachine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Обновляем статус станка
    const updatedMachine = await this.prisma.machine.update({
      where: { id: machineId },
      data: { status },
      include: {
        segment: true,
      },
    });

    // Отправляем событие всем клиентам из комнаты 'machines'
    const Machine = {
      id: updatedMachine.id,
      name: updatedMachine.name,
      status: updatedMachine.status,
      // …другие нужные поля
    };
    this.eventsGateway.server.to('machines').emit('updateStatus', Machine);

    return {
      id: updatedMachine.id,
      name: updatedMachine.name,
      status: updatedMachine.status,
      recommendedLoad: updatedMachine.recommendedLoad,
      noShiftAssignment: updatedMachine.noShiftAssignment,
      segmentId: updatedMachine.segmentId,
      segmentName: updatedMachine.segment?.name || null,
    };
  }
}
