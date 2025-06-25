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
   * @returns Список поддонов с информацией о буфере, станке и текущей операции
   */
  async getPalletsByDetailId(detailId: number): Promise<PalletsResponseDto> {
    // Получаем все поддоны для указанной детали
    const pallets = await this.prisma.pallet.findMany({
      where: {
        partId: detailId,
      },
      include: {
        // Включаем данные о ячейках буфера через промежуточную таблицу
        palletBufferCells: {
          where: {
            removedAt: null, // Только активные размещения в буфере
          },
          include: {
            cell: {
              include: {
                buffer: true,
              },
            },
          },
          orderBy: {
            placedAt: 'desc',
          },
          take: 1,
        },
        // Включаем данные о назначениях на станки
        machineAssignments: {
          where: {
            completedAt: null, // Только активные назначения
          },
          include: {
            machine: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 1,
        },
        // Включаем данные о прогрессе выполнения этапов
        palletStageProgress: {
          include: {
            routeStage: {
              include: {
                stage: true,
                substage: true,
              },
            },
          },
          orderBy: [
            { routeStage: { sequenceNumber: 'desc' } },
            { pspId: 'desc' },
          ],
          take: 1,
        },
        // Включаем данные о детали для получения количества
        part: {
          include: {
            material: true,
          },
        },
      },
    });

    // Преобразуем данные в формат DTO
    const palletDtos: PalletDto[] = pallets.map((pallet) => {
      // Получаем текущее размещение в буфере (если есть)
      const currentBufferPlacement = pallet.palletBufferCells[0];

      // Получаем текущее назначение на станок (если есть)
      const currentMachineAssignment = pallet.machineAssignments[0];

      // Получаем текущий прогресс по этапам (если есть)
      const currentStageProgress = pallet.palletStageProgress[0];

      return {
        id: pallet.palletId,
        name: pallet.palletName,
        quantity: Number(pallet.part.totalQuantity), // Используем общее количество из детали
        detailId: pallet.partId,

        // Форматируем данные о ячейке буфера (если есть)
        bufferCell: currentBufferPlacement
          ? {
              id: currentBufferPlacement.cell.cellId,
              code: currentBufferPlacement.cell.cellCode,
              bufferId: currentBufferPlacement.cell.bufferId,
              bufferName: currentBufferPlacement.cell.buffer?.bufferName,
            }
          : null,

        // Форматируем данные о станке (если есть)
        machine: currentMachineAssignment?.machine
          ? {
              id: currentMachineAssignment.machine.machineId,
              name: currentMachineAssignment.machine.machineName,
              status: currentMachineAssignment.machine.status,
            }
          : null,

        // Добавляем информацию о текущей о��ерации на основе прогресса этапов
        currentOperation: currentStageProgress
          ? {
              id: currentStageProgress.pspId,
              status: currentStageProgress.status,
              startedAt: new Date(), // В новой схеме нет точного времени начала, используем текущее
              completedAt: currentStageProgress.completedAt || undefined,
              processStep: {
                id: currentStageProgress.routeStage.stageId,
                name: currentStageProgress.routeStage.stage.stageName,
                sequence: Number(
                  currentStageProgress.routeStage.sequenceNumber,
                ),
              },
            }
          : null,
      };
    });

    return {
      pallets: palletDtos,
      total: palletDtos.length,
    };
  }

  /**
   * Назначить поддон на станок
   * @param palletId ID поддона
   * @param machineId ID станка
   * @param segmentId ID этапа (теперь используется как stageId)
   * @param operatorId ID оператора (опционально)
   */
  async assignPalletToMachine(
    palletId: number,
    machineId: number,
    segmentId: number, // теперь это stageId из ProductionStageLevel1
    operatorId?: number,
  ) {
    this.logger.log(
      `Назначение поддона ${palletId} на станок ${machineId} (этап ${segmentId})`,
    );

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: {
            include: {
              route: {
                include: {
                  routeStages: {
                    where: { stageId: segmentId },
                    include: {
                      stage: true,
                      substage: true,
                    },
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

      // Проверяем существование станка
      const machine = await this.prisma.machine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      // Проверяем, что станок активен
      if (machine.status !== 'ACTIVE') {
        throw new Error(
          `Станок ${machine.machineName} (ID: ${machineId}) не готов к работе. Тек��щий статус: ${machine.status}`,
        );
      }

      // Проверяем существование этапа
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: segmentId },
      });

      if (!stage) {
        throw new NotFoundException(`Этап с ID ${segmentId} не найден`);
      }

      // Ищем соответствующий RouteStage
      const routeStage = pallet.part.route.routeStages[0];
      if (!routeStage) {
        throw new NotFoundException(
          `Для детали не найден маршрутный этап с ID ${segmentId}`,
        );
      }

      // Используем транзакцию для атомарного выполнения всех операций
      return await this.prisma.$transaction(async (prisma) => {
        // Получаем текущее размещение поддона в буфере для обновления статуса ячейки
        const currentBufferPlacement = await prisma.palletBufferCell.findFirst({
          where: {
            palletId,
            removedAt: null,
          },
          include: {
            cell: {
              include: {
                palletBufferCells: {
                  where: { removedAt: null },
                },
              },
            },
          },
        });

        // Завершаем предыдущее назначение на станок (если есть)
        await prisma.machineAssignment.updateMany({
          where: {
            palletId,
            completedAt: null,
          },
          data: {
            completedAt: new Date(),
          },
        });

        // Создаем новое назначение на станок
        const machineAssignment = await prisma.machineAssignment.create({
          data: {
            palletId,
            machineId,
            assignedAt: new Date(),
          },
          include: {
            machine: true,
            pallet: {
              include: {
                part: true,
              },
            },
          },
        });

        // Если поддон был в буфере, обновляем статус ячейки
        if (currentBufferPlacement) {
          // Завершаем размещение в буфере
          await prisma.palletBufferCell.update({
            where: { palletCellId: currentBufferPlacement.palletCellId },
            data: { removedAt: new Date() },
          });

          // Пересчитываем загрузку ячейки (считаем количество поддонов, а не деталей)
          const remainingPallets =
            currentBufferPlacement.cell.palletBufferCells.filter(
              (pbc) => pbc.palletId !== palletId,
            );

          const newLoad = remainingPallets.length; // Количество поддонов в ячейке

          const newStatus =
            newLoad === 0
              ? 'AVAILABLE'
              : newLoad >= Number(currentBufferPlacement.cell.capacity)
                ? 'OCCUPIED'
                : 'AVAILABLE';

          await prisma.bufferCell.update({
            where: { cellId: currentBufferPlacement.cellId },
            data: {
              currentLoad: newLoad,
              status: newStatus,
            },
          });

          this.logger.log(
            `Обновлена ячейка буфера ${currentBufferPlacement.cell.cellCode}: ` +
              `загрузка ${newLoad}/${currentBufferPlacement.cell.capacity} поддонов, статус ${newStatus}`,
          );
        }

        // Создаем или обновляем прогресс этапа
        const existingProgress = await prisma.palletStageProgress.findFirst({
          where: {
            palletId,
            routeStageId: routeStage.routeStageId,
          },
        });

        let stageProgress;
        if (existingProgress) {
          stageProgress = await prisma.palletStageProgress.update({
            where: { pspId: existingProgress.pspId },
            data: {
              status: TaskStatus.PENDING, // Меняем на PENDING при назначении на станок
              completedAt: null,
            },
            include: {
              routeStage: {
                include: {
                  stage: true,
                  substage: true,
                },
              },
            },
          });
        } else {
          stageProgress = await prisma.palletStageProgress.create({
            data: {
              palletId,
              routeStageId: routeStage.routeStageId,
              status: TaskStatus.PENDING, // Сразу PENDING при назначении на станок
            },
            include: {
              routeStage: {
                include: {
                  stage: true,
                  substage: true,
                },
              },
            },
          });
        }

        this.logger.log(
          `Создано назначение ${machineAssignment.assignmentId} поддона ${palletId} на станок ${machineId}. ` +
            `Статус операции: ${stageProgress.status}`,
        );

        return {
          message: 'Поддон успешно назначен на станок',
          operation: {
            id: stageProgress.pspId,
            status: stageProgress.status,
            startedAt: machineAssignment.assignedAt,
            completedAt: stageProgress.completedAt,
            quantity: Number(pallet.part.totalQuantity),
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
                  username: 'Unknown', // В новой схеме нет прямой связи с пользователем
                  details: {
                    fullName: 'Unknown User',
                  },
                }
              : undefined,
          },
        };
      });
    } catch (error) {
      this.logger.error(
        `Ошибка при назначении поддона на станок: ${error.message}`,
      );
      throw error;
    }
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
            quantity: Number(palletBufferCell.pallet.part.totalQuantity),
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
          quantity: Number(updatedStageProgress.pallet.part.totalQuantity),
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

        return {
          operationId: assignment.assignmentId,
          orderId: order?.orderId || 0,
          orderName: order?.orderName || 'Неизвестный заказ',
          detailArticle: part.partCode,
          detailName: part.partName,
          detailMaterial: part.material.materialName,
          detailSize: part.size,
          palletName: pallet.palletName,
          quantity: Number(part.totalQuantity),
          status: stageProgress?.status || TaskStatus.PENDING,
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
