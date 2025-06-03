import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  OperationCompletionStatus,
  PalletDto,
  PalletsResponseDto,
} from '../dto/pallet-master.dto';
import { OperationStatus } from '@prisma/client';
import { MachineTaskMasterResponseDto } from '../dto/machine-taskDetail.dto';

@Injectable()
export class PalletsMasterService {
  private readonly logger = new Logger(PalletsMasterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Получить все поддоны по ID детали
   * @param detailId ID детали
   * @returns Список поддонов с информацией о буфере, станке и текущей операции
   */
  async getPalletsByDetailId(detailId: number): Promise<PalletsResponseDto> {
    // Получаем все поддоны для указанной детали
    const pallets = await this.prisma.productionPallets.findMany({
      where: {
        detailId,
      },
      include: {
        // Включаем данные о ячейке буфера (если поддон находится в буфере)
        bufferCell: {
          include: {
            buffer: true, // Включаем данные о буфере для получения его имени
          },
        },
        // Включаем данные о текущей операции для получения информации о станке и статусе
        detailOperations: {
          include: {
            machine: true, // Включаем данные о станке
            processStep: true, // Включаем данные о шаге процесса
          },
          orderBy: {
            startedAt: 'desc', // Сортируем по дате начала, чтобы получить самую последнюю операцию
          },
          take: 1, // Берём только последнюю операцию
        },
      },
    });

    // Преобразуем данные в формат DTO
    const palletDtos: PalletDto[] = pallets.map((pallet) => {
      // Получаем текущую операцию и связанный с ней станок (если есть)
      const currentOperation = pallet.detailOperations[0];
      const machine = currentOperation?.machine || null;

      return {
        id: pallet.id,
        name: pallet.name,
        quantity: pallet.quantity,
        detailId: pallet.detailId,
        // Форматируем данные о ячейке буфера (если есть)
        bufferCell: pallet.bufferCell
          ? {
              id: pallet.bufferCell.id,
              code: pallet.bufferCell.code,
              bufferId: pallet.bufferCell.bufferId,
              bufferName: pallet.bufferCell.buffer?.name,
            }
          : null,
        // Форматируем данные о станке (если есть)
        machine: machine
          ? {
              id: machine.id,
              name: machine.name,
              status: machine.status,
            }
          : null,
        // Добавляем информацию о текущей операции
        currentOperation: currentOperation
          ? {
              id: currentOperation.id,
              status: currentOperation.status,
              completionStatus: currentOperation.completionStatus || undefined,
              startedAt: currentOperation.startedAt,
              completedAt: currentOperation.completedAt || undefined,
              processStep: currentOperation.processStep
                ? {
                    id: currentOperation.processStep.id,
                    name: currentOperation.processStep.name,
                    sequence: currentOperation.processStep.sequence,
                  }
                : undefined,
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
   * @param segmentId ID участка (ранее передавался как processStepId)
   * @param operatorId ID оператора (опционально)
   */
  async assignPalletToMachine(
    palletId: number,
    machineId: number,
    segmentId: number, // переименовано для ясности - фактически это ID участка
    operatorId?: number,
  ) {
    this.logger.log(
      `Назначение поддона ${palletId} на станок ${machineId} (участок ${segmentId})`,
    );

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.productionPallets.findUnique({
        where: { id: palletId },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // Проверяем существование станка
      const machine = await this.prisma.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      // Проверяем, готов ли станок к работе
      if (machine.status !== 'ACTIVE') {
        throw new Error(
          `Станок ${machine.name} (ID: ${machineId}) не готов к работе. Текущий статус: ${machine.status}`,
        );
      }

      // Проверяем существование у��астка
      const segment = await this.prisma.productionSegment.findUnique({
        where: { id: segmentId },
      });

      if (!segment) {
        throw new NotFoundException(`Участок с ID ${segmentId} не найден`);
      }

      // Ищем соответствующий этап обработки для данного участка
      // Приоритет отдается этапу, отмеченному как основной (isPrimary = true)
      const segmentProcessStep = await this.prisma.segmentProcessStep.findFirst(
        {
          where: {
            segmentId: segmentId,
            isPrimary: true,
          },
          include: { processStep: true },
        },
      );

      // Если основной этап не найден, берем любой связанный с участком этап
      const anySegmentProcessStep =
        segmentProcessStep ||
        (await this.prisma.segmentProcessStep.findFirst({
          where: { segmentId: segmentId },
          include: { processStep: true },
        }));

      if (!anySegmentProcessStep) {
        throw new NotFoundException(
          `Для участка с ID ${segmentId} не ��айдено связанных этапов обработки в таблице SegmentProcessStep`,
        );
      }

      // Получаем ID этапа процесса из найденной связи
      const processStepId = anySegmentProcessStep.processStepId;
      const processStep = anySegmentProcessStep.processStep;

      this.logger.log(
        `Для участка ${segmentId} выбран этап обработки: ${processStep.name} (ID: ${processStepId})`,
      );

      // Проверяем, есть ли существующая активная операция для данного поддона и этапа процесса
      const existingOperation = await this.prisma.detailOperation.findFirst({
        where: {
          productionPalletId: palletId,
          processStepId: processStepId,
          status: OperationStatus.ON_MACHINE,
        },
      });

      let operation;

      if (existingOperation) {
        // Если существует активная операция, просто обновляем её - устанавливаем новый станок
        operation = await this.prisma.detailOperation.update({
          where: { id: existingOperation.id },
          data: {
            machineId: machineId,
            operatorId: operatorId || existingOperation.operatorId,
          },
          include: {
            machine: true,
            processStep: true,
            productionPallet: true,
            operator: {
              include: {
                details: true,
              },
            },
          },
        });

        this.logger.log(
          `Обновлена операция ${operation.id} для поддона ${palletId}, новый станок: ${machineId}`,
        );
      } else {
        // Создаем новую операцию
        operation = await this.prisma.detailOperation.create({
          data: {
            productionPalletId: palletId,
            processStepId: processStepId, // Используем найденный ID этапа процесса
            machineId: machineId,
            operatorId: operatorId || null,
            status: OperationStatus.ON_MACHINE,
            completionStatus: 'ON_MACHINE', // Новое поле для статуса выполнения
            quantity: pallet.quantity,
          },
          include: {
            machine: true,
            processStep: true,
            productionPallet: true,
            operator: {
              include: {
                details: true,
              },
            },
          },
        });

        this.logger.log(
          `Создана новая операция ${operation.id} для поддона ${palletId} на станке ${machineId}, этап обработки: ${processStep.name}`,
        );
      }

      return {
        message: existingOperation
          ? 'Поддон перемещен на другой станок'
          : 'Поддон успешно назначен на станок',
        operation,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при назначении поддона на станок: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Переместить поддон в буфер
   * Теперь просто перемещает физически без изменения статуса операции
   */
  async movePalletToBuffer(palletId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона ${palletId} в буфер (ячейка ${bufferCellId})`,
    );

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.productionPallets.findUnique({
        where: { id: palletId },
        include: {
          detailOperations: {
            where: {
              status: OperationStatus.IN_PROGRESS,
            },
            take: 1,
          },
          // Добавляем информацию о текущей ячейке буфера (если есть)
          bufferCell: true,
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // Проверяем существование ячейки буфера
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { id: bufferCellId },
        include: {
          // Получаем список всех поддонов в этой ячейке для проверки вместимости
          pallets: true,
        },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячейка буфера с ID ${bufferCellId} не найдена`,
        );
      }

      // Проверяем, что ячейка буфера доступна или уже имеет поддоны, но еще не заполнена
      if (
        bufferCell.status !== 'AVAILABLE' &&
        bufferCell.status !== 'OCCUPIED'
      ) {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} недоступна. Текущий статус: ${bufferCell.status}`,
        );
      }

      // Проверяем, не переполнена ли ячейка
      // Учитываем, что если поддон уже находится в этой ячейке, его не нужно учитывать дважды
      const isCurrentPalletInThisCell = pallet.bufferCellId === bufferCell.id;
      const effectivePalletsCount = isCurrentPalletInThisCell
        ? bufferCell.pallets.length
        : bufferCell.pallets.length + 1;

      if (effectivePalletsCount > bufferCell.capacity) {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} уже заполнена до максимальной вместимости (${bufferCell.capacity})`,
        );
      }

      // Используем транзакцию для атомарного выполнения всех операций
      return await this.prisma.$transaction(async (prisma) => {
        // Если поддон уже был в другой ячейке, обновляем статус той ячейки
        if (pallet.bufferCellId && pallet.bufferCellId !== bufferCellId) {
          const oldBufferCell = await prisma.bufferCell.findUnique({
            where: { id: pallet.bufferCellId },
            include: { pallets: true },
          });

          if (oldBufferCell) {
            // После перемещения поддона в новую ячейку, в старой ячейке останется на 1 поддон меньше
            const oldCellRemainingPallets = oldBufferCell.pallets.length - 1;

            // Если после перемещения в старой ячейке не останется поддонов, меняем её статус на AVAILABLE
            if (oldCellRemainingPallets <= 0) {
              await prisma.bufferCell.update({
                where: { id: pallet.bufferCellId },
                data: { status: 'AVAILABLE' },
              });
              this.logger.log(
                `Ячейка ${pallet.bufferCellId} освобождена и имеет статус AVAILABLE`,
              );
            }
            // Иначе оставляем статус OCCUPIED
            else {
              this.logger.log(
                `В ячейке ${pallet.bufferCellId} осталось ${oldCellRemainingPallets} поддонов`,
              );
            }
          }
        }

        // Перемещаем поддон в новую ячейку буфера
        const updatedPallet = await prisma.productionPallets.update({
          where: { id: palletId },
          data: { bufferCellId: bufferCellId },
          include: {
            detailOperations: {
              where: {
                status: OperationStatus.IN_PROGRESS,
              },
              include: {
                processStep: true,
              },
              orderBy: {
                startedAt: 'desc',
              },
              take: 1,
            },
          },
        });

        // Определяем, нужно ли обновлять статус новой ячейки
        // Если количество поддонов равно вместимости - ставим OCCUPIED
        // Если меньше - оставляем AVAILABLE
        const newStatus =
          effectivePalletsCount >= bufferCell.capacity
            ? 'OCCUPIED'
            : 'AVAILABLE';

        // Обновляем статус новой ячейки буфера
        await prisma.bufferCell.update({
          where: { id: bufferCellId },
          data: { status: newStatus },
        });

        const statusMessage =
          newStatus === 'OCCUPIED'
            ? 'ячейка полностью заполнена'
            : 'ячейка имеет свободное место';
        this.logger.log(
          `Поддон ${palletId} перемещен в ячейку буфера ${bufferCellId}, ${statusMessage}`,
        );

        return {
          message: 'Поддон успешно перемещен в буфер',
          pallet: updatedPallet,
          operation: pallet.detailOperations[0] || null,
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
   * Обновить статус операции (готово/в работе/выполнено частично)
   */
  async updateOperationStatus(
    operationId: number,
    status: OperationCompletionStatus,
    masterId?: number,
  ) {
    this.logger.log(`Обновление статуса операции ${operationId} на ${status}`);

    try {
      // Проверяем существование операции
      const operation = await this.prisma.detailOperation.findUnique({
        where: { id: operationId },
        include: { productionPallet: true },
      });

      if (!operation) {
        throw new NotFoundException(`Операция с ID ${operationId} не найдена`);
      }

      // Проверяем, что операция находится в статусе IN_PROGRESS
      if (operation.status !== OperationStatus.IN_PROGRESS) {
        throw new Error(
          `Только активные операции можно обновлять. Текущий статус: ${operation.status}`,
        );
      }

      // Подготовка данных для обновления
      const updateData: any = {
        completionStatus: status,
        masterId: masterId || null,
      };

      // Если статус "готово" или "выполнено частично", то завершаем операцию
      if (
        status === OperationCompletionStatus.COMPLETED ||
        status === OperationCompletionStatus.PARTIALLY_COMPLETED
      ) {
        updateData.status = OperationStatus.COMPLETED;
        updateData.completedAt = new Date();
      }

      // Обновляем операцию
      const updatedOperation = await this.prisma.detailOperation.update({
        where: { id: operationId },
        data: updateData,
        include: {
          machine: true,
          processStep: true,
          productionPallet: true,
          operator: {
            include: {
              details: true,
            },
          },
          master: {
            include: {
              details: true,
            },
          },
        },
      });

      let message = 'Статус операции обновлен';
      if (status === OperationCompletionStatus.COMPLETED) {
        message = 'Операция отмечена как завершенная';
      } else if (status === OperationCompletionStatus.PARTIALLY_COMPLETED) {
        message = 'Операция отмечена как частично завершенная';
      } else if (status === OperationCompletionStatus.IN_PROGRESS) {
        message = 'Операция отмечена как в процессе выполнения';
      }

      this.logger.log(`Операция ${operationId} обновлена: ${message}`);

      return {
        message,
        operation: updatedOperation,
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
   * @param machineId ID станка
   * @returns Массив заданий для станка со всеми необходимыми данными
   */
  async getMachineTasksById(
    machineId: number,
  ): Promise<MachineTaskMasterResponseDto[]> {
    this.logger.log(`Получение сменного задания для станка с ID: ${machineId}`);

    try {
      // Проверяем существование станка
      const machine = await this.prisma.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      // Получаем операции (задания) для данного станка
      const operations = await this.prisma.detailOperation.findMany({
        where: {
          machineId,
          // Только актуальные операции, исключая завершенные
          status: {
            in: [
              OperationStatus.ON_MACHINE,
              OperationStatus.IN_PROGRESS,
              OperationStatus.COMPLETED,
              OperationStatus.BUFFERED,
            ],
          },
        },
        include: {
          // Включаем информацию о поддоне
          productionPallet: {
            include: {
              // Включаем информацию о детали
              detail: {
                include: {
                  // Включаем информацию о заказе через связь с УПАК
                  ypaks: {
                    include: {
                      ypak: {
                        include: {
                          order: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // Сортировка по приоритету (сначала задания с приоритетом, затем - без)
        orderBy: [
          { startedAt: 'asc' }, // Затем по времени начала операции
        ],
      });

      if (operations.length === 0) {
        this.logger.warn(
          `Для станка с ID ${machineId} не найдено активных заданий`,
        );
        return [];
      }

      // Формируем ответ с данными из связанных таблиц
      const tasks = operations.map((operation) => {
        // Получаем первую запись связи детали с УПАК для получения информации о заказе
        const ypakDetail = operation.productionPallet.detail.ypaks[0];

        return {
          operationId: operation.id,
          orderId: ypakDetail.ypak.order.id,
          orderName: ypakDetail.ypak.order.name,
          detailArticle: operation.productionPallet.detail.article,
          detailName: operation.productionPallet.detail.name,
          detailMaterial: operation.productionPallet.detail.material,
          detailSize: operation.productionPallet.detail.size,
          palletName: operation.productionPallet.name,
          quantity: operation.quantity,
          status: operation.status,
          completionStatus: operation.completionStatus,
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
}
