
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  MachineTaskResponseDto,
  TaskItemDto,
} from '../dto/machine-taskDetail.dto';
import { OperationStatus } from '@prisma/client';

@Injectable()
export class TaskDetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить сменное задание для станка упаковки
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

    // Получаем все операции упаковки для станка
    const packagingOperations = await this.prisma.detailOperation.findMany({
      where: {
        machineId,
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
                ypaks: {
                  select: {
                    quantity: true,
                    ypak: {
                      select: {
                        id: true,
                        article: true,
                        name: true,
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
                },
              },
            },
          },
        },
      },
      orderBy: {
        priority: { sort: 'asc', nulls: 'last' }, // Сортировка по приоритету
      },
    });

    // Группируем операции по упаковкам, чтобы избежать дублирования
    const ypakMap = new Map<number, TaskItemDto>();
    
    // Извлекаем уникальные ID упаковок для последующих запросов
    const ypakIds = new Set<number>();

    // Обрабатываем результаты запроса
    for (const operation of packagingOperations) {
      const ypakInfo = operation.productionPallet.detail.ypaks[0]?.ypak;
      
      if (!ypakInfo) {
        // Пропускаем операции без связанной упаковки
        continue;
      }

      const ypakId = ypakInfo.id;
      ypakIds.add(ypakId);

      if (!ypakMap.has(ypakId)) {
        // Создаем новую запись для упаковки
        ypakMap.set(ypakId, {
          operationId: operation.id,
          processStepId: operation.processStep.id,
          processStepName: operation.processStep.name,
          priority: operation.priority,
          quantity: operation.quantity,
          status: operation.status,
          totalQuantity: 0, // Будет обновлено позже
          readyForPackaging: 0, // Будет обновлено позже
          packaged: 0, // Будет обновлено позже
          ypak: {
            id: ypakInfo.id,
            article: ypakInfo.article,
            name: ypakInfo.name,
          },
          order: {
            id: ypakInfo.order.id,
            runNumber: ypakInfo.order.runNumber,
            name: ypakInfo.order.name,
            progress: ypakInfo.order.progress,
          },
        });
      } else {
        // Если упаковка уже в Map, но новая запись имеет статус IN_PROGRESS,
        // обновляем запись, чтобы отобразить активную операцию
        const existingItem = ypakMap.get(ypakId);
        if (
          existingItem && 
          operation.status === OperationStatus.IN_PROGRESS &&
          existingItem.status !== OperationStatus.IN_PROGRESS
        ) {
          ypakMap.set(ypakId, {
            ...existingItem,
            operationId: operation.id,
            status: operation.status,
          });
        }
      }
    }

    // Для всех уникальных упаковок получаем дополнительную информацию
    for (const ypakId of ypakIds) {
      // 1. Получаем общее количество деталей в упаковке
      const ypakDetailsQuery = await this.prisma.productionYpakDetail.findMany({
        where: {
          ypakId,
        },
        select: {
          quantity: true,
        },
      });

      // Суммируем количество всех деталей в упаковке
      const totalQuantity = ypakDetailsQuery.reduce(
        (sum, detail) => sum + detail.quantity,
        0,
      );

      // 2. Посчитаем готовые к упаковке детали (прошедшие предыдущие этапы)
      // Заглушка - в реальном приложении здесь должен быть запрос, который считает
      // детали по соответствующим статусам на предыдущих этапах
      // TODO: Реализовать реальный подсчет готовых к упаковке деталей
      const readyForPackaging = Math.floor(totalQuantity * 0.8); // Временная заглушка
      
      // 3. Посчитаем упакованные детали 
      // TODO: Реализовать реальный подсчет упакованных деталей
      const packaged = Math.floor(totalQuantity * 0.6); // Временная заглушка

      // Обновляем информацию в Map
      const ypakItem = ypakMap.get(ypakId);
      if (ypakItem) {
        ypakMap.set(ypakId, {
          ...ypakItem,
          totalQuantity,
          readyForPackaging,
          packaged,
        });
      }
    }

    // Формируем итоговый ответ
    return {
      machineId: machine.id,
      machineName: machine.name,
      tasks: Array.from(ypakMap.values()),
    };
  }
}
