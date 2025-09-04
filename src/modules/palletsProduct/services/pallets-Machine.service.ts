import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { TaskStatus } from '@prisma/client';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class PalletMachineService {
  private readonly logger = new Logger(PalletMachineService.name);

  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) { }

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

    // Проверяем, что предыдущий этап пройден (если это не первый этап)
    const allRouteStages = pallet.part.route?.routeStages || [];
    const currentStageIndex = allRouteStages.findIndex(
      (rs) => rs.routeStageId === currentRouteStage.routeStageId,
    );

    if (currentStageIndex > 0) {
      // Это не первый этап, проверяем предыдущий
      const previousRouteStage = allRouteStages[currentStageIndex - 1];
      const previousStageProgress = pallet.palletStageProgress.find(
        (progress) => progress.routeStageId === previousRouteStage.routeStageId,
      );

      if (
        !previousStageProgress ||
        previousStageProgress.status !== 'COMPLETED'
      ) {
        const errorMsg = `Нельзя взять поддон ${palletId} в работу. Предыдущий этап "${previousRouteStage.stage.stageName}" не завершен`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
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

      // При переводе в статус IN_PROGRESS убираем поддон из буфера
      const bufferPlacement = await this.prisma.palletBufferCell.findFirst({
        where: { palletId, removedAt: null },
        include: {
          cell: {
            include: {
              palletBufferCells: { where: { removedAt: null } },
            },
          },
        },
      });

      if (bufferPlacement) {
        // Закрываем запись о размещении в буфере
        await this.prisma.palletBufferCell.update({
          where: { palletCellId: bufferPlacement.palletCellId },
          data: { removedAt: new Date() },
        });

        const remaining = bufferPlacement.cell.palletBufferCells.filter(
          (p) => p.palletId !== palletId,
        );
        const newLoad = remaining.length;
        const newStatus =
          newLoad === 0
            ? 'AVAILABLE'
            : newLoad >= Number(bufferPlacement.cell.capacity)
              ? 'OCCUPIED'
              : 'AVAILABLE';

        await this.prisma.bufferCell.update({
          where: { cellId: bufferPlacement.cellId },
          data: { currentLoad: newLoad, status: newStatus },
        });

        this.logger.log(
          `Поддон ${palletId} убран из ячейки ${bufferPlacement.cell.cellCode} (статус IN_PROGRESS)`,
        );
      }

      // Отправляем WebSocket события
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'machine_task:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket события
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'detail:event',
        { status: 'updated' },
      );

      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:stats',
        { status: 'updated' },
      );

      return currentAssignment;
    }

    // Создаем новое назначение на станок и обновляем прогресс
    const result = await this.prisma.$transaction(async (prisma) => {
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

      // При переводе в статус IN_PROGRESS убираем поддон из буфера
      const bufferPlacement = await prisma.palletBufferCell.findFirst({
        where: { palletId, removedAt: null },
        include: {
          cell: {
            include: {
              palletBufferCells: { where: { removedAt: null } },
            },
          },
        },
      });

      if (bufferPlacement) {
        // Закрываем запись о размещении в буфере
        await prisma.palletBufferCell.update({
          where: { palletCellId: bufferPlacement.palletCellId },
          data: { removedAt: new Date() },
        });

        const remaining = bufferPlacement.cell.palletBufferCells.filter(
          (p) => p.palletId !== palletId,
        );
        const newLoad = remaining.length;
        const newStatus =
          newLoad === 0
            ? 'AVAILABLE'
            : newLoad >= Number(bufferPlacement.cell.capacity)
              ? 'OCCUPIED'
              : 'AVAILABLE';

        await prisma.bufferCell.update({
          where: { cellId: bufferPlacement.cellId },
          data: { currentLoad: newLoad, status: newStatus },
        });

        this.logger.log(
          `Поддон ${palletId} убран из ячейки ${bufferPlacement.cell.cellCode} (статус IN_PROGRESS)`,
        );
      }

      // Обновляем статус детали на IN_PROGRESS если еще не обновлен
      await this.updatePartStatusIfNeeded(prisma, pallet.partId, 'IN_PROGRESS');

      // Получаем минимальные данные для ответа
      return {
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
    });

    // Отправляем WebSocket уведомления ПОСЛЕ завершения транзакции
    this.logger.log(`Отправка WebSocket событий для поддона ${palletId}`);

    // Проверяем, инициализирован ли WebSocket сервер
    const server = this.socketService.getServer();
    if (!server) {
      this.logger.error('WebSocket сервер не инициализирован!');
      return result;
    }

    this.logger.log(`WebSocket сервер найден, отправляем события...`);

    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'pallet:event',
      { status: 'updated', palletId },
    );
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'detail:event',
      { status: 'updated', palletId },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );

    this.logger.log(`WebSocket события отправлены для поддона ${palletId}`);

    return result;
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

      // === МОДИФИЦИРОВАННАЯ ЛОГИКА ===
      // Если есть следующий этап, создаем для него прогресс ТОЛЬКО если это этап упаковки (finalStage)
      if (nextRouteStage) {
        let nextIsPackaging = false;

        // Попробуем определить упаковку по имени этапа (быстрая проверка)
        const nextStageName = nextRouteStage.stage?.stageName ?? '';
        if (/упак/i.test(nextStageName)) {
          nextIsPackaging = true;
        } else {
          // Если имя не даёт уверенности, проверим поле finalStage в productionStageLevel1
          const nextStageInfo = await prisma.productionStageLevel1.findUnique({
            where: { stageId: nextRouteStage.stageId },
            select: { finalStage: true },
          });
          if (nextStageInfo?.finalStage) {
            nextIsPackaging = true;
          }
        }

        if (nextIsPackaging) {
          await prisma.palletStageProgress.create({
            data: {
              palletId: palletId,
              routeStageId: nextRouteStage.routeStageId,
              status: 'NOT_PROCESSED',
            },
          });
        }
        // Если следующий этап НЕ упаковка — пропускаем создание записи прогресса.
      }

      // Проверяем, все ли поддоны данной детали завершили текущий этап
      const allPalletsForPart = await prisma.pallet.findMany({
        where: { partId: assignment.pallet.partId },
        include: {
          palletStageProgress: {
            where: {
              routeStageId: currentProgress.routeStageId,
            },
          },
        },
      });

      // Считаем количество поддонов, которые завершили текущий этап
      const completedPalletsCount = allPalletsForPart.filter((pallet) =>
        pallet.palletStageProgress.some(
          (progress) =>
            progress.routeStageId === currentProgress.routeStageId &&
            progress.status === 'COMPLETED',
        ),
      ).length;

      // Обновляем прогресс детали по маршруту
      const shouldCompletePartProgress = await this.updatePartRouteProgress(
        prisma,
        assignment.pallet.partId,
        currentProgress.routeStageId,
        completedAt,
      );

      // Обновляем статус детали если все поддоны завершили этап
      if (shouldCompletePartProgress) {
        await this.updatePartStatusIfNeeded(
          prisma,
          assignment.pallet.partId,
          'COMPLETED',
        );
      }

      // Проверяем, является ли следующий этап финальным (упаковка)
      // Если следующего этапа нет, значит текущий был последним
      if (!nextRouteStage) {
        // Проверяем, все ли поддоны детали завершили все этапы
        const allRouteStages = assignment.pallet.part.route?.routeStages || [];
        const allStagesCompleted = await this.checkAllStagesCompleted(
          prisma,
          assignment.pallet.partId,
          allRouteStages,
        );

        if (allStagesCompleted) {
          // Создаем задачи упаковки для данной детали
          // await this.createPackingTasks(prisma, assignment.pallet.partId);
        }
      } else {
        // Проверяем, является ли следующий этап финальным
        const nextStage = await prisma.productionStageLevel1.findUnique({
          where: { stageId: nextRouteStage.stageId },
          select: { finalStage: true },
        });

        if (nextStage?.finalStage && shouldCompletePartProgress) {
          // Если следующий этап финальный и все поддоны завершили текущий этап,
          // создаем задачи упаковки
          // await this.createPackingTasks(prisma, assignment.pallet.partId);
        }
      }
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machinesnosmen'],
        'order:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'package:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'detail:event',
        { status: 'updated' },
      );
      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:stats',
        { status: 'updated' },
      );

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

        // Отправляем WebSocket уведомление о событии поддона
        this.socketService.emitToMultipleRooms(
          ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
          'detail:event',
          { status: 'updated' },
        );
        // Отправляем WebSocket уведомление о событии поддона
        this.socketService.emitToMultipleRooms(
          ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
          'pallet:event',
          { status: 'updated' },
        );

        // // Отправляем WebSocket уведомление о событии поддона
        // this.socketService.emitToMultipleRooms(
        //   ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        //   'buffer_settings:event',
        //   { status: 'updated' },
        // );

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

  /**
   * Проверяет, завершили ли все поддоны детали все этапы маршрута
   */
  private async checkAllStagesCompleted(
    prisma: any,
    partId: number,
    routeStages: any[],
  ): Promise<boolean> {
    // Получаем все поддоны для данной детали
    const allPallets = await prisma.pallet.findMany({
      where: { partId },
      include: {
        palletStageProgress: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    // Проверяем, что каждый поддон завершил все этапы
    for (const pallet of allPallets) {
      const completedStageIds = new Set(
        pallet.palletStageProgress.map(
          (progress: any) => progress.routeStageId,
        ),
      );

      // Проверяем, что поддон завершил все этапы маршрута
      for (const routeStage of routeStages) {
        if (!completedStageIds.has(routeStage.routeStageId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Создает задачи упаковки для детали
   */
  private async createPackingTasks(prisma: any, partId: number): Promise<void> {
    this.logger.log(`Создание задач упаковки для детали ${partId}`);

    try {
      // Получаем информацию о детали и связанных упаковках
      const part = await prisma.part.findUnique({
        where: { partId },
        include: {
          productionPackageParts: {
            include: {
              package: {
                include: {
                  order: true,
                },
              },
            },
          },
          pallets: {
            select: {
              palletId: true,
              palletName: true,
              quantity: true,
            },
          },
        },
      });

      if (!part || !part.productionPackageParts.length) {
        this.logger.warn(
          `Деталь ${partId} не найдена или не связана с упаковками`,
        );
        return;
      }

      // Создаем задачи упаковки для каждой связанной упаковки
      for (const packagePart of part.productionPackageParts) {
        const packageToProcess = packagePart.package;

        // Проверяем, не создана ли уже задача упаковки для этой упаковки
        const existingPackingTask = await prisma.packingTask.findFirst({
          where: {
            packageId: packageToProcess.packageId,
          },
        });

        if (existingPackingTask) {
          this.logger.log(
            `Задача упаковки для упаковки ${packageToProcess.packageId} уже существует`,
          );
          continue;
        }

        // Находим подходящий станок для упаковки (с финальным этапом)
        const packingMachine = await prisma.machine.findFirst({
          where: {
            status: 'ACTIVE',
            machinesStages: {
              some: {
                stage: {
                  finalStage: true,
                },
              },
            },
          },
        });

        if (packingMachine) {
          // Обновляем статус упаковки на READY_PROCESSED
          await prisma.package.update({
            where: { packageId: packageToProcess.packageId },
            data: {
              packingStatus: 'READY_PROCESSED',
              packingAssignedAt: new Date(),
            },
          });

          // Создаем задачу упаковки
          await prisma.packingTask.create({
            data: {
              packageId: packageToProcess.packageId,
              machineId: packingMachine.machineId,
              status: 'NOT_PROCESSED',
              priority: 1, // Можно настроить приоритет
              assignedAt: new Date(),
            },
          });

          this.logger.log(
            `Создана задача упаковки для детали ${partId}, упаковка ${packageToProcess.packageId}, станок ${packingMachine.machineId}`,
          );
        } else {
          this.logger.warn('Не найден подходящий станок для упаковки');
        }
      }
    } catch (error) {
      this.logger.error(`Ошибка при создании задач упаковки: ${error.message}`);
      throw error;
    }
  }

  /**
   * Обновляет прогресс детали по маршруту и возвращает флаг завершения этапа
   */
  private async updatePartRouteProgress(
    prisma: any,
    partId: number,
    routeStageId: number,
    completedAt: Date,
  ): Promise<boolean> {
    const allPalletsForPart = await prisma.pallet.findMany({
      where: { partId },
      include: {
        palletStageProgress: {
          where: { routeStageId },
        },
      },
    });

    const completedPalletsCount = allPalletsForPart.filter((pallet) =>
      pallet.palletStageProgress.some(
        (progress) =>
          progress.routeStageId === routeStageId &&
          progress.status === 'COMPLETED',
      ),
    ).length;

    const shouldCompletePartProgress =
      completedPalletsCount === allPalletsForPart.length;

    const existingPartProgress = await prisma.partRouteProgress.findFirst({
      where: { partId, routeStageId },
    });

    if (existingPartProgress) {
      await prisma.partRouteProgress.update({
        where: { prpId: existingPartProgress.prpId },
        data: {
          status: shouldCompletePartProgress ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: shouldCompletePartProgress ? completedAt : null,
        },
      });
    } else {
      await prisma.partRouteProgress.create({
        data: {
          partId,
          routeStageId,
          status: shouldCompletePartProgress ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: shouldCompletePartProgress ? completedAt : null,
        },
      });
    }

    return shouldCompletePartProgress;
  }

  /**
   * Обновляет статус детали если необходимо
   */
  private async updatePartStatusIfNeeded(
    prisma: any,
    partId: number,
    targetStatus: 'IN_PROGRESS' | 'COMPLETED',
  ): Promise<void> {
    const part = await prisma.part.findUnique({
      where: { partId },
      select: { status: true },
    });

    if (!part) return;

    // Если деталь уже имеет нужный статус, не обновляем
    if (part.status === targetStatus) return;

    // Обновляем статус детали
    if (targetStatus === 'IN_PROGRESS' && part.status === 'PENDING') {
      await prisma.part.update({
        where: { partId },
        data: { status: 'IN_PROGRESS' },
      });
    } else if (targetStatus === 'COMPLETED' && part.status === 'IN_PROGRESS') {
      // Проверяем, все ли этапы детали завершены
      const allStagesCompleted = await this.checkAllPartStagesCompleted(
        prisma,
        partId,
      );
      if (allStagesCompleted) {
        await prisma.part.update({
          where: { partId },
          data: { status: 'COMPLETED' },
        });
      }
    }
  }

  /**
   * Проверяет, завершены ли все этапы детали
   */
  private async checkAllPartStagesCompleted(
    prisma: any,
    partId: number,
  ): Promise<boolean> {
    const part = await prisma.part.findUnique({
      where: { partId },
      include: {
        route: {
          include: {
            routeStages: true,
          },
        },
        partRouteProgress: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!part?.route?.routeStages) return false;

    const completedStageIds = new Set(
      part.partRouteProgress.map((progress) => progress.routeStageId),
    );

    return part.route.routeStages.every((routeStage) =>
      completedStageIds.has(routeStage.routeStageId),
    );
  }

  /**
   * Отбраковать детали с поддона
   */
  async defectPalletParts(
    palletId: number,
    quantity: number,
    reportedById: number,
    description?: string,
    machineId?: number,
    stageId?: number,
  ) {
    this.logger.log(`Отбраковка ${quantity} деталей с поддона ${palletId}`);

    return await this.prisma.$transaction(async (prisma) => {
      const pallet = await prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: {
            include: {
              route: {
                include: {
                  routeStages: {
                    include: { stage: true },
                    orderBy: { sequenceNumber: 'asc' },
                  },
                },
              },
            },
          },
          palletStageProgress: {
            where: { completedAt: null },
            include: { routeStage: true },
            take: 1,
          },
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      if (Number(pallet.quantity) < quantity) {
        throw new Error(
          `Недостаточно деталей на поддоне. Доступно: ${pallet.quantity}, запрошено: ${quantity}`,
        );
      }

      // Определяем этап для рекламации
      let routeStageId = stageId;
      if (!routeStageId && pallet.palletStageProgress.length > 0) {
        routeStageId = pallet.palletStageProgress[0].routeStageId;
      } else if (!routeStageId) {
        const firstStage = pallet.part.route?.routeStages[0];
        if (firstStage) {
          routeStageId = firstStage.routeStageId;
        }
      }

      if (!routeStageId) {
        throw new Error('Не удалось определить этап для создания рекламации');
      }

      // Создаем рекламацию
      const reclamation = await prisma.reclamation.create({
        data: {
          partId: pallet.partId,
          quantity,
          routeStageId,
          machineId,
          palletId,
          reportedById,
          note: description,
          status: 'NEW',
        },
      });

      // Создаем запись движения запасов
      await prisma.inventoryMovement.create({
        data: {
          partId: pallet.partId,
          palletId,
          deltaQuantity: -quantity,
          reason: 'DEFECT',
          sourceReclamationId: reclamation.reclamationId,
          userId: reportedById,
        },
      });

      // Уменьшаем количество деталей на поддоне
      const newQuantity = Number(pallet.quantity) - quantity;
      await prisma.pallet.update({
        where: { palletId },
        data: { quantity: newQuantity },
      });

      this.logger.log(
        `Отбраковано ${quantity} деталей с поддона ${palletId}, создана рекламация ${reclamation.reclamationId}`,
      );

      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'detail:event',
        { status: 'updated' },
      );
      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:stats',
        { status: 'updated' },
      );

      return {
        message: 'Детали успешно отбракованы',
        reclamation: {
          id: reclamation.reclamationId,
          quantity,
          description,
          createdAt: reclamation.createdAt,
        },
        pallet: {
          id: pallet.palletId,
          name: pallet.palletName,
          newQuantity,
        },
      };
    });
  }
}
