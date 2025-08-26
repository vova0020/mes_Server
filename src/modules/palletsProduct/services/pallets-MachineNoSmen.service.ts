import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { TaskStatus } from '@prisma/client';
import { SocketService } from '../../websocket/services/socket.service';
import {
  PalletDto,
  PalletsResponseDto,
  RedistributePalletPartsResponseDto,
} from '../dto/pallet-master.dto';

@Injectable()
export class PalletMachineNoSmenService {
  private readonly logger = new Logger(PalletMachineNoSmenService.name);

  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) { }

  /**
   * Получить все поддоны по ID детали
   * @param detailId ID детали (partId в новой схеме)
   * @param stageid ID 'этапа' (stageId в новой схеме)
   * @returns Список поддонов с информацией о буфере, станке и текущей операции
   */
  async getPalletsByDetailId(
    detailId: number,
    stageid: number,
  ): Promise<PalletsResponseDto> {
    // 1. Получаем информацию о детали и её маршруте
    const part = await this.prisma.part.findUnique({
      where: { partId: detailId },
      include: {
        route: {
          include: {
            routeStages: {
              include: { stage: true, substage: true },
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Деталь с ID ${detailId} не найдена`);
    }

    // 2. Находим текущий этап в маршруте
    const currentRouteStage = part.route.routeStages.find(
      (rs) => rs.stageId === stageid,
    );
    if (!currentRouteStage) {
      throw new NotFoundException(
        `Этап с ID ${stageid} не найден в маршруте детали ${detailId}`,
      );
    }

    // 3. Получаем все поддоны для этой детали
    const pallets = await this.prisma.pallet.findMany({
      where: { partId: detailId },
      include: {
        palletBufferCells: {
          where: { removedAt: null },
          include: { cell: { include: { buffer: true } } },
          orderBy: { placedAt: 'desc' },
          take: 1,
        },
        machineAssignments: {
          where: { completedAt: null },
          include: { machine: true },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
        palletStageProgress: {
          where: { routeStageId: currentRouteStage.routeStageId },
          include: { routeStage: { include: { stage: true, substage: true } } },
          orderBy: { pspId: 'desc' },
          take: 1,
        },
        part: { include: { material: true } },
      },
    });

    // 4. Рассчитываем количество нераспределенных деталей с учетом рекламаций
    const totalPalletQuantity = pallets.reduce((sum, pallet) => {
      return sum + Number(pallet.quantity);
    }, 0);

    // Получаем общее количество отбракованных деталей
    const totalDefectiveQuantity = await this.prisma.reclamation.aggregate({
      where: { partId: detailId },
      _sum: { quantity: true },
    });

    const defectiveQuantity = Number(totalDefectiveQuantity._sum.quantity || 0);
    const unallocatedQuantity =
      Number(part.totalQuantity) - totalPalletQuantity - defectiveQuantity;

    // 5. Преобразуем в DTO
    const palletDtos: PalletDto[] = pallets.map((pallet) => {
      const currentBuffer = pallet.palletBufferCells[0];
      const currentMachine = pallet.machineAssignments[0];
      const stageProgress = pallet.palletStageProgress[0];

      // Если есть запись прогресса — конструируем объект, иначе null
      const currentOperation = stageProgress
        ? {
          id: stageProgress.pspId,
          status: stageProgress.status,
          startedAt: new Date(),
          completedAt: stageProgress.completedAt ?? undefined,
          processStep: {
            id: currentRouteStage.stageId,
            name: currentRouteStage.stage.stageName,
            sequence: Number(currentRouteStage.sequenceNumber),
          },
        }
        : null;

      return {
        id: pallet.palletId,
        name: pallet.palletName,
        quantity: Number(pallet.quantity),
        detailId: pallet.partId,

        bufferCell: currentBuffer
          ? {
            id: currentBuffer.cell.cellId,
            code: currentBuffer.cell.cellCode,
            bufferId: currentBuffer.cell.bufferId,
            bufferName: currentBuffer.cell.buffer?.bufferName,
          }
          : null,

        machine: currentMachine?.machine
          ? {
            id: currentMachine.machine.machineId,
            name: currentMachine.machine.machineName,
            status: currentMachine.machine.status,
          }
          : null,

        currentOperation,
      };
    });

    return {
      pallets: palletDtos,
      total: palletDtos.length,
      unallocatedQuantity: Math.max(0, unallocatedQuantity), // Не может быть отрицательным
    };
  }
  /**
   * Взять поддон в работу (станок сам назначает себе поддон)
   * Здесь создается запись в сменном задании и обновляется статус
   * @param palletId ID поддона
   * @param machineId ID станка
   * @param operatorId ID оператора (опционально)
   */
  async takePalletToWork(
    palletId: number,
    machineId: number,
    stageId: number,
    operatorId?: number,
  ) {
    this.logger.log(`Станок ${machineId} берет поддон ${palletId} в работу`);

    return await this.prisma.$transaction(async (prisma) => {
      // 1. Проверяем поддон и его текущий этап
      const pallet = await prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: {
            include: {
              route: {
                include: {
                  routeStages: {
                    include: { stage: true, substage: true },
                    orderBy: { sequenceNumber: 'asc' },
                  },
                },
              },
            },
          },
          palletStageProgress: {
            include: {
              routeStage: { include: { stage: true, substage: true } },
            },
            orderBy: { pspId: 'desc' },
          },
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // 2. Проверяем станок (перенесли вверх, чтобы знать, может ли он выполнять этап)
      const machine = await prisma.machine.findUnique({
        where: { machineId },
        include: {
          machinesStages: true,
          machineSubstages: true,
        },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      if (!machine.noSmenTask) {
        throw new Error(
          `Станок ${machineId} не настроен для работы без сменного задания`,
        );
      }

      if (machine.status !== 'ACTIVE') {
        throw new Error(
          `Станок ${machine.machineName} не готов к работе. Статус: ${machine.status}`,
        );
      }

      // 3. Находим указанный этап в маршруте
      const targetRouteStage = pallet.part.route.routeStages.find(
        (rs) => rs.stageId === stageId,
      );
      if (!targetRouteStage) {
        throw new Error(
          `Этап с ID ${stageId} не найден в маршруте детали ${pallet.partId}`,
        );
      }

      // Проверяем, может ли станок выполнять этот этап
      const canProcessStage =
        machine.machinesStages.some((ms) => ms.stageId === stageId) ||
        (targetRouteStage.substageId &&
          machine.machineSubstages.some(
            (ms) => ms.substageId === targetRouteStage.substageId,
          ));

      if (!canProcessStage) {
        throw new Error(
          `Станок ${machineId} не может выполнять этап ${stageId}`,
        );
      }

      // --- УБРАНО: массовое создание записей прогресса для всех этапов ---
      // Вместо этого — если у поддона нет записей прогресса, создаём только запись для целевого этапа.
      if (
        !pallet.palletStageProgress ||
        pallet.palletStageProgress.length === 0
      ) {
        this.logger.log(
          `Создание единственной записи прогресса для поддона ${palletId} для этапа routeStageId=${targetRouteStage.routeStageId}`,
        );

        const created = await prisma.palletStageProgress.create({
          data: {
            palletId,
            routeStageId: targetRouteStage.routeStageId,
            status: TaskStatus.NOT_PROCESSED,
          },
          include: {
            routeStage: { include: { stage: true, substage: true } },
          },
        });

        // Обновим локальный объект pallet — чтобы дальше работать с актуальными данными
        const updatedPallet = await prisma.pallet.findUnique({
          where: { palletId },
          include: {
            part: {
              include: {
                route: {
                  include: {
                    routeStages: {
                      include: { stage: true, substage: true },
                      orderBy: { sequenceNumber: 'asc' },
                    },
                  },
                },
              },
            },
            palletStageProgress: {
              include: {
                routeStage: { include: { stage: true, substage: true } },
              },
              orderBy: { pspId: 'desc' },
            },
          },
        });

        if (updatedPallet) {
          Object.assign(pallet, updatedPallet);
        }
      }

      // Находим первый незавершенный этап в правильной последовательности
      const sortedStageProgress = (pallet.palletStageProgress || []).sort(
        (a, b) =>
          Number(a.routeStage.sequenceNumber) -
          Number(b.routeStage.sequenceNumber),
      );

      const nextStageProgress = sortedStageProgress.find(
        (progress) =>
          progress.status === TaskStatus.NOT_PROCESSED ||
          progress.status === TaskStatus.PENDING,
      );

      if (!nextStageProgress) {
        throw new Error(
          `У поддона ${palletId} нет доступных этапов для обработки`,
        );
      }

      // 4. Проверяем, что поддон не занят другим станком
      const existingAssignment = await prisma.machineAssignment.findFirst({
        where: {
          palletId,
          completedAt: null,
        },
      });

      if (existingAssignment) {
        throw new Error(
          `Поддон ${palletId} уже назначен на станок ${existingAssignment.machineId}`,
        );
      }

      // 5. Создаем назначение на станок (сменное задание)
      const machineAssignment = await prisma.machineAssignment.create({
        data: {
          palletId,
          machineId,
          assignedAt: new Date(),
        },
        include: {
          pallet: { include: { part: true } },
          machine: true,
        },
      });

      // 6. Создаем/обновляем запись приоритета для детали
      const partId = machineAssignment.pallet.part.partId;
      await prisma.partMachineAssignment.upsert({
        where: {
          machine_part_unique: {
            machineId,
            partId,
          },
        },
        update: {
          assignedAt: new Date(),
        },
        create: {
          machineId,
          partId,
          priority: 0,
          assignedAt: new Date(),
        },
      });

      // Ищем или создаем запись прогресса для указанного этапа (на всякий случай)
      let currentStageProgress = pallet.palletStageProgress.find(
        (progress) =>
          progress.routeStage.routeStageId === targetRouteStage.routeStageId,
      );

      if (!currentStageProgress) {
        currentStageProgress = await prisma.palletStageProgress.create({
          data: {
            palletId,
            routeStageId: targetRouteStage.routeStageId,
            status: TaskStatus.NOT_PROCESSED,
          },
          include: {
            routeStage: { include: { stage: true, substage: true } },
          },
        });
      }

      if (currentStageProgress.status === TaskStatus.COMPLETED) {
        throw new Error(
          `Этап ${currentStageProgress.routeStage.stage.stageName} уже завершен для поддона ${palletId}`,
        );
      }

      const routeStage = currentStageProgress.routeStage;

      // 7. Обновляем статус этапа на IN_PROGRESS
      await prisma.palletStageProgress.update({
        where: { pspId: currentStageProgress.pspId },
        data: { status: TaskStatus.IN_PROGRESS },
      });

      // 8. Обновляем статус детали на IN_PROGRESS если еще не обновлен
      await this.updatePartStatusIfNeeded(
        prisma,
        machineAssignment.pallet.part.partId,
        'IN_PROGRESS',
      );

      // 8. Обновляем буфер (если поддон был в ячейке)
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
      }

      this.logger.log(
        `Поддон ${palletId} взят в работу станком ${machineId}, создано задание ${machineAssignment.assignmentId}`,
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

      const eventData = {
        assignmentId: machineAssignment.assignmentId,
        machineId: machineAssignment.machineId,
        palletId: machineAssignment.palletId,
        assignedAt: machineAssignment.assignedAt,
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

      return {
        message: 'Поддон успешно взят в работу',
        assignment: eventData,
        operation: {
          id: currentStageProgress.pspId,
          status: TaskStatus.IN_PROGRESS,
          startedAt: machineAssignment.assignedAt,
          processStep: {
            id: routeStage.stageId,
            name: routeStage.stage.stageName,
          },
        },
      };
    });
  }

  /**
   * Завершить обработку поддона на станке без сменного задания
   * Логика аналогична обычному станку
   */
  async completePalletProcessing(
    palletId: number,
    machineId: number,
    stageId: number,
    operatorId?: number,
  ) {
    this.logger.log(
      `Завершение обработки поддона ${palletId} на станке без сменного задания ${machineId}`,
    );

    // Находим активное назначение
    const assignment = await this.prisma.machineAssignment.findFirst({
      where: {
        palletId,
        machineId,
        completedAt: null,
      },
      include: {
        machine: true,
        pallet: {
          include: {
            part: {
              include: {
                route: {
                  include: {
                    routeStages: {
                      include: { stage: true, substage: true },
                      orderBy: { sequenceNumber: 'asc' },
                    },
                  },
                },
              },
            },
            palletStageProgress: {
              where: { status: TaskStatus.IN_PROGRESS },
              include: {
                routeStage: {
                  include: { stage: true, substage: true },
                },
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
      const completedAt = new Date();

      // Завершаем назначение станка
      await prisma.machineAssignment.update({
        where: { assignmentId: assignment.assignmentId },
        data: { completedAt },
      });

      // Завершаем текущий прогресс этапа
      await prisma.palletStageProgress.update({
        where: { pspId: currentProgress.pspId },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt,
        },
      });

      // === НОВАЯ ЛОГИКА: создаём прогресс для следующего этапа ТОЛЬКО если это этап упаковки ===
      // Определяем, является ли следующий этап "упаковкой".
      // Критерии: либо в имени этапа есть 'упак' (регистр не важен), либо productionStageLevel1.finalStage === true.
      let nextStageProdLevel: { finalStage?: boolean } | null = null;
      let nextIsPackaging = false;

      if (nextRouteStage) {
        const nextStageName = nextRouteStage.stage?.stageName ?? '';
        if (/упак/i.test(nextStageName)) {
          // Если в имени явно указана упаковка — считаем упаковкой
          nextIsPackaging = true;
          nextStageProdLevel = { finalStage: true }; // чтобы позже не делать лишенный запрос
        } else {
          // Иначе пытаемся прочитать признак finalStage из таблицы productionStageLevel1
          nextStageProdLevel = await prisma.productionStageLevel1.findUnique({
            where: { stageId: nextRouteStage.stageId },
            select: { finalStage: true },
          });
          if (nextStageProdLevel?.finalStage) {
            nextIsPackaging = true;
          }
        }

        // Только если следующий этап — упаковка, создаём запись прогресса для него
        if (nextIsPackaging) {
          await prisma.palletStageProgress.create({
            data: {
              palletId,
              routeStageId: nextRouteStage.routeStageId,
              status: TaskStatus.NOT_PROCESSED,
            },
          });
        } else {
          // Если следующий этап НЕ упаковка — пропускаем создание записи прогресса.
          // (логика: этап будет создан/инициализирован позже при реальном переходе или вручную)
        }
      }

      // Обновляем прогресс детали по маршруту (аналогично обычному станку)
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

      // Проверяем необходимость создания задач упаковки
      if (!nextRouteStage) {
        const allRouteStages = assignment.pallet.part.route?.routeStages || [];
        const allStagesCompleted = await this.checkAllStagesCompleted(
          prisma,
          assignment.pallet.partId,
          allRouteStages,
        );

        if (allStagesCompleted) {
          await this.createPackingTasks(prisma, assignment.pallet.partId);
        }
      } else {
        // используем уже загруженные данные, если они есть, иначе запрашиваем
        const nextStageInfo = nextStageProdLevel
          ? nextStageProdLevel
          : await prisma.productionStageLevel1.findUnique({
            where: { stageId: nextRouteStage.stageId },
            select: { finalStage: true },
          });

        if (nextStageInfo?.finalStage && shouldCompletePartProgress) {
          await this.createPackingTasks(prisma, assignment.pallet.partId);
        }
      }

      this.logger.log(
        `Обработка поддона ${palletId} завершена на станке ${machineId}`,
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

      return {
        message: 'Обработка поддона завершена',
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
   * Переместить поддон в буфер (аналогично обычному станку)
   */
  async movePalletToBuffer(palletId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона ${palletId} в буфер (ячейка ${bufferCellId})`,
    );

    try {
      const pallet = await this.prisma.pallet.findUnique({
        where: { palletId },
        include: {
          machineAssignments: {
            where: { completedAt: null },
            take: 1,
          },
          palletBufferCells: {
            where: { removedAt: null },
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
            where: { removedAt: null },
            include: { pallet: true },
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

      if (effectivePalletsCount > Number(bufferCell.capacity)) {
        throw new Error(
          `Ячейка буфера ${bufferCell.cellCode} уже заполнена до максимальной вместимости`,
        );
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Завершаем предыдущие размещения
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
                  palletBufferCells: { where: { removedAt: null } },
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

        // Создаем новое размещение (если поддон еще не в этой ячейке)
        if (!isCurrentPalletInThisCell) {
          await prisma.palletBufferCell.create({
            data: {
              palletId,
              cellId: bufferCellId,
              placedAt: new Date(),
            },
          });
        }

        // Обновляем статус новой ячейки
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
          'pallet:event',
          { status: 'updated' },
        );
        // Отправляем WebSocket уведомление о событии поддона
        this.socketService.emitToMultipleRooms(
          ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
          'buffer_settings:event',
          { status: 'updated' },
        );

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
   * Создать новый поддон по ID детали
   * @param partId ID детали
   * @param quantity Количество деталей на поддоне
   * @param palletName Название поддона (опционально)
   */
  async createPalletByPartId(
    partId: number,
    quantity: number,
    palletName?: string,
  ) {
    this.logger.log(
      `Создание поддона для детали ${partId} с количеством ${quantity}`,
    );

    try {
      // 1. Проверяем существование детали
      const part = await this.prisma.part.findUnique({
        where: { partId },
        include: {
          material: true,
          pallets: true, // Получаем существующие поддоны для расчета
        },
      });

      if (!part) {
        throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
      }

      // 2. Рассчитываем количество уже распределенных деталей
      const allocatedQuantity = part.pallets.reduce((sum, pallet) => {
        return sum + Number(pallet.quantity);
      }, 0);

      const availableQuantity = Number(part.totalQuantity) - allocatedQuantity;

      // 3. Проверяем, достаточно ли деталей для создания поддона
      if (quantity > availableQuantity) {
        throw new Error(
          `Недостаточно деталей для создания поддона. ` +
          `Запрошено: ${quantity}, доступно: ${availableQuantity} ` +
          `(общее количество: ${part.totalQuantity}, уже распределено: ${allocatedQuantity})`,
        );
      }

      if (quantity <= 0) {
        throw new Error('Количество деталей должно быть больше нуля');
      }

      // 4. Генерируем название поддона, если не указано
      const finalPalletName =
        palletName || `Поддон-${part.partCode}-${Date.now()}`;

      // 5. Создаем поддон в транзакции
      const newPallet = await this.prisma.$transaction(async (prisma) => {
        return await prisma.pallet.create({
          data: {
            partId,
            palletName: finalPalletName,
            quantity,
          },
          include: {
            part: {
              include: {
                material: true,
              },
            },
          },
        });
      });

      this.logger.log(
        `Поддон ${newPallet.palletId} успешно создан для детали ${partId}`,
      );

      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );

      return {
        message: 'Поддон успешно создан',
        pallet: {
          id: newPallet.palletId,
          name: newPallet.palletName,
          partId: newPallet.partId,
          quantity: Number(newPallet.quantity),
          createdAt: new Date(),
          part: {
            id: newPallet.part.partId,
            code: newPallet.part.partCode,
            name: newPallet.part.partName,
            material: newPallet.part.material?.materialName || 'Не указан',
            totalQuantity: Number(newPallet.part.totalQuantity),
            availableQuantity: availableQuantity - quantity, // Обновленное доступное количество
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при создании поддона для детали ${partId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Создать новый поддон (существующий метод для совместимости)
   */
  async createPallet(partId: number, quantity: number, palletName?: string) {
    // Используем новый метод для создания поддона
    return this.createPalletByPartId(partId, quantity, palletName);
  }

  /**
   * Проверяет, завершили ли все поддоны детали все этапы маршрута
   */
  private async checkAllStagesCompleted(
    prisma: any,
    partId: number,
    routeStages: any[],
  ): Promise<boolean> {
    const allPallets = await prisma.pallet.findMany({
      where: { partId },
      include: {
        palletStageProgress: {
          where: { status: TaskStatus.COMPLETED },
        },
      },
    });

    for (const pallet of allPallets) {
      const completedStageIds = new Set(
        pallet.palletStageProgress.map(
          (progress: any) => progress.routeStageId,
        ),
      );

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
      const part = await prisma.part.findUnique({
        where: { partId },
        include: {
          productionPackageParts: {
            include: {
              package: {
                include: { order: true },
              },
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

      for (const packagePart of part.productionPackageParts) {
        const packageToProcess = packagePart.package;

        const existingPackingTask = await prisma.packingTask.findFirst({
          where: { packageId: packageToProcess.packageId },
        });

        if (existingPackingTask) {
          this.logger.log(
            `Задача упаковки для упаковки ${packageToProcess.packageId} уже существует`,
          );
          continue;
        }

        const packingMachine = await prisma.machine.findFirst({
          where: {
            status: 'ACTIVE',
            machinesStages: {
              some: {
                stage: { finalStage: true },
              },
            },
          },
        });

        if (packingMachine) {
          await prisma.package.update({
            where: { packageId: packageToProcess.packageId },
            data: {
              packingStatus: 'READY_PROCESSED',
              packingAssignedAt: new Date(),
            },
          });

          await prisma.packingTask.create({
            data: {
              packageId: packageToProcess.packageId,
              machineId: packingMachine.machineId,
              status: 'NOT_PROCESSED',
              priority: 1,
              assignedAt: new Date(),
            },
          });

          this.logger.log(
            `Создана задача упаковки для детали ${partId}, упаковка ${packageToProcess.packageId}`,
          );
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
          progress.status === TaskStatus.COMPLETED,
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
          status: shouldCompletePartProgress
            ? TaskStatus.COMPLETED
            : TaskStatus.IN_PROGRESS,
          completedAt: shouldCompletePartProgress ? completedAt : null,
        },
      });
    } else {
      await prisma.partRouteProgress.create({
        data: {
          partId,
          routeStageId,
          status: shouldCompletePartProgress
            ? TaskStatus.COMPLETED
            : TaskStatus.IN_PROGRESS,
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
          where: { status: TaskStatus.COMPLETED },
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

  /**
   * Перераспределить детали между поддонами
   */
  async redistributePalletParts(
    sourcePalletId: number,
    distributions: {
      targetPalletId?: number;
      quantity: number;
      palletName?: string;
    }[],
  ): Promise<RedistributePalletPartsResponseDto> {
    this.logger.log(`Перераспределение деталей с поддона ${sourcePalletId}`);

    return await this.prisma.$transaction(async (prisma) => {
      const sourcePallet = await prisma.pallet.findUnique({
        where: { palletId: sourcePalletId },
        include: { part: true },
      });

      if (!sourcePallet) {
        throw new NotFoundException(`Поддон с ID ${sourcePalletId} не найден`);
      }

      const totalDistributedQuantity = distributions.reduce(
        (sum, dist) => sum + dist.quantity,
        0,
      );

      if (totalDistributedQuantity > Number(sourcePallet.quantity)) {
        throw new Error(
          `Общее количество для перераспределения (${totalDistributedQuantity}) превышает количество на исходном поддоне (${sourcePallet.quantity})`,
        );
      }

      const createdPallets: { id: number; name: string; quantity: number }[] =
        [];
      const updatedPallets: {
        id: number;
        name: string;
        newQuantity: number;
      }[] = [];

      for (const distribution of distributions) {
        if (distribution.targetPalletId) {
          // Добавляем к существующему поддону
          const targetPallet = await prisma.pallet.findUnique({
            where: { palletId: distribution.targetPalletId },
          });

          if (!targetPallet) {
            throw new NotFoundException(
              `Целевой поддон с ID ${distribution.targetPalletId} не найден`,
            );
          }

          if (targetPallet.partId !== sourcePallet.partId) {
            throw new Error(
              `Целевой поддон содержит другую деталь (${targetPallet.partId} != ${sourcePallet.partId})`,
            );
          }

          const newQuantity =
            Number(targetPallet.quantity) + distribution.quantity;
          await prisma.pallet.update({
            where: { palletId: distribution.targetPalletId },
            data: { quantity: newQuantity },
          });

          updatedPallets.push({
            id: targetPallet.palletId,
            name: targetPallet.palletName,
            newQuantity,
          });
        } else {
          // Создаем новый поддон
          const palletName =
            distribution.palletName ||
            `${sourcePallet.palletName}-${Date.now()}`;

          const newPallet = await prisma.pallet.create({
            data: {
              partId: sourcePallet.partId,
              palletName,
              quantity: distribution.quantity,
            },
          });

          createdPallets.push({
            id: newPallet.palletId,
            name: newPallet.palletName,
            quantity: Number(newPallet.quantity),
          });
        }
      }

      // Обновляем или удаляем исходный поддон
      const remainingQuantity =
        Number(sourcePallet.quantity) - totalDistributedQuantity;
      let sourcePalletDeleted = false;

      if (remainingQuantity === 0) {
        // Удаляем исходный поддон, если он пустой
        await prisma.pallet.delete({
          where: { palletId: sourcePalletId },
        });
        sourcePalletDeleted = true;
      } else {
        // Обновляем количество на исходном поддоне
        await prisma.pallet.update({
          where: { palletId: sourcePalletId },
          data: { quantity: remainingQuantity },
        });
      }

      this.logger.log(
        `Перераспределение завершено: создано ${createdPallets.length} поддонов, обновлено ${updatedPallets.length} поддонов`,
      );

      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );

      return {
        message: 'Детали успешно перераспределены',
        result: {
          sourcePalletDeleted,
          createdPallets,
          updatedPallets,
        },
      };
    });
  }
}
