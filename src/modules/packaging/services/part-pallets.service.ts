import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PartPalletsQueryDto } from '../dto/part-pallets-query.dto';
import {
  PartPalletsResponseDto,
  PalletDetailDto,
  PartInfoDto,
  BufferCellInfoDto,
} from '../dto/part-pallets-response.dto';

@Injectable()
export class PartPalletsService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение поддонов по ID детали
  async getPalletsByPartId(
    partId: number,
    query?: PartPalletsQueryDto,
  ): Promise<PartPalletsResponseDto> {
    // Сначала проверяем, существует ли деталь
    const partInfo = await this.prisma.part.findUnique({
      where: { partId },
      select: {
        partId: true,
        partCode: true,
        partName: true,
        status: true,
        totalQuantity: true,
        isSubassembly: true,
        readyForMainFlow: true,
        size: true,
        material: {
          select: {
            materialId: true,
            materialName: true,
            article: true,
            unit: true,
          },
        },
        route: {
          select: {
            routeId: true,
            routeName: true,
          },
        },
      },
    });

    if (!partInfo) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    // Строим условие фильтрации для поддонов
    let whereClause: any = {
      partId,
    };

    // Добавляем фильтр по названию поддона, если указан
    if (query?.palletName) {
      whereClause.palletName = {
        contains: query.palletName,
        mode: 'insensitive',
      };
    }

    // Получаем поддоны с пагинацией
    const { page = 1, limit = 10 } = query || {};

    const palletsRaw = await this.prisma.pallet.findMany({
      where: whereClause,
      orderBy: { palletId: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        palletBufferCells: {
          where: {
            removedAt: null, // Только текущие размещения
          },
          select: {
            placedAt: true,
            cell: {
              select: {
                cellId: true,
                cellCode: true,
                status: true,
                capacity: true,
                currentLoad: true,
                buffer: {
                  select: {
                    bufferId: true,
                    bufferName: true,
                    location: true,
                  },
                },
              },
            },
          },
          orderBy: {
            placedAt: 'desc',
          },
          take: 1, // Берем только последнее размещение
        },
        machineAssignments: {
          select: {
            assignmentId: true,
            machineId: true,
            assignedAt: true,
            completedAt: true,
            machine: {
              select: {
                machineName: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
        palletStageProgress: {
          select: {
            routeStageId: true,
            status: true,
            completedAt: true,
            routeStage: {
              select: {
                stage: {
                  select: {
                    stageName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            routeStageId: 'asc',
          },
        },
      },
    });

    // Если нужны только поддоны в ячейках, фильтруем
    let filteredPallets = palletsRaw;
    if (query?.onlyInCells) {
      filteredPallets = palletsRaw.filter(
        (pallet) => pallet.palletBufferCells.length > 0,
      );
    }

    // Получаем общее количество поддонов для пагинации
    const totalPallets = await this.prisma.pallet.count({
      where: whereClause,
    });

    // Преобразуем данные
    const pallets: PalletDetailDto[] = filteredPallets.map((pallet) => {
      const currentBufferCell = pallet.palletBufferCells[0];

      return {
        palletId: pallet.palletId,
        palletName: pallet.palletName,
        quantity: pallet.quantity.toNumber(),
        currentCell: currentBufferCell
          ? {
              cellId: currentBufferCell.cell.cellId,
              cellCode: currentBufferCell.cell.cellCode,
              status: currentBufferCell.cell.status as string,
              capacity: currentBufferCell.cell.capacity.toNumber(),
              currentLoad: currentBufferCell.cell.currentLoad.toNumber(),
              buffer: {
                bufferId: currentBufferCell.cell.buffer.bufferId,
                bufferName: currentBufferCell.cell.buffer.bufferName,
                location: currentBufferCell.cell.buffer.location,
              },
            }
          : undefined,
        placedAt: currentBufferCell?.placedAt,
        machineAssignments: pallet.machineAssignments.map((assignment) => ({
          assignmentId: assignment.assignmentId,
          machineId: assignment.machineId,
          machineName: assignment.machine.machineName,
          assignedAt: assignment.assignedAt,
          completedAt: assignment.completedAt || undefined,
        })),
        stageProgress: pallet.palletStageProgress.map((progress) => ({
          routeStageId: progress.routeStageId,
          stageName: progress.routeStage.stage.stageName,
          status: progress.status as string,
          completedAt: progress.completedAt || undefined,
        })),
      };
    });

    const partInfoDto: PartInfoDto = {
      partId: partInfo.partId,
      partCode: partInfo.partCode,
      partName: partInfo.partName,
      status: partInfo.status as string,
      totalQuantity: partInfo.totalQuantity.toNumber(),
      isSubassembly: partInfo.isSubassembly,
      readyForMainFlow: partInfo.readyForMainFlow,
      size: partInfo.size,
      material: {
        materialId: partInfo.material?.materialId || 0,
        materialName: partInfo.material?.materialName || 'Не указан',
        article: partInfo.material?.article || 'Не указан',
        unit: partInfo.material?.unit || 'шт',
      },
      route: {
        routeId: partInfo.route.routeId,
        routeName: partInfo.route.routeName,
      },
    };

    return {
      partInfo: partInfoDto,
      palletsCount: pallets.length,
      pallets,
      pagination: {
        page,
        limit,
        total: totalPallets,
        totalPages: Math.ceil(totalPallets / limit),
      },
    };
  }

  // Получение конкретного поддона детали
  async getPalletFromPart(
    partId: number,
    palletId: number,
  ): Promise<PalletDetailDto> {
    const palletRaw = await this.prisma.pallet.findFirst({
      where: {
        partId,
        palletId,
      },
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        palletBufferCells: {
          where: {
            removedAt: null, // Только текущие размещения
          },
          select: {
            placedAt: true,
            cell: {
              select: {
                cellId: true,
                cellCode: true,
                status: true,
                capacity: true,
                currentLoad: true,
                buffer: {
                  select: {
                    bufferId: true,
                    bufferName: true,
                    location: true,
                  },
                },
              },
            },
          },
          orderBy: {
            placedAt: 'desc',
          },
          take: 1, // Берем только последнее размещение
        },
        machineAssignments: {
          select: {
            assignmentId: true,
            machineId: true,
            assignedAt: true,
            completedAt: true,
            machine: {
              select: {
                machineName: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
        palletStageProgress: {
          select: {
            routeStageId: true,
            status: true,
            completedAt: true,
            routeStage: {
              select: {
                stage: {
                  select: {
                    stageName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            routeStageId: 'asc',
          },
        },
      },
    });

    if (!palletRaw) {
      throw new NotFoundException(
        `Поддон с ID ${palletId} не найден для детали с ID ${partId}`,
      );
    }

    const currentBufferCell = palletRaw.palletBufferCells[0];

    return {
      palletId: palletRaw.palletId,
      palletName: palletRaw.palletName,
      quantity: palletRaw.quantity.toNumber(),
      currentCell: currentBufferCell
        ? {
            cellId: currentBufferCell.cell.cellId,
            cellCode: currentBufferCell.cell.cellCode,
            status: currentBufferCell.cell.status as string,
            capacity: currentBufferCell.cell.capacity.toNumber(),
            currentLoad: currentBufferCell.cell.currentLoad.toNumber(),
            buffer: {
              bufferId: currentBufferCell.cell.buffer.bufferId,
              bufferName: currentBufferCell.cell.buffer.bufferName,
              location: currentBufferCell.cell.buffer.location,
            },
          }
        : undefined,
      placedAt: currentBufferCell?.placedAt,
      machineAssignments: palletRaw.machineAssignments.map((assignment) => ({
        assignmentId: assignment.assignmentId,
        machineId: assignment.machineId,
        machineName: assignment.machine.machineName,
        assignedAt: assignment.assignedAt,
        completedAt: assignment.completedAt || undefined,
      })),
      stageProgress: palletRaw.palletStageProgress.map((progress) => ({
        routeStageId: progress.routeStageId,
        stageName: progress.routeStage.stage.stageName,
        status: progress.status as string,
        completedAt: progress.completedAt || undefined,
      })),
    };
  }

  // Получение статистики по поддонам детали
  async getPartPalletsStatistics(partId: number) {
    // Проверяем существование детали
    const partExists = await this.prisma.part.findUnique({
      where: { partId },
      select: { partId: true },
    });

    if (!partExists) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    // Получаем общее количество поддонов
    const totalPallets = await this.prisma.pallet.count({
      where: { partId },
    });

    // Получаем количество поддонов в ячейках
    const palletsInCells = await this.prisma.pallet.count({
      where: {
        partId,
        palletBufferCells: {
          some: {
            removedAt: null,
          },
        },
      },
    });

    // Получаем статистику по прогрессу этапов
    const stageProgressStats = await this.prisma.palletStageProgress.groupBy({
      by: ['status'],
      where: {
        pallet: {
          partId,
        },
      },
      _count: {
        status: true,
      },
    });

    const progressByStatus = stageProgressStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPallets,
      palletsInCells,
      palletsNotInCells: totalPallets - palletsInCells,
      stageProgressByStatus: progressByStatus,
    };
  }
}
