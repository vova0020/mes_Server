import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  MachineTaskResponseDto,
  TaskItemDto,
} from '../dto/machine-taskDetail.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TaskDetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить сменное задание для станка
   * Адаптировано под новую схему БД
   */
  async getMachineTask(machineId: number): Promise<MachineTaskResponseDto> {
    // Проверка существования станка (обновлено под новую схему)
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
      select: { machineId: true, machineName: true },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Получаем назначения поддонов на станок
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
                  take: 1, // Берем первый пакет для получения заказа
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
                pspId: 'desc', // Последние операции сначала
              },
            },
          },
        },
      },
    });

    // Также получаем поддоны с прогрессом для данного станка через связи
    const relevantRouteStages = await this.prisma.routeStage.findMany({
      where: {
        OR: [
          {
            stage: {
              machinesStages: {
                some: {
                  machineId,
                },
              },
            },
          },
          {
            substage: {
              machineSubstages: {
                some: {
                  machineId,
                },
              },
            },
          },
        ],
      },
      select: {
        routeStageId: true,
      },
    });

    const routeStageIds = relevantRouteStages.map((rs) => rs.routeStageId);

    // Получаем ID поддонов, которые назначены на данный ��танок
    const assignedPalletIds = machineAssignments.map(
      (assignment) => assignment.palletId,
    );

    // Получаем прогресс только если есть назначенные поддоны
    const palletProgress =
      assignedPalletIds.length > 0
        ? await this.prisma.palletStageProgress.findMany({
            where: {
              routeStageId: {
                in: routeStageIds,
              },
              status: {
                in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
              },
              // Фильтруем только поддоны, которые назначены на данный станок
              palletId: {
                in: assignedPalletIds,
              },
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
                },
              },
              routeStage: {
                include: {
                  stage: true,
                  substage: true,
                },
              },
            },
          })
        : [];

    // Группируем задания по деталям
    const detailMap = new Map<number, TaskItemDto>();
    const detailIds = new Set<number>();

    // Обрабатываем назначения станков
    for (const assignment of machineAssignments) {
      const part = assignment.pallet.part;
      const partId = part.partId;
      detailIds.add(partId);

      // Получаем заказ из первого пакета
      const order = part.productionPackageParts[0]?.package.order;
      if (!order) continue;

      // Находим актуальный прогресс для этого поддона
      const latestProgress = assignment.pallet.palletStageProgress[0];

      if (!detailMap.has(partId)) {
        detailMap.set(partId, {
          operationId: assignment.assignmentId,
          processStepId: latestProgress?.routeStage.stageId || 0,
          processStepName:
            latestProgress?.routeStage.stage.stageName || 'Не определен',
          quantity: 1, // Количество поддонов, может быть изменено позже
          status: latestProgress?.status || 'PENDING',
          readyForProcessing: 0,
          distributed: 0,
          completed: 0,
          detail: {
            id: part.partId,
            article: part.partCode,
            name: part.partName,
            material: part.material?.materialName || 'Не указан',
            size: part.size,
            totalNumber: Number(part.totalQuantity),
          },
          order: {
            id: order.orderId,
            runNumber: order.batchNumber,
            name: order.orderName,
            progress: Number(order.completionPercentage),
          },
        });
      }
    }

    // Обрабатываем прогресс поддонов
    for (const progress of palletProgress) {
      const part = progress.pallet.part;
      const partId = part.partId;
      detailIds.add(partId);

      const order = part.productionPackageParts[0]?.package.order;
      if (!order) continue;

      if (!detailMap.has(partId)) {
        detailMap.set(partId, {
          operationId: progress.pspId,
          processStepId: progress.routeStage.stageId,
          processStepName: progress.routeStage.stage.stageName,
          quantity: 1,
          status: progress.status,
          readyForProcessing: 0,
          distributed: 0,
          completed: 0,
          detail: {
            id: part.partId,
            article: part.partCode,
            name: part.partName, 
            material: part.material?.materialName || 'Не указан',
            size: part.size,
            totalNumber: Number(part.totalQuantity),
          },
          order: {
            id: order.orderId,
            runNumber: order.batchNumber,
            name: order.orderName,
            progress: Number(order.completionPercentage),
          },
        });
      } else {
        // Обновляем, если новый статус более актуален
        const existingItem = detailMap.get(partId);
        if (
          existingItem &&
          progress.status === 'IN_PROGRESS' &&
          existingItem.status !== 'IN_PROGRESS'
        ) {
          detailMap.set(partId, {
            ...existingItem,
            operationId: progress.pspId,
            status: progress.status,
          });
        }
      }
    }

    // Подсчитываем статистику для каждой детали
    for (const partId of detailIds) {
      // Получаем деталь с полной информацией о маршруте
      const part = await this.prisma.part.findUnique({
        where: { partId },
        include: {
          route: {
            include: {
              routeStages: {
                include: {
                  stage: true,
                  substage: true,
                },
                orderBy: {
                  sequenceNumber: 'asc',
                },
              },
            },
          },
          pallets: {
            include: {
              palletStageProgress: {
                include: {
                  routeStage: {
                    include: {
                      stage: true,
                      substage: true,
                    },
                  },
                },
              },
              machineAssignments: {
                where: {
                  machineId,
                },
                include: {
                  machine: true,
                },
              },
            },
          },
        },
      });

      if (!part) continue;

      
      
      // Вычисляем распределение по статусам для станка
      // readyForProcessing - сумма количества поддонов, которые назначены станку на обработку, но еще не обработаны
      // completed - сумма количества поддонов, которые станок завершил обрабатывать
      let readyForProcessing = 0;
      let completed = 0;

      // Анализируем поддоны для данной детали
      for (const pallet of part.pallets) {
        // Используем количество деталей на конкретном поддоне
        const palletQuantity = Number(pallet.quantity);

        // Проверяем назначения на текущий станок
        const currentMachineAssignments = pallet.machineAssignments.filter(
          (assignment) => assignment.machine.machineId === machineId,
        );

        // Проверяем завершенные назначения на текущий станок
        const completedMachineAssignments = pallet.machineAssignments.filter(
          (assignment) => 
            assignment.machine.machineId === machineId &&
            assignment.completedAt // Только завершенные назначения
        );

        // Определяем статус поддона для данного станка
        if (currentMachineAssignments.length > 0) {
          // Поддон назначен на этот станок
          if (completedMachineAssignments.length > 0) {
            // Есть завершенные назначения - поддон обработан станком
            completed += palletQuantity;
          } else {
            // Есть активные назначения, но не завершенные - поддон назначен на обработку
            readyForProcessing += palletQuantity;
          }
        }
        // Если поддон не назначен на этот станок - не учитываем его в статистике
      }

      // Обновляем статистику в карте
      const detailItem = detailMap.get(partId);
      if (detailItem) {
        detailMap.set(partId, {
          ...detailItem,
          quantity: part.pallets.length, // Общее количество поддонов
          readyForProcessing,
          distributed: 0, // Не используется для станков
          completed,
        });
      }
    }

    return {
      machineId: machine.machineId,
      machineName: machine.machineName,
      tasks: Array.from(detailMap.values()),
    };
  }
}
