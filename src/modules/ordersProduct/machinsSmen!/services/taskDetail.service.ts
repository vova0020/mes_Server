
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  MachineTaskResponseDto,
  TaskItemDto,
} from '../dto/machine-taskDetail.dto';
import { OperationStatus } from '@prisma/client';

@Injectable()
export class TaskDetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить сменное задание для станка
   * Оптимизировано для предотвращения лишних запросов к базе данных
   */
  async getMachineTask(machineId: number): Promise<MachineTaskResponseDto> {
    // Проверка существования станка
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, name: true },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Получаем все операции для станка со статусом ON_MACHINE или IN_PROGRESS
    const detailOperations = await this.prisma.detailOperation.findMany({
      where: {
        machineId,
        status: {
          in: [
            OperationStatus.ON_MACHINE,
            OperationStatus.IN_PROGRESS,
            OperationStatus.COMPLETED,
            OperationStatus.BUFFERED,
          ],
        }, // Показываем как задания, так и выполняемые операции
      },
      include: {
        processStep: {
          select: {
            id: true,
            name: true,
          },
        },
        productionPallet: {
          select: {
            quantity: true,
            detail: {
              select: {
                id: true,
                article: true,
                name: true,
                material: true,
                size: true,
                totalNumber: true,
                ypaks: {
                  select: {
                    ypak: {
                      select: {
                        order: {
                          select: {
                            id: true,
                            runNumber: true,
                            name: true,
                            progress: true,
                          },
                        },
                      },
                    },
                  },
                  take: 1, // Берем только первый УПАК, чтобы получить заказ
                },
              },
            },
          },
        },
      },
    });

    // Группируем операции по деталям, чтобы избежать дублирования запросов
    // Используем Map для индексации деталей по ID
    const detailMap = new Map<number, TaskItemDto>();

    // Собираем уникальные ID деталей для последующих запросов
    const detailIds = new Set<number>();

    // Обрабатываем результаты запроса
    for (const operation of detailOperations) {
      const detailId = operation.productionPallet.detail.id;
      detailIds.add(detailId); // Добавляем ID детали в множество

      // Получаем объект заказа из первого УПАК детали
      const order = operation.productionPallet.detail.ypaks[0]?.ypak.order;

      if (!order) {
        // Пропускаем операции без связанного заказа
        continue;
      }

      // Проверяем, есть ли уже задание для этой детали в Map
      if (!detailMap.has(detailId)) {
        // Создаем новую запись для детали
        detailMap.set(detailId, {
          operationId: operation.id,
          processStepId: operation.processStep.id,
          processStepName: operation.processStep.name,
          quantity: operation.quantity,
          // Добавляем статус операции, чтобы на фронтенде можно было отобразить,
          // находится ли деталь в обработке или только назначена
          status: operation.status,
          // Инициализируем значения readyForProcessing и completed
          readyForProcessing: 0,
          completed: 0,
          detail: {
            id: operation.productionPallet.detail.id,
            article: operation.productionPallet.detail.article,
            name: operation.productionPallet.detail.name,
            material: operation.productionPallet.detail.material,
            size: operation.productionPallet.detail.size,
            totalNumber: operation.productionPallet.detail.totalNumber,
          },
          order: {
            id: order.id,
            runNumber: order.runNumber,
            name: order.name,
            progress: order.progress,
          },
        });
      } else {
        // Если деталь уже в Map, но новая запись имеет статус IN_PROGRESS,
        // обновляем запись, чтобы отобразить активную операцию
        const existingItem = detailMap.get(detailId);
        if (
          existingItem && // Проверка на undefined
          operation.status === OperationStatus.IN_PROGRESS &&
          existingItem.status !== OperationStatus.IN_PROGRESS
        ) {
          // Создаем новый объект с обязательными полями
          const updatedItem: TaskItemDto = {
            operationId: operation.id,
            processStepId: existingItem.processStepId,
            processStepName: existingItem.processStepName,
            quantity: existingItem.quantity,
            status: operation.status,
            readyForProcessing: existingItem.readyForProcessing,
            completed: existingItem.completed,
            detail: existingItem.detail,
            order: existingItem.order,
          };

          detailMap.set(detailId, updatedItem);
        }
      }
    }

    // Для всех уникальных деталей получаем статистику по поддонам
    for (const detailId of detailIds) {
      // 1. Получаем общее количество деталей для обработки
      // ИСПРАВЛЕНО: Теперь считаем только поддоны, для которых нет завершённых операций на этом станке
      const totalPalletsQuery = await this.prisma.productionPallets.findMany({
        where: {
          detailId,
          detailOperations: {
            some: {
              machineId,
            },
            // Исключаем поддоны, у которых есть операции со статусом COMPLETED на данном станке
            none: {
              machineId,
              status: OperationStatus.COMPLETED,
            },
          },
        },
        select: {
          quantity: true,
        },
      });

      // Суммируем количества деталей на поддонах, которые еще не завершены
      const readyForProcessing = totalPalletsQuery.reduce(
        (sum, pallet) => sum + pallet.quantity,
        0,
      );

      // 2. Получаем суммарное количество деталей на поддонах с завершенными операциями
      const completedPalletsQuery =
        await this.prisma.productionPallets.findMany({
          where: {
            detailId,
            detailOperations: {
              some: {
                machineId,
                status: OperationStatus.COMPLETED,
              },
            },
          },
          select: {
            quantity: true,
          },
        });

      // Суммируем количества деталей на поддонах с завершенными операциями
      const completed = completedPalletsQuery.reduce(
        (sum, pallet) => sum + pallet.quantity,
        0,
      );

      // Обновляем информацию в Map
      const detailItem = detailMap.get(detailId);
      if (detailItem) {
        detailMap.set(detailId, {
          ...detailItem,
          readyForProcessing, // Общее количество деталей на незавершенных поддонах
          completed, // Количество деталей на поддонах с завершенными операциями
        });
      }
    }

    // Формируем итоговый ответ
    return {
      machineId: machine.id,
      machineName: machine.name,
      tasks: Array.from(detailMap.values()),
    };
  }
}
