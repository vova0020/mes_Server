import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { SocketService } from '../../websocket/services/socket.service';
import {
  OperationCompletionStatus,
  PalletDto,
  PalletsResponseDto,
} from '../dto/pallet-master.dto';
import { TaskStatus } from '@prisma/client';
import { MachineTaskMasterResponseDto } from '../dto/machine-taskDetail.dto';

@Injectable()
export class PalletsMasterService {
  private readonly logger = new Logger(PalletsMasterService.name);

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

    // 4. Рассчитываем количество отбракованных деталей
    const defectiveQuantity = await this.prisma.reclamation.aggregate({
      where: { partId: detailId },
      _sum: { quantity: true },
    });
    const totalDefectiveQuantity = Number(defectiveQuantity._sum.quantity || 0);

    // 5. Рассчитываем количество нераспределенных деталей с учетом брака
    const totalPalletQuantity = pallets.reduce((sum, pallet) => {
      return sum + Number(pallet.quantity);
    }, 0);
    const unallocatedQuantity =
      Number(part.totalQuantity) - totalPalletQuantity - totalDefectiveQuantity;

    // 6. Преобразуем в DTO
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
   * Назначить поддон на станок и создать/обновить запись приоритета для детали
   * @param palletId ID поддона
   * @param machineId ID станка
   * @param segmentId ID этапа (stageId)
   * @param operatorId ID оператора (опционально)
   */
  async assignPalletToMachine(
    palletId: number,
    machineId: number,
    segmentId: number,
    operatorId?: number,
  ) {
    this.logger.log(
      `Назначение поддона ${palletId} на станок ${machineId} (этап ${segmentId})`,
    );

    // Вся работа в одной транзакции
    return await this.prisma.$transaction(async (prisma) => {
      // 1. Проверяем, что поддон существует и загружаем связанный Part
      const pallet = await prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: {
            include: {
              route: {
                include: {
                  routeStages: {
                    where: { stageId: segmentId },
                    include: { stage: true, substage: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // 2. Проверяем, что станок существует и активен
      const machine = await prisma.machine.findUnique({ where: { machineId } });
      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }
      if (machine.status !== 'ACTIVE') {
        throw new Error(
          `Станок ${machine.machineName} (ID: ${machineId}) не готов к работе. Текущий статус: ${machine.status}`,
        );
      }

      // 3. Проверяем этап и находим routeStage
      const routeStage = pallet.part.route.routeStages[0];
      if (!routeStage) {
        throw new NotFoundException(
          `Для детали не найден маршрутный этап с ID ${segmentId}`,
        );
      }

      // 4. Завершаем всё старое назначение этого паллета на станок
      await prisma.machineAssignment.updateMany({
        where: { palletId, completedAt: null },
        data: { completedAt: new Date() },
      });

      // 5. Создаём новое назначение паллета на станок
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

      // 6. Обновляем или создаём запись в PartMachineAssignment
      const partId = machineAssignment.pallet.part.partId;
      await prisma.partMachineAssignment.upsert({
        where: {
          machine_part_unique: {
            machineId,
            partId,
          },
        },
        update: {
          // Не меняем priority, можно здесь сбросить timestamp или оставить пустым
        },
        create: {
          machineId,
          partId,
          priority: 0, // начальный приоритет
          assignedAt: new Date(),
        },
      });

      // 7. При назначении на станок поддон остается в буфере
      // Буфер будет обновлен только при переводе в статус IN_PROGRESS

      // 8. Создаём или обновляем прогресс этапа для этой паллетки
      const existingProgress = await prisma.palletStageProgress.findFirst({
        where: { palletId, routeStageId: routeStage.routeStageId },
      });
      let stageProgress;
      if (existingProgress) {
        stageProgress = await prisma.palletStageProgress.update({
          where: { pspId: existingProgress.pspId },
          data: { status: TaskStatus.PENDING, completedAt: null },
          include: { routeStage: { include: { stage: true, substage: true } } },
        });
      } else {
        stageProgress = await prisma.palletStageProgress.create({
          data: {
            palletId,
            routeStageId: routeStage.routeStageId,
            status: TaskStatus.PENDING,
          },
          include: { routeStage: { include: { stage: true, substage: true } } },
        });
      }

      // Обновляем статус детали на IN_PROGRESS
      await this.updatePartStatusIfNeeded(prisma, pallet.partId, 'IN_PROGRESS');

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'detail:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'pallet:event',
        { status: 'updated' },
      );

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'machine_task:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'machine:event',
        { status: 'updated' },
      );

      this.logger.log(
        `Создано задание ${machineAssignment.assignmentId} → статус этапа: ${stageProgress.status}`,
      );

      // 9. Возвращаем DTO
      return {
        message: 'Поддон успешно назначен на станок',
        operation: {
          id: stageProgress.pspId,
          status: stageProgress.status,
          startedAt: machineAssignment.assignedAt,
          completedAt: stageProgress.completedAt,
          quantity: Number(machineAssignment.pallet.quantity),
          productionPallet: {
            id: pallet.palletId,
            name: pallet.palletName,
          },
          machine: {
            id: machine.machineId,
            name: machine.machineName,
            status: machine.status,
          },
          processStep: {
            id: routeStage.stageId,
            name: routeStage.stage.stageName,
          },
          operator: operatorId
            ? {
              id: operatorId,
              username: 'Unknown',
              details: { fullName: 'Unknown User' },
            }
            : undefined,
        },
      };
    });
  }

  /**
   * Переместить поддон в буфер
   */
  async movePalletToBuffer(palletId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона ${palletId} в буфер (ячейка ${bufferCellId})`,
    );

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: true,
          palletBufferCells: {
            where: { removedAt: null },
            include: {
              cell: {
                include: {
                  buffer: true,
                },
              },
            },
            take: 1,
          },
          machineAssignments: {
            where: { completedAt: null },
            take: 1,
          },
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // Проверяем существование ячейки буфера
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { cellId: bufferCellId },
        include: {
          buffer: true,
          palletBufferCells: {
            where: { removedAt: null },
          },
        },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячейка буфера с ID ${bufferCellId} не найдена`,
        );
      }

      // Проверяем доступность ячейки
      if (bufferCell.status === 'RESERVED') {
        throw new Error(
          `Ячейка буфера ${bufferCell.cellCode} зарезервирована и недоступна для размещения`,
        );
      }

      // Получаем текущую загрузку ячейки (количество поддонов)
      const currentPalletsInCell = bufferCell.palletBufferCells.length;
      const currentLoad = currentPalletsInCell; // Используем количество поддонов, а не currentLoad из БД

      // Проверяем, находится ли поддон уже в этой ячейке
      const isCurrentPalletInThisCell = pallet.palletBufferCells.some(
        (pbc) => pbc.cellId === bufferCellId,
      );

      // Если поддон уже в этой ячейке, не нужно его перемещать
      if (isCurrentPalletInThisCell) {
        this.logger.warn(
          `Поддон ${palletId} уже находится в ячейке ${bufferCell.cellCode}`,
        );
        return {
          message: 'Поддон уже находится в указанной ячейке',
          pallet: pallet,
          operation: null,
        };
      }

      // Проверяем вместимость (учитываем количество поддонов, а не деталей)
      const newLoad = currentLoad + 1; // Добавляем 1 поддон

      if (newLoad > Number(bufferCell.capacity)) {
        throw new Error(
          `Недостаточно места в ячейке ${bufferCell.cellCode}. ` +
          `Текущая загрузка: ${currentLoad} поддонов, требуется: 1 поддон, ` +
          `максимальная вместимость: ${bufferCell.capacity} поддонов`,
        );
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Получаем предыдущую ячейку для обновления её статуса
        const previousPlacement = pallet.palletBufferCells[0];

        // Завершаем предыдущие размещения в буфере
        await prisma.palletBufferCell.updateMany({
          where: {
            palletId,
            removedAt: null,
          },
          data: {
            removedAt: new Date(),
          },
        });

        // Если поддон был в другой ячейке, обновляем её статус
        if (previousPlacement) {
          const previousCell = await prisma.bufferCell.findUnique({
            where: { cellId: previousPlacement.cellId },
            include: {
              palletBufferCells: {
                where: { removedAt: null },
              },
            },
          });

          if (previousCell) {
            // Пересчитываем загрузку предыдущей ячейки (считаем поддоны)
            const remainingPallets = previousCell.palletBufferCells.filter(
              (pbc) => pbc.palletId !== palletId,
            );

            const newPreviousLoad = remainingPallets.length; // Количество поддонов

            const newPreviousStatus =
              newPreviousLoad === 0
                ? 'AVAILABLE'
                : newPreviousLoad >= Number(previousCell.capacity)
                  ? 'OCCUPIED'
                  : 'AVAILABLE';

            await prisma.bufferCell.update({
              where: { cellId: previousPlacement.cellId },
              data: {
                currentLoad: newPreviousLoad,
                status: newPreviousStatus,
              },
            });

            this.logger.log(
              `Обновлена предыдущая ячейка ${previousCell.cellCode}: загрузка ${newPreviousLoad} по��донов, статус ${newPreviousStatus}`,
            );
          }
        }



        // Создаем новое размещение в буфере
        const palletBufferCell = await prisma.palletBufferCell.create({
          data: {
            palletId,
            cellId: bufferCellId,
            placedAt: new Date(),
          },
          include: {
            cell: {
              include: {
                buffer: true,
              },
            },
            pallet: {
              include: {
                part: true,
              },
            },
          },
        });

        // Обновляем статус и загрузку целевой ячейки буфера
        const newStatus =
          newLoad >= Number(bufferCell.capacity) ? 'OCCUPIED' : 'AVAILABLE';

        await prisma.bufferCell.update({
          where: { cellId: bufferCellId },
          data: {
            currentLoad: newLoad,
            status: newStatus,
          },
        });

        this.logger.log(
          `Поддон ${palletId} перемещен в ячейку буфера ${bufferCell.cellCode}. ` +
          `Новая загрузка: ${newLoad}/${bufferCell.capacity} поддонов, статус: ${newStatus}`,
        );

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
          pallet: {
            id: palletBufferCell.pallet.palletId,
            name: palletBufferCell.pallet.palletName,
            partId: palletBufferCell.pallet.partId,
            quantity: Number(palletBufferCell.pallet.quantity),
          },
          bufferCell: {
            id: palletBufferCell.cell.cellId,
            code: palletBufferCell.cell.cellCode,
            bufferId: palletBufferCell.cell.bufferId,
            bufferName: palletBufferCell.cell.buffer.bufferName,
            currentLoad: newLoad,
            capacity: Number(palletBufferCell.cell.capacity),
            status: newStatus,
          },
          operation: null, // В новой схеме нет прямой связи с операциями
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
   * Обновить статус операции
   */
  async updateOperationStatus(
    operationId: number,
    status: OperationCompletionStatus,
    masterId?: number,
  ) {
    this.logger.log(`Обновление статуса операции ${operationId} на ${status}`);

    try {
      // Ищем назначение станка по operationId (это assignmentId из MachineAssignment)
      const machineAssignment = await this.prisma.machineAssignment.findUnique({
        where: { assignmentId: operationId },
        include: {
          pallet: {
            include: {
              part: true,
              palletStageProgress: {
                where: { completedAt: null },
                include: {
                  routeStage: {
                    include: {
                      stage: true,
                      substage: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
          machine: true,
        },
      });

      if (!machineAssignment) {
        throw new NotFoundException(
          `Назначение с ID ${operationId} не найдено`,
        );
      }

      const stageProgress = machineAssignment.pallet.palletStageProgress[0];
      if (!stageProgress) {
        throw new NotFoundException(
          `Активный прогресс этапа для операции ${operationId} не найден`,
        );
      }

      // Проверяем, что операция активна
      if (stageProgress.status === TaskStatus.COMPLETED) {
        throw new Error(
          `Операция уже завершена. Текущий статус: ${stageProgress.status}`,
        );
      }

      // Подготовка данных для обновления
      const updateData: any = {};

      // Определяем новый статус на основе OperationCompletionStatus
      if (status === OperationCompletionStatus.COMPLETED) {
        updateData.status = TaskStatus.COMPLETED;
        updateData.completedAt = new Date();
      } else if (status === OperationCompletionStatus.IN_PROGRESS) {
        // Проверяем, что предыдущий этап пройден (если это не первый этап)
        const pallet = await this.prisma.pallet.findUnique({
          where: { palletId: machineAssignment.pallet.palletId },
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
              include: {
                routeStage: { include: { stage: true } },
              },
            },
          },
        });

        if (!pallet) {
          throw new Error(`Поддон с ID ${machineAssignment.pallet.palletId} не найден`);
        }

        const allRouteStages = pallet.part.route?.routeStages || [];
        const currentStageIndex = allRouteStages.findIndex(
          (rs) => rs.routeStageId === stageProgress.routeStageId,
        );

        if (currentStageIndex > 0) {
          // Это не первый этап, проверяем предыдущий
          const previousRouteStage = allRouteStages[currentStageIndex - 1];
          const previousStageProgress = pallet.palletStageProgress.find(
            (progress) => progress.routeStage.routeStageId === previousRouteStage.routeStageId,
          );

          if (!previousStageProgress || previousStageProgress.status !== TaskStatus.COMPLETED) {
            throw new Error(
              `Нельзя взять поддон ${machineAssignment.pallet.palletId} в работу. Предыдущий этап "${previousRouteStage.stage.stageName}" не завершен`,
            );
          }
        }

        updateData.status = TaskStatus.IN_PROGRESS;
        updateData.completedAt = null;

        // При переводе в статус IN_PROGRESS убираем поддон из буфера
        const bufferPlacement = await this.prisma.palletBufferCell.findFirst({
          where: { palletId: machineAssignment.pallet.palletId, removedAt: null },
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
            (p) => p.palletId !== machineAssignment.pallet.palletId,
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
            `Поддон ${machineAssignment.pallet.palletId} убран из ячейки ${bufferPlacement.cell.cellCode} (статус IN_PROGRESS)`,
          );
        }
      } else if (status === OperationCompletionStatus.PARTIALLY_COMPLETED) {
        // Для частично выполненных операций пока оставляем IN_PROGRESS
        updateData.status = TaskStatus.IN_PROGRESS;
        updateData.completedAt = null;
      }

      // Обновляем прогресс этапа
      const updatedStageProgress = await this.prisma.palletStageProgress.update(
        {
          where: { pspId: stageProgress.pspId },
          data: updateData,
          include: {
            pallet: {
              include: {
                part: true,
              },
            },
            routeStage: {
              include: {
                stage: true,
                substage: true,
              },
            },
          },
        },
      );

      // Обновляем статус детали
      if (status === OperationCompletionStatus.COMPLETED) {
        const shouldCompletePartProgress = await this.updatePartRouteProgress(
          machineAssignment.pallet.partId,
          stageProgress.routeStageId,
          new Date(),
        );
        if (shouldCompletePartProgress) {
          await this.updatePartStatusIfNeeded(
            this.prisma,
            machineAssignment.pallet.partId,
            'COMPLETED',
          );
        }

        // отключено: не создаём задачу упаковки
        // await this.checkAndCreatePackingTask(
        //   machineAssignment.pallet.partId,
        //   stageProgress.routeStageId,
        // );

      } else if (status === OperationCompletionStatus.IN_PROGRESS) {
        await this.updatePartStatusIfNeeded(
          this.prisma,
          machineAssignment.pallet.partId,
          'IN_PROGRESS',
        );
      }

      // Если операция завершена, завершаем назначение станка
      if (status === OperationCompletionStatus.COMPLETED) {
        await this.prisma.machineAssignment.update({
          where: { assignmentId: operationId },
          data: { completedAt: new Date() },
        });
      }

      let message = 'Статус операции обновлен';
      if (status === OperationCompletionStatus.COMPLETED) {
        message = 'Операция отмечена как завершенная';
      } else if (status === OperationCompletionStatus.PARTIALLY_COMPLETED) {
        message = 'Операция отмечена как частично завершенная';
      } else if (status === OperationCompletionStatus.IN_PROGRESS) {
        message = 'Операция отмечена как в процессе выполнения';
      }

      this.logger.log(`Операция ${operationId} обновлена: ${message}`);

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
        'detail:event',
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
        'machine:event',
        { status: 'updated' },
      );

      const currentMachine = machineAssignment.machine;

      return {
        message,
        operation: {
          id: updatedStageProgress.pspId,
          status: updatedStageProgress.status,
          startedAt: new Date(), // В новой схеме нет точного времени начала
          completedAt: updatedStageProgress.completedAt,
          quantity: Number(updatedStageProgress.pallet.quantity),
          productionPallet: {
            id: updatedStageProgress.pallet.palletId,
            name: updatedStageProgress.pallet.palletName,
          },
          machine: currentMachine
            ? {
              id: currentMachine.machineId,
              name: currentMachine.machineName,
              status: currentMachine.status,
            }
            : undefined,
          processStep: {
            id: updatedStageProgress.routeStage.stageId,
            name: updatedStageProgress.routeStage.stage.stageName,
          },
          operator: undefined, // В новой схеме нет прямой связи с оператором
          master: masterId
            ? {
              id: masterId,
              username: 'Unknown',
              details: {
                fullName: 'Unknown Master',
              },
            }
            : undefined,
        },
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении статуса операции: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получить сменное задание для станка по его ID
   */
  async getMachineTasksById(
    machineId: number,
  ): Promise<MachineTaskMasterResponseDto[]> {
    this.logger.log(`Получение сменного задания для станка с ID: ${machineId}`);

    try {
      // Проверяем существование станка
      const machine = await this.prisma.machine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      // Получаем активные назначения для данного станка
      const machineAssignments = await this.prisma.machineAssignment.findMany({
        where: {
          machineId,
          completedAt: null, // Только активные назначения
        },
        include: {
          pallet: {
            include: {
              part: {
                include: {
                  partMachineAssignment: {
                    where: { machineId },
                  },
                  material: true,
                  productionPackageParts: {
                    include: {
                      package: {
                        include: {
                          order: true,
                        },
                      },
                    },
                    take: 1,
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
          },
        },
        orderBy: {
          assignedAt: 'asc',
        },
      });

      if (machineAssignments.length === 0) {
        this.logger.warn(
          `Для станка с ID ${machineId} не найдено активных заданий`,
        );
        return [];
      }

      // Формируем ответ с данными из связанных таблиц
      const tasks = machineAssignments.map((assignment) => {
        const pallet = assignment.pallet;
        const part = pallet.part;
        const stageProgress = pallet.palletStageProgress[0];

        // Получаем информацию о заказе через связь с пакетом
        const packagePart = part.productionPackageParts[0];
        const order = packagePart?.package?.order;
        const pma = part.partMachineAssignment?.[0];
        const priority = pma ? pma.priority : 0;

        return {
          operationId: assignment.assignmentId,
          orderId: order?.orderId || 0,
          orderName: order?.orderName || 'Неизвестный заказ',
          detailArticle: part.partCode,
          detailName: part.partName,
          detailMaterial: part.material?.materialName || 'Не указан',
          detailSize: part.size,
          palletName: pallet.palletName,
          quantity: Number(pallet.quantity),
          status: stageProgress?.status || TaskStatus.PENDING,
          priority,
          partId: part.partId,
        };
      });

      this.logger.log(
        `Успешно получено ${tasks.length} заданий для станка с ID ${machineId}`,
      );
      return tasks;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении заданий для станка с ID ${machineId}: ${error.message}`,
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

      // 2. Рассчитываем количество отбракованных деталей
      const defectiveQuantity = await this.prisma.reclamation.aggregate({
        where: { partId },
        _sum: { quantity: true },
      });
      const totalDefectiveQuantity = Number(
        defectiveQuantity._sum.quantity || 0,
      );

      // 3. Рассчитываем количество уже распределенных деталей с учетом брака
      const allocatedQuantity = part.pallets.reduce((sum, pallet) => {
        return sum + Number(pallet.quantity);
      }, 0);

      const availableQuantity =
        Number(part.totalQuantity) - allocatedQuantity - totalDefectiveQuantity;

      // 4. Проверяем, достаточно ли деталей для создания поддона
      if (quantity > availableQuantity) {
        throw new Error(
          `Недостаточно деталей для создания поддона. ` +
          `Запрошено: ${quantity}, доступно: ${availableQuantity} ` +
          `(общее количество: ${part.totalQuantity}, распределено: ${allocatedQuantity}, отбраковано: ${totalDefectiveQuantity})`,
        );
      }

      if (quantity <= 0) {
        throw new Error('Количество деталей должно быть больше нуля');
      }

      // 5. Генерируем название поддона, если не указано
      const finalPalletName =
        palletName || `Поддон-${part.partCode}-${Date.now()}`;

      // 6. Создаем поддон в транзакции
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
        ['room:masterceh', 'room:machinesnosmen'],
        'pallet:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии поддона
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machinesnosmen'],
        'detail:event',
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

    const pallet = await this.prisma.pallet.findUnique({
      where: { palletId },
      include: { part: true },
    });

    if (!pallet) {
      throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
    }

    if (Number(pallet.quantity) < quantity) {
      throw new Error(
        `На поддоне недостаточно деталей. Доступно: ${pallet.quantity}, требуется: ${quantity}`,
      );
    }

    return await this.prisma.$transaction(async (prisma) => {
      // Создаем рекламацию
      const reclamation = await prisma.reclamation.create({
        data: {
          partId: pallet.partId,
          quantity,
          note: description || 'Отбраковка с поддона',
          reportedById,
          palletId,
          machineId: machineId || null,
          routeStageId: stageId || 1,
          status: 'REPORTED',
        },
        include: { part: true },
      });

      // Уменьшаем количество на поддоне
      const updatedPallet = await prisma.pallet.update({
        where: { palletId },
        data: { quantity: { decrement: quantity } },
      });

      // Удаляем поддон, если на нем не осталось деталей
      if (Number(updatedPallet.quantity) === 0) {
        await prisma.pallet.delete({ where: { palletId } });
      }

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
        message: 'Детали успешно отбракованы',
        reclamation: {
          id: reclamation.reclamationId,
          quantity: Number(reclamation.quantity),
          palletDeleted: Number(updatedPallet.quantity) === 0,
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
  ) {
    this.logger.log(`Перераспределение деталей с поддона ${sourcePalletId}`);

    const sourcePallet = await this.prisma.pallet.findUnique({
      where: { palletId: sourcePalletId },
      include: { part: true },
    });

    if (!sourcePallet) {
      throw new NotFoundException(`Поддон с ID ${sourcePalletId} не найден`);
    }

    const totalQuantity = distributions.reduce((sum, d) => sum + d.quantity, 0);
    if (totalQuantity > Number(sourcePallet.quantity)) {
      throw new Error(
        `Недостаточно деталей на поддоне. Доступно: ${sourcePallet.quantity}, требуется: ${totalQuantity}`,
      );
    }

    return await this.prisma.$transaction(async (prisma) => {
      const createdPallets: { id: number; name: string; quantity: number }[] =
        [];
      const updatedPallets: {
        id: number;
        name: string;
        newQuantity: number;
      }[] = [];

      for (const dist of distributions) {
        if (dist.targetPalletId) {
          // Обновляем существующий поддон
          const targetPallet = await prisma.pallet.findUnique({
            where: { palletId: dist.targetPalletId },
          });
          if (!targetPallet || targetPallet.partId !== sourcePallet.partId) {
            throw new Error(`Неверный целевой поддон ${dist.targetPalletId}`);
          }
          const updated = await prisma.pallet.update({
            where: { palletId: dist.targetPalletId },
            data: { quantity: { increment: dist.quantity } },
          });
          updatedPallets.push({
            id: updated.palletId,
            name: updated.palletName,
            newQuantity: Number(updated.quantity),
          });
        } else {
          // Создаем новый поддон
          const newPallet = await prisma.pallet.create({
            data: {
              partId: sourcePallet.partId,
              palletName: dist.palletName || `Поддон-${Date.now()}`,
              quantity: dist.quantity,
            },
          });
          createdPallets.push({
            id: newPallet.palletId,
            name: newPallet.palletName,
            quantity: Number(newPallet.quantity),
          });
        }
      }

      // Обновляем исходный поддон
      const remainingQuantity = Number(sourcePallet.quantity) - totalQuantity;
      let sourcePalletDeleted = false;

      if (remainingQuantity === 0) {
        await prisma.pallet.delete({ where: { palletId: sourcePalletId } });
        sourcePalletDeleted = true;
      } else {
        await prisma.pallet.update({
          where: { palletId: sourcePalletId },
          data: { quantity: remainingQuantity },
        });
      }
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

  /**
   * Создать рекламацию для отбраковки деталей
   * @param partId ID детали
   * @param quantity Количество отбракованных деталей
   * @param description Описание брака
   * @param reportedById ID пользователя, создающего рекламацию
   * @param palletId ID поддона (опционально)
   */
  async createDefectReclamation(
    partId: number,
    quantity: number,
    reportedById: number,
    description?: string,
    palletId?: number,
  ) {
    this.logger.log(
      `Создание рекламации для детали ${partId}: отбраковано ${quantity} шт.`,
    );

    try {
      // 1. Проверяем существование детали
      const part = await this.prisma.part.findUnique({
        where: { partId },
        include: {
          material: true,
          pallets: true,
        },
      });

      if (!part) {
        throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
      }

      // 2. Если указан поддон, проверяем его существование и принадлежность детали
      if (palletId) {
        const pallet = await this.prisma.pallet.findUnique({
          where: { palletId },
        });

        if (!pallet) {
          throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
        }

        if (pallet.partId !== partId) {
          throw new Error(`Поддон ${palletId} не принадлежит детали ${partId}`);
        }

        // Проверяем, что на поддоне достаточно деталей для списания
        if (Number(pallet.quantity) < quantity) {
          throw new Error(
            `На поддоне ${palletId} недостаточно деталей для списания. ` +
            `Доступно: ${pallet.quantity}, требуется: ${quantity}`,
          );
        }
      }

      // 3. Создаем рекламацию в транзакции
      const result = await this.prisma.$transaction(async (prisma) => {
        // Создаем запись рекламации
        const reclamation = await prisma.reclamation.create({
          data: {
            partId,
            quantity,
            note: description || 'Отбраковка деталей',
            reportedById,
            palletId,
            machineId: null,
            routeStageId: 1,
            status: 'REPORTED',
          },
          include: {
            part: {
              include: {
                material: true,
              },
            },
          },
        });

        // Если указан поддон, уменьшаем количество деталей на нем
        if (palletId) {
          await prisma.pallet.update({
            where: { palletId },
            data: {
              quantity: {
                decrement: quantity,
              },
            },
          });
        }

        return reclamation;
      });

      // 4. Рассчитываем общее количество отбракованных деталей
      const totalDefective = await this.prisma.reclamation.aggregate({
        where: { partId },
        _sum: { quantity: true },
      });

      this.logger.log(
        `Рекламация ${result.reclamationId} создана для детали ${partId}`,
      );

      return {
        message: 'Рекламация успешно создана',
        reclamation: {
          id: result.reclamationId,
          partId: result.partId,
          quantity: Number(result.quantity),
          description: result.note,
          createdAt: result.createdAt,
          part: {
            id: result.part.partId,
            code: result.part.partCode,
            name: result.part.partName,
            totalQuantity: Number(result.part.totalQuantity),
            defectiveQuantity: Number(totalDefective._sum.quantity || 0),
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при создании рекламации для детали ${partId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Маппинг TaskStatus в OperationCompletionStatus
   */
  private mapTaskStatusToCompletionStatus(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return OperationCompletionStatus.COMPLETED;
      case TaskStatus.IN_PROGRESS:
        return OperationCompletionStatus.IN_PROGRESS;
      case TaskStatus.PENDING:
        return OperationCompletionStatus.IN_PROGRESS;
      default:
        return OperationCompletionStatus.IN_PROGRESS;
    }
  }

  /**
   * Маппинг TaskStatus в статус операции для API
   */
  private mapTaskStatusToOperationStatus(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'COMPLETED';
      case TaskStatus.IN_PROGRESS:
        return 'IN_PROGRESS';
      case TaskStatus.PENDING:
        return 'ON_MACHINE';
      default:
        return 'ON_MACHINE';
    }
  }

  /**
   * Обновить статус и загрузку ячейки буфера на основе количества поддонов
   * @param prisma Экземпляр Prisma для транзакции
   * @param cellId ID ячейки
   * @param palletCount Количество поддонов в ячейке
   * @param capacity Вместимость ячейки
   */
  private async updateBufferCellStatus(
    prisma: any,
    cellId: number,
    palletCount: number,
    capacity: number,
  ) {
    const newStatus =
      palletCount === 0
        ? 'AVAILABLE'
        : palletCount >= capacity
          ? 'OCCUPIED'
          : 'AVAILABLE';

    await prisma.bufferCell.update({
      where: { cellId },
      data: {
        currentLoad: palletCount,
        status: newStatus,
      },
    });

    return { newLoad: palletCount, newStatus };
  }

  /**
   * Обновляет прогресс детали по маршруту и возвращает флаг завершения этапа
   */
  private async updatePartRouteProgress(
    partId: number,
    routeStageId: number,
    completedAt: Date,
  ): Promise<boolean> {
    const allPalletsForPart = await this.prisma.pallet.findMany({
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

    const existingPartProgress = await this.prisma.partRouteProgress.findFirst({
      where: { partId, routeStageId },
    });

    if (existingPartProgress) {
      await this.prisma.partRouteProgress.update({
        where: { prpId: existingPartProgress.prpId },
        data: {
          status: shouldCompletePartProgress
            ? TaskStatus.COMPLETED
            : TaskStatus.IN_PROGRESS,
          completedAt: shouldCompletePartProgress ? completedAt : null,
        },
      });
    } else {
      await this.prisma.partRouteProgress.create({
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
    prismaOrThis: any,
    partId: number,
    targetStatus: 'IN_PROGRESS' | 'COMPLETED',
  ): Promise<void> {
    const prisma = prismaOrThis.partId ? this.prisma : prismaOrThis;

    const part = await prisma.part.findUnique({
      where: { partId },
      select: { status: true },
    });

    if (!part) return;

    if (part.status === targetStatus) return;

    if (targetStatus === 'IN_PROGRESS' && part.status === 'PENDING') {
      await prisma.part.update({
        where: { partId },
        data: { status: 'IN_PROGRESS' },
      });
    } else if (targetStatus === 'COMPLETED' && part.status === 'IN_PROGRESS') {
      const allStagesCompleted = await this.checkAllPartStagesCompleted(
        partId,
        prisma,
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
    partId: number,
    prisma?: any,
  ): Promise<boolean> {
    const db = prisma || this.prisma;

    const part = await db.part.findUnique({
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
   * Проверяет, является ли следующий этап финальным, и создает задачу упаковки
   */
  private async checkAndCreatePackingTask(
    partId: number,
    currentRouteStageId: number,
  ): Promise<void> {
    try {
      // Получаем деталь с маршрутом
      const part = await this.prisma.part.findUnique({
        where: { partId },
        include: {
          route: {
            include: {
              routeStages: {
                include: {
                  stage: true,
                },
                orderBy: { sequenceNumber: 'asc' },
              },
            },
          },
          productionPackageParts: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!part?.route?.routeStages) {
        this.logger.warn(`Не найден маршрут для детали ${partId}`);
        return;
      }

      // Находим текущий этап в маршруте
      const currentStageIndex = part.route.routeStages.findIndex(
        (rs) => rs.routeStageId === currentRouteStageId,
      );

      if (currentStageIndex === -1) {
        this.logger.warn(
          `Текущий этап ${currentRouteStageId} не найден в маршруте детали ${partId}`,
        );
        return;
      }

      // Проверяем, есть ли следующий этап
      const nextStageIndex = currentStageIndex + 1;
      if (nextStageIndex >= part.route.routeStages.length) {
        this.logger.log(
          `Текущий этап является последним в маршруте для детали ${partId}`,
        );
        return;
      }

      const nextStage = part.route.routeStages[nextStageIndex];

      // Проверяем, является ли следующий этап финальным (упаковка)
      if (!nextStage.stage.finalStage) {
        this.logger.log(
          `Следующий этап не является финальным для детали ${partId}`,
        );
        return;
      }

      // Получаем упаковку для этой детали
      const packagePart = part.productionPackageParts[0];
      if (!packagePart) {
        this.logger.warn(`Не найдена упаковка для детали ${partId}`);
        return;
      }

      // Проверяем, не создана ли уже задача упаковки для этой упаковки
      const existingPackingTask = await this.prisma.packingTask.findFirst({
        where: {
          packageId: packagePart.packageId,
          status: { in: ['NOT_PROCESSED', 'PENDING', 'IN_PROGRESS'] },
        },
      });

      if (existingPackingTask) {
        this.logger.log(
          `Задача упаковки уже существует для упаковки ${packagePart.packageId}`,
        );
        return;
      }

      // Находим доступный станок для упаковки
      const packingMachine = await this.prisma.machine.findFirst({
        where: {
          status: 'ACTIVE',
          machinesStages: {
            some: {
              stageId: nextStage.stageId,
            },
          },
        },
      });

      if (!packingMachine) {
        this.logger.warn(
          `Не найден доступный станок для упаковки этапа ${nextStage.stageId}`,
        );
        return;
      }

      // Создаем задачу упаковки
      const packingTask = await this.prisma.packingTask.create({
        data: {
          packageId: packagePart.packageId,
          machineId: packingMachine.machineId,
          status: 'PENDING',
          priority: 0,
          assignedAt: new Date(),
        },
      });

      // Обновляем статус упаковки
      await this.prisma.package.update({
        where: { packageId: packagePart.packageId },
        data: {
          packingStatus: 'PENDING',
          packingAssignedAt: new Date(),
        },
      });

      this.logger.log(
        `Создана задача упаковки ${packingTask.taskId} для упаковки ${packagePart.packageId} на станке ${packingMachine.machineId}`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при проверке и создании задачи упаковки для детали ${partId}: ${error.message}`,
      );
    }
  }
}
