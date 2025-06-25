import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { TaskStatus } from '@prisma/client';
import { EventsGateway } from 'src/modules/websocket/events.gateway';

@Injectable()
export class PalletMachineService {
  private readonly logger = new Logger(PalletMachineService.name);
  constructor(
    private prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Начать обработку поддона на станке
   * @param palletId - ID поддона
   * @param machineId - ID станка
   * @param operatorId - ID оператора (опционально)
   */
  async startPalletProcessing(
    palletId: number,
    machineId: number,
    operatorId?: number,
  ) {
    // Проверяем существование поддона
    const pallet = await this.prisma.pallet.findUnique({
      where: { palletId: palletId },
      include: {
        part: {
          include: {
            route: {
              include: {
                routeStages: {
                  include: {
                    stage: true,
                    substage: true,
                  },
                  orderBy: {
                    sequenceNumber: 'asc',
                  },
                },
              },
            },
          },
        },
        palletStageProgress: {
          include: {
            routeStage: {
              include: {
                stage: true,
                substage: true,
              },
            },
          },
          orderBy: {
            pspId: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!pallet) {
      this.logger.error(`Поддон с ID ${palletId} не найден`);
      throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
    }

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: machineId },
      include: {
        machinesStages: {
          include: {
            stage: true,
          },
        },
        machineSubstages: {
          include: {
            substage: {
              include: {
                stage: true,
              },
            },
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Определяем текущий этап обработки поддона
    let currentRouteStage: any = null;

    // Если есть прогресс по этапам, берем последний незавершенный или следующий
    if (pallet.palletStageProgress.length > 0) {
      const lastProgress = pallet.palletStageProgress[0];
      if (lastProgress.status !== 'COMPLETED') {
        currentRouteStage = lastProgress.routeStage;
      } else {
        // Ищем следующий этап в маршруте
        const currentSequence = lastProgress.routeStage.sequenceNumber;
        currentRouteStage = pallet.part.route?.routeStages.find(
          (rs) => rs.sequenceNumber > currentSequence,
        );
      }
    } else if (pallet.part.route && pallet.part.route.routeStages.length > 0) {
      // Если нет прогресса, берем первый этап из маршрута
      currentRouteStage = pallet.part.route.routeStages[0];
    }

    if (!currentRouteStage) {
      const errorMsg = `У поддона ${palletId} не определен текущий этап обработки`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Проверяем, может ли станок выполнять этот этап
    const canProcessStage =
      machine.machinesStages.some(
        (ms) => ms.stageId === currentRouteStage.stageId,
      ) ||
      (currentRouteStage.substageId &&
        machine.machineSubstages.some(
          (ms) => ms.substageId === currentRouteStage.substageId,
        ));

    if (!canProcessStage) {
      const errorMsg = `Станок ${machineId} не может выполнять текущий этап обработки поддона ${palletId}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Проверяем, что поддон еще не находится в обработке на ДРУГОМ станке
    const existingAssignment = await this.prisma.machineAssignment.findFirst({
      where: {
        palletId: palletId,
        completedAt: null, // Активное назначение
        machineId: { not: machineId }, // На другом станке
      },
    });

    if (existingAssignment) {
      const errorMsg = `Поддон ${palletId} уже находится в обработке на станке ${existingAssignment.machineId}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Проверяем, есть ли уже активное назначение на этом же станке
    const currentAssignment = await this.prisma.machineAssignment.findFirst({
      where: {
        palletId: palletId,
        machineId: machineId,
        completedAt: null,
      },
      select: {
        assignmentId: true,
        machineId: true,
        palletId: true,
        assignedAt: true,
        machine: {
          select: {
            machineId: true,
            machineName: true,
            status: true,
          },
        },
        pallet: {
          select: {
            palletId: true,
            palletName: true,
            partId: true,
            part: {
              select: {
                partId: true,
                partName: true,
              },
            },
          },
        },
      },
    });

    if (currentAssignment) {
      this.logger.log(
        `Поддон ${palletId} уже находится в обработке на текущем станке ${machineId}`,
      );

      // Обновляем прогресс этапа на "В ПРОЦЕССЕ"
      await this.prisma.palletStageProgress.updateMany({
        where: {
          palletId: palletId,
          routeStageId: currentRouteStage.routeStageId,
          status: 'PENDING',
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      // Отправляем событие
      this.eventsGateway.server
        .to('palets')
        .emit('startWork', currentAssignment);
      return currentAssignment;
    }

    // Создаем новое назначение на станок и обновляем прогресс
    return this.prisma.$transaction(async (prisma) => {
      // Создаем назначение станка
      const assignedAt = new Date();
      const newAssignment = await prisma.machineAssignment.create({
        data: {
          machineId: machineId,
          palletId: palletId,
          assignedAt,
        },
        select: {
          assignmentId: true,
          machineId: true,
          palletId: true,
          assignedAt: true,
        },
      });

      // Создаем или обновляем прогресс этапа
      const existingProgress = await prisma.palletStageProgress.findFirst({
        where: {
          palletId: palletId,
          routeStageId: currentRouteStage.routeStageId,
        },
      });

      if (existingProgress) {
        await prisma.palletStageProgress.update({
          where: { pspId: existingProgress.pspId },
          data: { status: 'IN_PROGRESS' },
        });
      } else {
        await prisma.palletStageProgress.create({
          data: {
            palletId: palletId,
            routeStageId: currentRouteStage.routeStageId,
            status: 'IN_PROGRESS',
          },
        });
      }

      // Получаем минимальные данные для ответа
      const optimizedAssignment = {
        assignmentId: newAssignment.assignmentId,
        machineId: newAssignment.machineId,
        palletId: newAssignment.palletId,
        assignedAt: newAssignment.assignedAt,
        completedAt: null,
        machine: {
          machineId: machine.machineId,
          machineName: machine.machineName,
          status: machine.status,
        },
        pallet: {
          palletId: pallet.palletId,
          palletName: pallet.palletName,
          partId: pallet.partId,
          part: {
            partId: pallet.part.partId,
            partName: pallet.part.partName,
          },
        },
      };

      // Отправляем событие
      this.eventsGateway.server
        .to('palets')
        .emit('startWork', optimizedAssignment);
      return optimizedAssignment;
    });
  }

  /**
   * Завершить обработку поддона на станке
   */
  async completePalletProcessing(
    palletId: number,
    machineId: number,
    operatorId?: number,
    stageId?: number,
  ) {
    // Находим активное назначение с минимальными данными
    const assignment = await this.prisma.machineAssignment.findFirst({
      where: {
        palletId: palletId,
        machineId: machineId,
        completedAt: null,
      },
      select: {
        assignmentId: true,
        machineId: true,
        palletId: true,
        assignedAt: true,
        machine: {
          select: {
            machineId: true,
            machineName: true,
            status: true,
          },
        },
        pallet: {
          select: {
            palletId: true,
            palletName: true,
            partId: true,
            part: {
              select: {
                partId: true,
                partName: true,
                routeId: true,
                route: {
                  select: {
                    routeId: true,
                    routeName: true,
                    routeStages: {
                      select: {
                        routeStageId: true,
                        sequenceNumber: true,
                        stageId: true,
                        substageId: true,
                        stage: {
                          select: {
                            stageId: true,
                            stageName: true,
                          },
                        },
                        substage: {
                          select: {
                            substageId: true,
                            substageName: true,
                          },
                        },
                      },
                      orderBy: {
                        sequenceNumber: 'asc',
                      },
                    },
                  },
                },
              },
            },
            palletStageProgress: {
              select: {
                pspId: true,
                palletId: true,
                routeStageId: true,
                status: true,
                routeStage: {
                  select: {
                    routeStageId: true,
                    sequenceNumber: true,
                    stageId: true,
                    substageId: true,
                    stage: {
                      select: {
                        stageId: true,
                        stageName: true,
                      },
                    },
                    substage: {
                      select: {
                        substageId: true,
                        substageName: true,
                      },
                    },
                  },
                },
              },
              where: {
                status: 'IN_PROGRESS',
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new Error(
        `Не найдено активное назначение для поддона ${palletId} на станке ${machineId}`,
      );
    }

    const currentProgress = assignment.pallet.palletStageProgress[0];
    if (!currentProgress) {
      throw new Error(
        `Не найден активный прогресс этапа для поддона ${palletId}`,
      );
    }

    // Определяем следующий этап
    const currentSequence = currentProgress.routeStage.sequenceNumber;
    const nextRouteStage = assignment.pallet.part.route?.routeStages.find(
      (rs) => rs.sequenceNumber > currentSequence,
    );

    return this.prisma.$transaction(async (prisma) => {
      // Завершаем назначение станка
      const completedAt = new Date();
      await prisma.machineAssignment.update({
        where: { assignmentId: assignment.assignmentId },
        data: { completedAt },
      });

      // Завершаем текущий прогресс этапа
      await prisma.palletStageProgress.update({
        where: { pspId: currentProgress.pspId },
        data: {
          status: 'COMPLETED',
          completedAt,
        },
      });

      // Если есть следующий этап, создаем для него прогресс
      if (nextRouteStage) {
        await prisma.palletStageProgress.create({
          data: {
            palletId: palletId,
            routeStageId: nextRouteStage.routeStageId,
            status: 'PENDING',
          },
        });
      }

      // Обновляем прогресс детали по маршруту
      const existingPartProgress = await prisma.partRouteProgress.findFirst({
        where: {
          partId: assignment.pallet.partId,
          routeStageId: currentProgress.routeStageId,
        },
      });

      if (existingPartProgress) {
        await prisma.partRouteProgress.update({
          where: { prpId: existingPartProgress.prpId },
          data: {
            status: 'COMPLETED',
            completedAt,
          },
        });
      } else {
        await prisma.partRouteProgress.create({
          data: {
            partId: assignment.pallet.partId,
            routeStageId: currentProgress.routeStageId,
            status: 'COMPLETED',
            completedAt,
          },
        });
      }

      // Возвращаем оптимизированный ответ с минимальными данными
      return {
        assignment: {
          assignmentId: assignment.assignmentId,
          machineId: assignment.machineId,
          palletId: assignment.palletId,
          assignedAt: assignment.assignedAt,
          completedAt,
          machine: {
            machineId: assignment.machine.machineId,
            machineName: assignment.machine.machineName,
            status: assignment.machine.status,
          },
          pallet: {
            palletId: assignment.pallet.palletId,
            palletName: assignment.pallet.palletName,
            partId: assignment.pallet.partId,
            part: {
              partId: assignment.pallet.part.partId,
              partName: assignment.pallet.part.partName,
            },
          },
        },
        nextStage: nextRouteStage
          ? `Установлен следующий этап: ${nextRouteStage.stage.stageName}`
          : 'Обработка завершена',
      };
    });
  }

  /**
   * Получить информацию о поддоне
   */
  async getPalletInfo(palletId: number) {
    return this.prisma.pallet.findUnique({
      where: { palletId: palletId },
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        partId: true,
        part: {
          select: {
            partId: true,
            partCode: true,
            partName: true,
            status: true,
            totalQuantity: true,
          },
        },
        machineAssignments: {
          select: {
            assignmentId: true,
            machineId: true,
            assignedAt: true,
            completedAt: true,
            machine: {
              select: {
                machineId: true,
                machineName: true,
                status: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 5,
        },
        palletBufferCells: {
          select: {
            palletCellId: true,
            placedAt: true,
            cell: {
              select: {
                cellId: true,
                cellCode: true,
                status: true,
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
          where: {
            removedAt: null, // Активные размещения в буфере
          },
        },
        palletStageProgress: {
          select: {
            pspId: true,
            status: true,
            completedAt: true,
            routeStage: {
              select: {
                routeStageId: true,
                sequenceNumber: true,
                stage: {
                  select: {
                    stageId: true,
                    stageName: true,
                  },
                },
                substage: {
                  select: {
                    substageId: true,
                    substageName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            pspId: 'desc',
          },
        },
      },
    });
  }

  /**
   * Получить список поддонов, готовых к обработке на конкретном станке
   */
  async getPalletsForMachine(machineId: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: machineId },
      include: {
        machinesStages: {
          include: {
            stage: true,
          },
        },
        machineSubstages: {
          include: {
            substage: {
              include: {
                stage: true,
              },
            },
          },
        },
      },
    });

    if (!machine) {
      throw new Error(`Станок с ID ${machineId} не найден`);
    }

    // Получаем ID этапов уровня 1, которые может выполнять станок
    const stageIds = machine.machinesStages.map((ms) => ms.stageId);
    // Получаем ID подэтапов уровня 2, которые может выполнять станок
    const substageIds = machine.machineSubstages.map((ms) => ms.substageId);

    if (stageIds.length === 0 && substageIds.length === 0) {
      return [];
    }

    // Находим поддоны, которые готовы к обработке на этом станке
    const pallets = await this.prisma.pallet.findMany({
      where: {
        // Исключаем поддоны, которые уже назначены на другие станки
        machineAssignments: {
          none: {
            completedAt: null, // Активные назначения
            machineId: { not: machineId }, // На других станках
          },
        },
        // Ищем поддоны с подходящими этапами
        palletStageProgress: {
          some: {
            status: 'PENDING',
            routeStage: {
              OR: [
                ...(stageIds.length > 0 ? [{ stageId: { in: stageIds } }] : []),
                ...(substageIds.length > 0
                  ? [{ substageId: { in: substageIds } }]
                  : []),
              ],
            },
          },
        },
      },
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        partId: true,
        part: {
          select: {
            partId: true,
            partCode: true,
            partName: true,
            status: true,
            totalQuantity: true,
          },
        },
        palletStageProgress: {
          select: {
            pspId: true,
            status: true,
            routeStage: {
              select: {
                routeStageId: true,
                sequenceNumber: true,
                stage: {
                  select: {
                    stageId: true,
                    stageName: true,
                  },
                },
                substage: {
                  select: {
                    substageId: true,
                    substageName: true,
                  },
                },
              },
            },
          },
          where: {
            status: 'PENDING',
          },
        },
        palletBufferCells: {
          select: {
            palletCellId: true,
            placedAt: true,
            cell: {
              select: {
                cellId: true,
                cellCode: true,
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
          where: {
            removedAt: null,
          },
        },
      },
    });

    return pallets;
  }

  /**
   * Переместить поддон в буфер
   */
  async movePalletToBuffer(palletId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона ${palletId} в буфер (ячейка ${bufferCellId})`,
    );

    try {
      const pallet = await this.prisma.pallet.findUnique({
        where: { palletId: palletId },
        include: {
          machineAssignments: {
            where: {
              completedAt: null,
            },
            take: 1,
          },
          palletBufferCells: {
            where: {
              removedAt: null,
            },
          },
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { cellId: bufferCellId },
        include: {
          palletBufferCells: {
            where: {
              removedAt: null,
            },
            include: {
              pallet: true,
            },
          },
        },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячейка буфера с ID ${bufferCellId} не найдена`,
        );
      }

      if (
        bufferCell.status !== 'AVAILABLE' &&
        bufferCell.status !== 'OCCUPIED'
      ) {
        throw new Error(
          `Ячейка буфера ${bufferCell.cellCode} недоступна. Текущий статус: ${bufferCell.status}`,
        );
      }

      // Проверяем вместимость
      const isCurrentPalletInThisCell = pallet.palletBufferCells.some(
        (pbc) => pbc.cellId === bufferCell.cellId,
      );
      const effectivePalletsCount = isCurrentPalletInThisCell
        ? bufferCell.palletBufferCells.length
        : bufferCell.palletBufferCells.length + 1;

      // ИСПРАВЛЕНО: Приводим Decimal к number для сравнения
      if (effectivePalletsCount > Number(bufferCell.capacity)) {
        throw new Error(
          `Ячейка буфера ${bufferCell.cellCode} уже заполнена до максимальной вместимости`,
        );
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Если поддон был в другой ячейке, завершаем предыдущее размещение
        if (pallet.palletBufferCells.length > 0) {
          for (const oldPlacement of pallet.palletBufferCells) {
            if (oldPlacement.cellId !== bufferCellId) {
              await prisma.palletBufferCell.update({
                where: { palletCellId: oldPlacement.palletCellId },
                data: { removedAt: new Date() },
              });

              // Обновляем статус старой ячейки
              const oldCell = await prisma.bufferCell.findUnique({
                where: { cellId: oldPlacement.cellId },
                include: {
                  palletBufferCells: {
                    where: { removedAt: null },
                  },
                },
              });

              if (oldCell && oldCell.palletBufferCells.length <= 1) {
                await prisma.bufferCell.update({
                  where: { cellId: oldPlacement.cellId },
                  data: { status: 'AVAILABLE', currentLoad: 0 },
                });
              }
            }
          }
        }

        // Создаем новое размещение в буфере (если поддон еще не в этой ячейке)
        if (!isCurrentPalletInThisCell) {
          await prisma.palletBufferCell.create({
            data: {
              palletId: palletId,
              cellId: bufferCellId,
              placedAt: new Date(),
            },
          });
        }

        // Обновляем статус новой ячейки
        // ИСПРАВЛЕНО: Приводим Decimal к number для сравнения
        const newStatus =
          effectivePalletsCount >= Number(bufferCell.capacity)
            ? 'OCCUPIED'
            : 'AVAILABLE';
        await prisma.bufferCell.update({
          where: { cellId: bufferCellId },
          data: {
            status: newStatus,
            currentLoad: effectivePalletsCount,
          },
        });

        return {
          message: 'Поддон успешно перемещен в буфер',
          pallet: pallet,
        };
      });
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении поддона в буфер: ${error.message}`,
      );
      throw error;
    }
  }
}
