import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OperationStatus } from '@prisma/client';

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

      // Проверяем, есть ли уже активная операция для данного поддона
      const existingOperation = await this.prisma.detailOperation.findFirst({
        where: {
          productionPalletId: palletId,
          status: OperationStatus.IN_PROGRESS,
        },
      });

      if (existingOperation) {
        throw new Error(
          `Поддон ${pallet.name} (ID: ${palletId}) уже находится в обработке (операция ID: ${existingOperation.id})`,
        );
      }

      // Проверяем, есть ли незавершенная операция для данного поддона и этапа процесса
      const bufferedOperation = await this.prisma.detailOperation.findFirst({
        where: {
          productionPalletId: palletId,
          processStepId: processStepId,
          status: OperationStatus.BUFFERED,
        },
      });

      let operation;

      if (bufferedOperation) {
        // Если существует приостановленная операция, возобновляем её
        operation = await this.prisma.detailOperation.update({
          where: { id: bufferedOperation.id },
          data: {
            machineId: machineId,
            operatorId: operatorId || null,
            status: OperationStatus.IN_PROGRESS,
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
          `Возобновлена операция ${operation.id} для поддона ${palletId} на станке ${machineId}`,
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

      // Если поддон был в буфере, освобождаем ячейку
      if (pallet.bufferCellId) {
        // Обновляем статус ячейки буфера
        await this.prisma.bufferCell.update({
          where: { id: pallet.bufferCellId },
          data: { status: 'AVAILABLE' },
        });

        // Отвязываем поддон от ячейки буфера
        await this.prisma.productionPallets.update({
          where: { id: palletId },
          data: { bufferCellId: null },
        });

        this.logger.log(
          `Поддон ${palletId} удален из ячейки буфера ${pallet.bufferCellId}`,
        );
      }

      return {
        message: bufferedOperation
          ? 'Операция с поддоном возобновлена на станке'
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
   * Переместить поддон в буфер (приостановить операцию)
   */
  async movePalletToBuffer(operationId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона в буфер (операция ${operationId}, ячейка ${bufferCellId})`,
    );

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
          `Только активные операции можно приостановить. Текущий статус: ${operation.status}`,
        );
      }

      // Проверяем существование ячейки буфера
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { id: bufferCellId },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячейка буфера с ID ${bufferCellId} не найдена`,
        );
      }

      // Проверяем, что ячейка буфера дос��упна
      if (bufferCell.status !== 'AVAILABLE') {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} недоступна. Текущий статус: ${bufferCell.status}`,
        );
      }

      // Обновляем операцию - меняем статус и отвязываем от станка
      const updatedOperation = await this.prisma.detailOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.BUFFERED,
          machineId: null,
        },
        include: {
          processStep: true,
          productionPallet: true,
        },
      });

      // Перемещаем поддон в ячейку буфера
      await this.prisma.productionPallets.update({
        where: { id: operation.productionPalletId },
        data: { bufferCellId: bufferCellId },
      });

      // Обновляем статус ячейки буфера
      await this.prisma.bufferCell.update({
        where: { id: bufferCellId },
        data: { status: 'OCCUPIED' },
      });

      this.logger.log(
        `Поддон ${operation.productionPallet.id} перемещен в ячейку буфера ${bufferCellId}`,
      );

      return {
        message: 'Поддон успешно перемещен в буфер',
        operation: updatedOperation,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении поддона в буфер: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Завершить операцию
   */
  async completeOperation(operationId: number, masterId?: number) {
    this.logger.log(`Завершение операции ${operationId}`);

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
          `Только активные операции можно завершить. Текущий статус: ${operation.status}`,
        );
      }

      // Обновляем операцию - завершаем её
      const completedOperation = await this.prisma.detailOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.COMPLETED,
          completedAt: new Date(),
          masterId: masterId || null,
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
          master: {
            include: {
              details: true,
            },
          },
        },
      });

      this.logger.log(`Операция ${operationId} успешно завершена`);

      return {
        message: 'Операция успешно завершена',
        operation: completedOperation,
      };
    } catch (error) {
      this.logger.error(`Ошибка при завершении операции: ${error.message}`);
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
    this.logger.log('Получение списка операций в буфере');

    try {
      const bufferedOperations = await this.prisma.detailOperation.findMany({
        where: {
          status: OperationStatus.BUFFERED,
        },
        include: {
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
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      return bufferedOperations;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении операций в буфере: ${error.message}`,
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