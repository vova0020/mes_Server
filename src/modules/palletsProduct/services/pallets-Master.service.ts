import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
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

  constructor(private prisma: PrismaService) {}

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

    // 4. Рассчитываем количество нераспределенных деталей
    const totalPalletQuantity = pallets.reduce((sum, pallet) => {
      return sum + Number(pallet.quantity);
    }, 0);
    const unallocatedQuantity = Number(part.totalQuantity) - totalPalletQuantity;

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

      // 7. Обновляем буфер (если паллетка была в ячейке)
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
        // закрываем старую запись о размещении
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
          `Ячейка ${bufferPlacement.cell.cellCode}: загрузка ${newLoad}/${bufferPlacement.cell.capacity}, статус ${newStatus}`,
        );
      }

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
        // Получае�� предыдущую ячейку для обновления её статуса
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

        // Завершаем активные назначения на станки
        if (pallet.machineAssignments.length > 0) {
          await prisma.machineAssignment.updateMany({
            where: {
              palletId,
              completedAt: null,
            },
            data: {
              completedAt: new Date(),
            },
          });
          this.logger.log(`Завершены назначения поддона ${palletId} на станки`);
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
      // Ищем прогресс этапа по ID (operationId теперь соответствует pspId)
      const stageProgress = await this.prisma.palletStageProgress.findUnique({
        where: { pspId: operationId },
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
      });

      if (!stageProgress) {
        throw new NotFoundException(`Операция с ID ${operationId} не найдена`);
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
        updateData.status = TaskStatus.IN_PROGRESS;
        updateData.completedAt = null;
      } else if (status === OperationCompletionStatus.PARTIALLY_COMPLETED) {
        // Для частично выполненных операций пока оставляем IN_PROGRESS
        updateData.status = TaskStatus.IN_PROGRESS;
        updateData.completedAt = null;
      }

      // Обновляем прогресс этапа
      const updatedStageProgress = await this.prisma.palletStageProgress.update(
        {
          where: { pspId: operationId },
          data: updateData,
          include: {
            pallet: {
              include: {
                part: true,
                machineAssignments: {
                  where: { completedAt: null },
                  include: { machine: true },
                  take: 1,
                },
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

      let message = 'Статус операции обновлен';
      if (status === OperationCompletionStatus.COMPLETED) {
        message = 'Операция отмечена как завершенная';
      } else if (status === OperationCompletionStatus.PARTIALLY_COMPLETED) {
        message = 'Операция отмечена как частично завершенная';
      } else if (status === OperationCompletionStatus.IN_PROGRESS) {
        message = 'Операция отмечена как в процессе выполнения';
      }

      this.logger.log(`Операция ${operationId} обновлена: ${message}`);

      const currentMachine =
        updatedStageProgress.pallet.machineAssignments[0]?.machine;

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
          detailMaterial: part.material.materialName,
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
      const finalPalletName = palletName || `Поддон-${part.partCode}-${Date.now()}`;

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
            material: newPallet.part.material.materialName,
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
  async createPallet(
    partId: number,
    quantity: number,
    palletName?: string,
  ) {
    // Используем новый метод для создания поддона
    return this.createPalletByPartId(partId, quantity, palletName);
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
}
