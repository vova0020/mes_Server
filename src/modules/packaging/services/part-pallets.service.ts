import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PartPalletsQueryDto } from '../dto/part-pallets-query.dto';
import { AssignPalletToPackageDto } from '../dto/assign-pallet-to-package.dto';
import { SocketService } from '../../websocket/services/socket.service';
import {
  PartPalletsResponseDto,
  PalletDetailDto,
  PartInfoDto,
  BufferCellInfoDto,
} from '../dto/part-pallets-response.dto';

@Injectable()
export class PartPalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  // Получение поддонов по ID детали
  async getPalletsByPartId(
    partId: number,
    packageId?: number,
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
      where: {
        ...whereClause,
        isActive: true,
      },
      orderBy: { palletId: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        part: {
          select: {
            status: true,
          },
        },
        packageAssignments: {
          select: {
            assignmentId: true,
            packageId: true,
            quantity: true,
            usedQuantity: true,
          },
        },
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
      where: {
        ...whereClause,
        isActive: true,
      },
    });

    // Преобразуем данные - показываем все поддоны
    const pallets: PalletDetailDto[] = filteredPallets.map((pallet) => {
        const currentBufferCell = pallet.palletBufferCells[0];

        // Проверяем, есть ли назначение для конкретной упаковки
        const packageAssignment = packageId
          ? pallet.packageAssignments.find((a) => a.packageId === packageId)
          : null;

        // Рассчитываем общее использованное количество
        const totalUsed = pallet.packageAssignments.reduce(
          (sum, assignment) => sum + assignment.usedQuantity.toNumber(),
          0,
        );

        // Всегда показываем доступное количество (исходное минус использованное)
        const availableQuantity = pallet.quantity.toNumber() - totalUsed;
        const displayQuantity = availableQuantity;

        return {
          palletId: pallet.palletId,
          palletName: pallet.palletName,
          quantity: displayQuantity,
          availableQuantity: availableQuantity,
          status: packageAssignment 
            ? 'AWAITING_PACKAGING' // Если назначен на эту упаковку
            : 'PENDING', // Иначе доступен для назначения
          assignedToPackage: packageAssignment
            ? true
            : pallet.packageAssignments.length > 0,
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
        part: {
          select: {
            status: true,
          },
        },
        packageAssignments: {
          select: {
            assignmentId: true,
            quantity: true,
            usedQuantity: true,
          },
        },
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

    // Рассчитываем доступное количество с учетом usedQuantity
    const totalUsed = palletRaw.packageAssignments.reduce(
      (sum, assignment) => sum + assignment.usedQuantity.toNumber(),
      0,
    );
    const availableQuantity = palletRaw.quantity.toNumber() - totalUsed;

    return {
      palletId: palletRaw.palletId,
      palletName: palletRaw.palletName,
      quantity: availableQuantity,
      availableQuantity: availableQuantity,
      status: palletRaw.part.status as string,
      assignedToPackage: palletRaw.packageAssignments.length > 0,
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

  // Назначение поддона на упаковку
  async assignPalletToPackage(dto: AssignPalletToPackageDto) {
    const { palletId, packageId, quantity } = dto;

    // Проверяем существование поддона
    const pallet = await this.prisma.pallet.findUnique({
      where: { palletId },
      include: {
        part: {
          select: {
            status: true,
            route: {
              select: {
                routeStages: {
                  select: {
                    routeStageId: true,
                    sequenceNumber: true,
                    stage: {
                      select: {
                        finalStage: true,
                        stageName: true,
                      },
                    },
                  },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
          },
        },
        palletBufferCells: {
          where: { removedAt: null },
          include: { cell: true },
        },
        palletStageProgress: {
          select: {
            routeStageId: true,
            status: true,
          },
        },
      },
    });

    if (!pallet) {
      throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
    }

    // Проверяем существование упаковки
    const packageExists = await this.prisma.package.findUnique({
      where: { packageId },
    });

    if (!packageExists) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    // Получаем текущую ячейку (может быть null если уже назначен)
    const currentCell = pallet.palletBufferCells[0];

    // Проверяем количество
    if (quantity > pallet.quantity.toNumber()) {
      throw new BadRequestException(
        'Количество превышает доступное на поддоне',
      );
    }

    // Проверяем, что все предыдущие этапы перед финальным завершены
    const route = pallet.part.route;
    const nonFinalStages = route.routeStages.filter(
      (stage) => !stage.stage.finalStage,
    );

    if (nonFinalStages.length > 0) {
      const completedStages = pallet.palletStageProgress
        .filter((progress) => progress.status === 'COMPLETED')
        .map((progress) => progress.routeStageId);

      const incompleteStages = nonFinalStages.filter(
        (stage) => !completedStages.includes(stage.routeStageId),
      );

      if (incompleteStages.length > 0) {
        const stageNames = incompleteStages
          .map((stage) => stage.stage.stageName)
          .join(', ');
        throw new BadRequestException(
          `Поддон не может быть назначен на упаковку. Не завершены этапы: ${stageNames}`,
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Обновляем статус детали на AWAITING_PACKAGING
      await tx.part.update({
        where: { partId: pallet.partId },
        data: { status: 'AWAITING_PACKAGING' },
      });

      // Удаляем поддон из ячейки буфера (только если он там находится)
      if (currentCell) {
        await tx.palletBufferCell.update({
          where: { palletCellId: currentCell.palletCellId },
          data: { removedAt: new Date() },
        });

        // Обновляем загрузку ячейки
        await tx.bufferCell.update({
          where: { cellId: currentCell.cellId },
          data: {
            currentLoad: { decrement: pallet.quantity },
            status: 'AVAILABLE',
          },
        });
      }

      // Создаем назначение поддона на упаковку с сохранением исходного количества
      const assignment = await tx.palletPackageAssignment.create({
        data: {
          palletId,
          packageId,
          quantity,
          originalQuantity: pallet.quantity, // Сохраняем исходное количество на поддоне
        },
      });

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:masterypack',
          'room:machinesypack',
        ],
        'package:event',
        { status: 'updated' },
      );
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
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:masterypack',
          'room:machinesypack',
        ],
        'pallet:event',
        { status: 'updated' },
      );

      return {
        success: true,
        assignmentId: assignment.assignmentId,
        message: 'Поддон успешно назначен на упаковку',
      };
    });
  }
}
