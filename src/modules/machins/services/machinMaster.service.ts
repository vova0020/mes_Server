import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OperationStatus } from '@prisma/client';
import { MachineSegmentResponseDto } from 'src/modules/machins/dto/machine-segment.dto';
import {
  MachineTaskResponseDto,
  MoveTaskDto,
} from 'src/modules/machins/dto/machine-task.dto';

@Injectable()
export class MachinMasterService {
  private readonly logger = new Logger(MachinMasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Получение списка станков с включением связанных данных
  async getMachines(segmentId?: number) {
    this.logger.log(
      `Запрос на получение списка станков${segmentId ? ` для участка: ${segmentId}` : ''}`,
    );

    try {
      // Проверяем, есть ли записи в таблице
      const count = await this.prisma.machine.count();
      this.logger.log(`Найдено ${count} станков в базе данных`);

      // Строим параметры запроса в зависимости от наличия segmentId
      const where: any = {};

      if (segmentId) {
        // Если передан ID участка, фильтруем станки по участку
        where.segmentId = segmentId;
      } else {
        // Если ID участка не передан, возвращаем только активные станки
        where.status = 'ACTIVE';
      }

      // Получаем станки с учетом фильтров
      const machineAll = await this.prisma.machine.findMany({
        where,
        include: {
          // Включаем информацию об участке для отображения
          segment: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Получено ${machineAll.length} станков с данными`);

      return machineAll;
    } catch (error) {
      this.logger.error(`Ошибка при получении станков: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить все станки по ID участка с дополнительной информацией
   * @param segmentId ID производственного участка
   * @returns Массив объектов с информацией о станках
   */
  async getMachinesBySegmentId(
    segmentId: number,
  ): Promise<MachineSegmentResponseDto[]> {
    this.logger.log(`Получение станков для участка с ID: ${segmentId}`);

    try {
      // Проверяем существование участка
      const segment = await this.prisma.productionSegment.findUnique({
        where: { id: segmentId },
      });

      if (!segment) {
        throw new NotFoundException(`Участок с ID ${segmentId} не найден`);
      }

      // Получаем все станки данного участка
      const machines = await this.prisma.machine.findMany({
        where: {
          segmentId,
        },
        include: {
          // Получаем операции для расчета запланированного количества
          detailOperations: {
            include: {
              productionPallet: true,
            },
          },
        },
      });

      if (machines.length === 0) {
        this.logger.warn(`Для участка с ID ${segmentId} не найдено станков`);
        return [];
      }

      // Получаем все завершенные операции для станков на данном участке
      const completedOperations = await this.prisma.detailOperation.findMany({
        where: {
          machine: {
            segmentId: segmentId,
          },
          status: OperationStatus.COMPLETED, // Только завершенные операции
        },
        include: {
          productionPallet: true, // Включаем информацию о поддоне для получения количества деталей
          machine: true, // Включаем информацию о станке для группировки
        },
      });

      // Формируем объект для быстрого доступа к количеству завершенных операций по ID станка
      const completedQuantityByMachineId = completedOperations.reduce(
        (acc, operation) => {
          // Проверяем, что operation.machine не null
          if (!operation.machine) {
            return acc; // Пропускаем операции без указания станка
          }

          const machineId = operation.machine.id;

          if (!acc[machineId]) {
            acc[machineId] = 0;
          }

          // Суммируем количество деталей в завершенной операции
          acc[machineId] += operation.quantity;

          return acc;
        },
        {},
      );

      // Формируем ответ с дополнительными вычисляемыми полями
      const resultMachines = machines.map((machine) => {
        // Расчет запланированного количества - суммируем количество деталей по всем поддонам,
        // привязанным к станку через операции
        const plannedQuantity = machine.detailOperations.reduce(
          (total, operation) => total + operation.productionPallet.quantity,
          0,
        );

        // Получаем выполненное количество из собранной статистики или возвращаем 0
        const completedQuantity = completedQuantityByMachineId[machine.id] || 0;

        return {
          id: machine.id,
          name: machine.name,
          status: machine.status,
          recommendedLoad: machine.recommendedLoad,
          plannedQuantity,
          completedQuantity,
        };
      });

      this.logger.log(
        `Успешно получено ${resultMachines.length} станков для участка с ID ${segmentId}`,
      );
      return resultMachines;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении станков для участка с ID ${segmentId}: ${error.message}`,
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
  ): Promise<MachineTaskResponseDto[]> {
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

  /**
   * Удалить задание по ID
   * @param operationId ID операции/задания для удаления
   * @returns Объект с сообщением об успешном удалении
   */
  async deleteTaskById(operationId: number): Promise<{ message: string }> {
    this.logger.log(`Удаление задания с ID: ${operationId}`);

    try {
      // Проверяем существование операции
      const operation = await this.prisma.detailOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        throw new NotFoundException(`Задание с ID ${operationId} не найдено`);
      }

      // Удаляем операцию
      await this.prisma.detailOperation.delete({
        where: { id: operationId },
      });

      this.logger.log(`Задание с ID ${operationId} успешно удалено`);
      return { message: `Задание с ID ${operationId} успешно удалено` };
    } catch (error) {
      this.logger.error(
        `Ошибка при удалении задания с ID ${operationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Переместить задание на другой станок
   * @param moveTaskDto DTO с данными для перемещения задания
   * @returns Объект с сообщением об успешном перемещении
   */
  async moveTaskToMachine(
    moveTaskDto: MoveTaskDto,
  ): Promise<{ message: string }> {
    const { operationId, targetMachineId } = moveTaskDto;
    this.logger.log(
      `Перемещение задания с ID: ${operationId} на станок с ID: ${targetMachineId}`,
    );

    try {
      // Проверяем существование операции
      const operation = await this.prisma.detailOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        throw new NotFoundException(`Задание с ID ${operationId} не найдено`);
      }

      // Проверяем статус операции - перемещать можно только если задание не COMPLETED
      if (operation.status === OperationStatus.COMPLETED) {
        throw new BadRequestException(
          `Нельзя перемещать завершенное задание с ID ${operationId}`,
        );
      }

      // Проверяем существование целевого станка
      const targetMachine = await this.prisma.machine.findUnique({
        where: { id: targetMachineId },
      });

      if (!targetMachine) {
        throw new NotFoundException(`Станок с ID ${targetMachineId} не найден`);
      }

      // Перемещаем задание на новый станок и сбрасываем статус на ON_MACHINE
      const updatedOperation = await this.prisma.detailOperation.update({
        where: { id: operationId },
        data: {
          machineId: targetMachineId,
          status: OperationStatus.ON_MACHINE,
        },
      });

      this.logger.log(
        `Задание с ID ${operationId} успешно перемещено на станок с ID ${targetMachineId}`,
      );
      return {
        message: `Задание успешно перемещено на станок ${targetMachine.name}`,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении задания с ID ${operationId} на станок с ID ${targetMachineId}: ${error.message}`,
      );
      throw error;
    }
  }
}
