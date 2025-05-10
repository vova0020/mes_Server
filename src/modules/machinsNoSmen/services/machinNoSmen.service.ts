import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  MachineResponseDto,
  MachineStatus,
  PalletsResponseDto,
  SegmentOrdersResponseDto,
} from '../dto/machineNoSmen.dto';

@Injectable()
export class MachinNoSmenService {
  constructor(private prisma: PrismaService) {}

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

  /**
   * Получить все заказы и детали, которые требуют обрабо��ки на конкретном участке
   */
  async getSegmentOrders(segmentId: number): Promise<SegmentOrdersResponseDto> {
    // Сначала проверяем, существует ли участок
    const segment = await this.prisma.productionSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем этапы процесса, связанные с этим участком
    const segmentProcessSteps = await this.prisma.segmentProcessStep.findMany({
      where: { segmentId },
      include: { processStep: true },
    });

    const processStepIds = segmentProcessSteps.map((step) => step.processStepId);

    // Получаем все детали, у которых есть операции, требующие обработки на этих этапах
    const detailsWithStatus = await this.prisma.detailSegmentStatus.findMany({
      where: { segmentId },
      include: {
        detail: true,
      },
    });

    // Получаем все заказы, связанные с этими деталями
    const detailIds = detailsWithStatus.map((d) => d.detailId);

    // По��учаем УПАК-и с деталями, которые обрабатываются на этом участке
    const ypaksWithDetails = await this.prisma.productionYpakDetail.findMany({
      where: {
        detailId: { in: detailIds },
      },
      include: {
        ypak: {
          include: {
            order: true,
          },
        },
      },
    });

    // Извлекаем уникальные заказы из УПАК-ов
    const uniqueOrdersMap = new Map();
    ypaksWithDetails.forEach((ypakDetail) => {
      const order = ypakDetail.ypak.order;
      uniqueOrdersMap.set(order.id, order);
    });

    const orders = Array.from(uniqueOrdersMap.values());

    return {
      orders: orders.map((order) => ({
        id: order.id,
        runNumber: order.runNumber,
        name: order.name,
        progress: order.progress,
      })),
      details: detailsWithStatus.map((ds) => ({
        id: ds.detail.id,
        article: ds.detail.article,
        name: ds.detail.name,
        material: ds.detail.material,
        size: ds.detail.size,
        totalNumber: ds.detail.totalNumber,
        isCompletedForSegment: ds.isCompleted,
      })),
    };
  }

  /**
   * Получить все поддоны для конкретной детали
   */
  async getPalletsByDetailId(detailId: number): Promise<PalletsResponseDto> {
    // Проверяем, существует ли деталь
    const detail = await this.prisma.productionDetail.findUnique({
      where: { id: detailId },
    });

    if (!detail) {
      throw new NotFoundException(`Деталь с ID ${detailId} не найдена`);
    }

    // Получаем все поддоны для этой детали
    const pallets = await this.prisma.productionPallets.findMany({
      where: {
        detailId,
      },
      include: {
        detail: true,
        currentStep: true,
        bufferCell: {
          include: {
            buffer: true,
          },
        },
      },
    });

    return {
      pallets: pallets.map((pallet) => ({
        id: pallet.id,
        name: pallet.name,
        quantity: pallet.quantity,
        detail: {
          id: pallet.detail.id,
          article: pallet.detail.article,
          name: pallet.detail.name,
          material: pallet.detail.material,
          size: pallet.detail.size,
          totalNumber: pallet.detail.totalNumber,
          isCompletedForSegment: false, // Это будет вычислено при необходимости
        },
        currentStepId: pallet.currentStepId,
        currentStepName: pallet.currentStep?.name || null,
        bufferCell: pallet.bufferCell
          ? {
              id: pallet.bufferCell.id,
              code: pallet.bufferCell.code,
              bufferName: pallet.bufferCell.buffer.name,
            }
          : null,
      })),
    };
  }
}