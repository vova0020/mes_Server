import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma.service';
import { CreateMachineAssignmentDto } from '../dto/create-machine-assignment.dto';

@Injectable()
export class CustomMachinesService {
  constructor(private prisma: PrismaService) {}

  async createMachineAssignment(dto: CreateMachineAssignmentDto) {
    const { machineId, customPalletId, stageId, priority = 0 } = dto;

    // Проверка существования станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });
    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Проверка существования поддона
    const pallet = await this.prisma.customPallet.findUnique({
      where: { customPalletId },
      include: {
        customPalletParts: {
          include: {
            customPart: {
              include: {
                route: {
                  include: {
                    routeStages: {
                      where: { stageId },
                      include: {
                        stage: true,
                      },
                      orderBy: { sequenceNumber: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!pallet) {
      throw new NotFoundException(`Поддон с ID ${customPalletId} не найден`);
    }

    // Находим routeStage для указанного stageId
    const routeStages = pallet.customPalletParts
      .flatMap(pp => pp.customPart.route.routeStages)
      .filter(rs => rs.stageId === stageId);

    if (routeStages.length === 0) {
      // Получаем доступные этапы для более информативной ошибки
      const availableStages = pallet.customPalletParts
        .flatMap(pp => pp.customPart.route.routeStages)
        .map(rs => `${rs.stageId} (${rs.stage.stageName})`)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      throw new NotFoundException(
        `Этап с ID ${stageId} не найден в маршрутах деталей на поддоне. ` +
        `Доступные этапы: ${availableStages.join(', ')}`
      );
    }

    // Берем первый найденный routeStage (все детали должны иметь одинаковый маршрут)
    const routeStage = routeStages[0];

    // Создание задания на станок
    const assignment = await this.prisma.customMachineAssignment.create({
      data: {
        machineId,
        customPalletId,
        routeStageId: routeStage.routeStageId,
        priority,
        status: 'PENDING',
        assignedAt: new Date(),
        assignmentParts: {
          create: pallet.customPalletParts.map((palletPart) => ({
            customPartId: palletPart.customPartId,
            plannedQuantity: palletPart.quantity,
            processedQuantity: 0,
            status: 'PENDING',
          })),
        },
      },
      include: {
        machine: true,
        customPallet: {
          include: {
            customPalletParts: {
              include: {
                customPart: true,
              },
            },
          },
        },
        routeStage: {
          include: {
            stage: true,
          },
        },
        assignmentParts: {
          include: {
            customPart: true,
          },
        },
      },
    });

    return assignment;
  }

}
