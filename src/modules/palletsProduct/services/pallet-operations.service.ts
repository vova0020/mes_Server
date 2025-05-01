import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OperationStatus } from '@prisma/client';
import { OperationCompletionStatus } from '../dto/pallet-operations.dto';

@Injectable()
export class PalletOperationsService {
  private readonly logger = new Logger(PalletOperationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Назначить поддон на станок
   */
  async assignPalletToMachine(
    palletId: number,
    machineId: number,
    processStepId: number,
    operatorId?: number,
  ) {
    this.logger.log(`Назначение поддона ${palletId} на станок ${machineId}`);

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

      // Проверяем существование этапа процесса
      const processStep = await this.prisma.processStep.findUnique({
        where: { id: processStepId },
      });

      if (!processStep) {
        throw new NotFoundException(
          `Этап процесса с ID ${processStepId} не найден`,
        );
      }

      // Проверяем, есть ли существую��ая активная операция для данного поддона и этапа процесса
      const existingOperation = await this.prisma.detailOperation.findFirst({
        where: {
          productionPalletId: palletId,
          processStepId: processStepId,
          status: OperationStatus.IN_PROGRESS,
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
            // Статус операции остается IN_PROGRESS
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
            processStepId: processStepId,
            machineId: machineId,
            operatorId: operatorId || null,
            status: OperationStatus.IN_PROGRESS,
            completionStatus: 'IN_PROGRESS', // Новое поле для статуса выполнения
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
          `Создана новая операция ${operation.id} для поддона ${palletId} на станке ${machineId}`,
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
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // Проверяем существование ячейки буфера
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { id: bufferCellId },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячей��а буфера с ID ${bufferCellId} не найдена`,
        );
      }

      // Проверяем, что ячейка буфера доступна
      if (bufferCell.status !== 'AVAILABLE') {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} недоступна. Текущий статус: ${bufferCell.status}`,
        );
      }

      // Перемещаем поддон в ячейку буфера
      const updatedPallet = await this.prisma.productionPallets.update({
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

      // Обновляем статус ячейки буфера
      await this.prisma.bufferCell.update({
        where: { id: bufferCellId },
        data: { status: 'OCCUPIED' },
      });

      this.logger.log(
        `Поддон ${palletId} перемещен в ячейку буфера ${bufferCellId}`,
      );

      return {
        message: 'Поддон успешно перемещен в буфер',
        pallet: updatedPallet,
        operation: pallet.detailOperations[0] || null,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении п��ддона в буфер: ${error.message}`,
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
   * Получить активные операции
   */
  async getActiveOperations() {
    this.logger.log('Получение списка активных операций');

    try {
      const activeOperations = await this.prisma.detailOperation.findMany({
        where: {
          status: OperationStatus.IN_PROGRESS,
        },
        include: {
          machine: true,
          processStep: true,
          productionPallet: {
            include: {
              detail: true,
              bufferCell: {
                include: {
                  buffer: true,
                },
              },
            },
          },
          operator: {
            include: {
              details: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      return activeOperations;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении активных операций: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получить операции в буфере
   */
  async getBufferedOperations() {
    this.logger.log('Получение списка операций связанных с поддонами в буфере');

    try {
      // Получаем список поддонов, находящихся в буфере
      const palletsInBuffer = await this.prisma.productionPallets.findMany({
        where: {
          bufferCellId: { not: null }, // Поддоны, которые находятся в каких-либо ячейках буфера
        },
        include: {
          detail: true,
          bufferCell: {
            include: {
              buffer: true,
            },
          },
          detailOperations: {
            where: {
              status: OperationStatus.IN_PROGRESS, // Только активные операции
            },
            include: {
              processStep: true,
              machine: true,
            },
            orderBy: {
              startedAt: 'desc',
            },
          },
        },
      });

      return palletsInBuffer;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении поддонов в буфере: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получить историю операций для конкретного поддона
   */
  async getPalletOperationHistory(palletId: number) {
    this.logger.log(`Получение истории операций для поддона ${palletId}`);

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.productionPallets.findUnique({
        where: { id: palletId },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      const operations = await this.prisma.detailOperation.findMany({
        where: {
          productionPalletId: palletId,
        },
        include: {
          machine: true,
          processStep: true,
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
        orderBy: {
          startedAt: 'desc',
        },
      });

      return {
        palletId,
        palletName: pallet.name,
        detailId: pallet.detailId,
        operations,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при получении истории операций поддона: ${error.message}`,
      );
      throw error;
    }
  }
}
