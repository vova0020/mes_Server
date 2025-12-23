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
   * @param machineId - ID станка
   * @param stageId - ID этапа для фильтрации (опционально)
   */
  async getMachineTask(
    machineId: number,
    stageId?: number,
  ): Promise<MachineTaskResponseDto> {
    // Проверка существования станка (обновлено под новую схему)
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
      select: { machineId: true, machineName: true },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Получаем routeStageIds для фильтрации, если указан stageId
    let routeStageIds: number[] | undefined;
    if (stageId) {
      const routeStages = await this.prisma.routeStage.findMany({
        where: { stageId },
        select: { routeStageId: true },
      });
      routeStageIds = routeStages.map((rs) => rs.routeStageId);
      console.log(
        `DEBUG: stageId=${stageId}, routeStageIds=${JSON.stringify(routeStageIds)}`,
      );
    }

    // Получаем ВСЕ назначения поддонов на станок (без фильтра по этапу)
    const allMachineAssignments = await this.prisma.machineAssignment.findMany({
      where: {
        machineId,
        completedAt: null, // Только активные назначения
      },
      select: {
        assignmentId: true,
        routeStageId: true,
        palletId: true,
      },
    });

    console.log(
      `DEBUG: Found ${allMachineAssignments.length} total assignments for machine ${machineId}`,
    );
    console.log(
      'DEBUG: All assignments:',
      allMachineAssignments.map((a) => ({
        assignmentId: a.assignmentId,
        routeStageId: a.routeStageId,
      })),
    );

    // Проверяем, к каким stageId относятся все routeStageId
    const allRouteStageIds = [
      ...new Set(
        allMachineAssignments
          .map((a) => a.routeStageId)
          .filter((id): id is number => id !== null),
      ),
    ];
    const routeStageInfo = await this.prisma.routeStage.findMany({
      where: { routeStageId: { in: allRouteStageIds } },
      select: { routeStageId: true, stageId: true },
    });
    console.log('DEBUG: RouteStage to Stage mapping:', routeStageInfo);

    // Фильтруем назначения по этапу, если указан
    const filteredAssignmentIds =
      routeStageIds && routeStageIds.length > 0
        ? allMachineAssignments
            .filter(
              (a) => a.routeStageId && routeStageIds!.includes(a.routeStageId),
            )
            .map((a) => a.assignmentId)
        : allMachineAssignments.map((a) => a.assignmentId);

    console.log(
      `DEBUG: Filtered to ${filteredAssignmentIds.length} assignments for requested stage`,
    );
    console.log('DEBUG: Filtered assignment IDs:', filteredAssignmentIds);

    // Получаем полные данные о назначениях
    const machineAssignments = await this.prisma.machineAssignment.findMany({
      where: {
        assignmentId: { in: filteredAssignmentIds },
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
                        composition: true,
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

    console.log(
      `DEBUG: Loaded ${machineAssignments.length} full assignment records`,
    );
    console.log(
      'DEBUG: Assignment details:',
      machineAssignments.map((a) => ({
        assignmentId: a.assignmentId,
        routeStageId: a.routeStageId,
        palletId: a.palletId,
        partId: a.pallet?.part?.partId,
        partCode: a.pallet?.part?.partCode,
      })),
    );

    // Используем уже вычисленные routeStageIds или получаем все для станка
    if (!routeStageIds) {
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
      routeStageIds = relevantRouteStages.map((rs) => rs.routeStageId);
    }

    // Получаем ID поддонов, которые назначены на данный cтанок
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
                              composition: true,
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

    // Группируем задания по деталям И этапам маршрута
    const detailMap = new Map<string, TaskItemDto>();
    const detailIds = new Set<number>();

    console.log(
      `DEBUG: Starting to process ${machineAssignments.length} assignments`,
    );

    // Обрабатываем назначения станков
    for (const assignment of machineAssignments) {
      const part = assignment.pallet.part;
      const partId = part.partId;
      const routeStageId = assignment.routeStageId;
      const mapKey = `${partId}-${routeStageId}`; // Ключ по детали И этапу
      detailIds.add(partId);

      // Получаем заказ из первого пакета
      const order = part.productionPackageParts[0]?.package.order;
      console.log(
        `DEBUG: Processing assignment ${assignment.assignmentId}, part ${partId}, order:`,
        order ? order.orderId : 'NO ORDER',
      );
      if (!order) {
        console.log(
          `DEBUG: Skipping assignment ${assignment.assignmentId} - no order found`,
        );
        continue;
      }

      // Получаем материал из PackageComposition
      const packageComposition =
        part.productionPackageParts[0]?.package.composition;
      const compositionItem = packageComposition?.find(
        (comp) => comp.partCode === part.partCode,
      );
      const materialName =
        compositionItem?.materialName ||
        part.material?.materialName ||
        'Не указан';

      // Находим актуальный прогресс для этого поддона
      const latestProgress = assignment.pallet.palletStageProgress[0];

      // Получаем информацию об этапе из назначения
      const assignmentRouteStage = await this.prisma.routeStage.findUnique({
        where: { routeStageId: assignment.routeStageId! },
        include: { stage: true },
      });

      if (!detailMap.has(mapKey)) {
        detailMap.set(mapKey, {
          operationId: assignment.assignmentId,
          processStepId: assignmentRouteStage?.stageId || 0,
          processStepName:
            assignmentRouteStage?.stage.stageName || 'Не определен',
          quantity: 1, // Количество поддонов, может быть изменено позже
          status: latestProgress?.status || 'PENDING',
          priority: 0, // Будет обновлено позже из PartMachineAssignment
          readyForProcessing: 0,
          distributed: 0,
          completed: 0,
          detail: {
            id: part.partId,
            article: part.partCode,
            name: part.partName,
            material: materialName,
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
        console.log(
          `DEBUG: Added task for part ${partId}, routeStage ${routeStageId}`,
        );
      }
    }

    console.log(`DEBUG: Created ${detailMap.size} tasks in detailMap`);
    console.log('DEBUG: Task keys:', Array.from(detailMap.keys()));

    // Обрабатываем прогресс поддонов
    for (const progress of palletProgress) {
      const part = progress.pallet.part;
      const partId = part.partId;
      const routeStageId = progress.routeStageId;
      const mapKey = `${partId}-${routeStageId}`;
      detailIds.add(partId);

      const order = part.productionPackageParts[0]?.package.order;
      if (!order) continue;

      // Получаем материал из PackageComposition
      const packageComposition =
        part.productionPackageParts[0]?.package.composition;
      const compositionItem = packageComposition?.find(
        (comp) => comp.partCode === part.partCode,
      );
      const materialName =
        compositionItem?.materialName ||
        part.material?.materialName ||
        'Не указан';

      if (!detailMap.has(mapKey)) {
        detailMap.set(mapKey, {
          operationId: progress.pspId,
          processStepId: progress.routeStage.stageId,
          processStepName: progress.routeStage.stage.stageName,
          quantity: 1,
          status: progress.status,
          priority: 0, // Будет обновлено позже из PartMachineAssignment
          readyForProcessing: 0,
          distributed: 0,
          completed: 0,
          detail: {
            id: part.partId,
            article: part.partCode,
            name: part.partName,
            material: materialName,
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
        const existingItem = detailMap.get(mapKey);
        if (
          existingItem &&
          progress.status === 'IN_PROGRESS' &&
          existingItem.status !== 'IN_PROGRESS'
        ) {
          detailMap.set(mapKey, {
            ...existingItem,
            operationId: progress.pspId,
            status: progress.status,
          });
        }
      }
    }

    // Получаем приоритеты деталей на станке
    const partPriorities = await this.prisma.partMachineAssignment.findMany({
      where: {
        machineId,
        partId: { in: Array.from(detailIds) },
      },
      select: {
        partId: true,
        priority: true,
      },
    });

    const priorityMap = new Map<number, number>();
    partPriorities.forEach((p) => priorityMap.set(p.partId, p.priority));

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

      // Вычисляем распределение по статусам для конкретного этапа
      // readyForProcessing - сумма количества поддонов, которые назначены станку на обработку для данного этапа, но еще не обработаны
      // completed - сумма количества поддонов, которые станок завершил обрабатывать для данного этапа
      
      // Создаем карту статистики по этапам
      const stageStats = new Map<number, { readyForProcessing: number; completed: number }>();

      // Анализируем поддоны для данной детали
      for (const pallet of part.pallets) {
        // Используем количество деталей на конкретном поддоне
        const palletQuantity = Number(pallet.quantity);

        // Проверяем назначения на текущий станок для каждого этапа
        const currentMachineAssignments = pallet.machineAssignments.filter(
          (assignment) => assignment.machine.machineId === machineId,
        );

        for (const assignment of currentMachineAssignments) {
          if (!assignment.routeStageId) continue;
          
          // Получаем stageId для данного routeStageId
          const routeStageInfo = await this.prisma.routeStage.findUnique({
            where: { routeStageId: assignment.routeStageId },
            select: { stageId: true }
          });
          
          if (!routeStageInfo) continue;
          
          const currentStageId = routeStageInfo.stageId;
          
          // Инициализируем статистику для этапа, если её нет
          if (!stageStats.has(currentStageId)) {
            stageStats.set(currentStageId, { readyForProcessing: 0, completed: 0 });
          }
          
          const stats = stageStats.get(currentStageId)!;
          
          if (assignment.completedAt) {
            // Назначение завершено - поддон обработан станком для данного этапа
            stats.completed += palletQuantity;
          } else {
            // Активное назначение - поддон назначен на обработку для данного этапа
            stats.readyForProcessing += palletQuantity;
          }
        }
      }

      // Обновляем статистику в карте для каждого этапа
      for (const [mapKey, detailItem] of detailMap.entries()) {
        if (mapKey.startsWith(`${partId}-`)) {
          // Извлекаем routeStageId из ключа
          const routeStageIdFromKey = parseInt(mapKey.split('-')[1]);
          
          // Получаем stageId для данного routeStageId
          const routeStageInfo = await this.prisma.routeStage.findUnique({
            where: { routeStageId: routeStageIdFromKey },
            select: { stageId: true }
          });
          
          const currentStageId = routeStageInfo?.stageId;
          const stats = currentStageId ? stageStats.get(currentStageId) : undefined;
          
          detailMap.set(mapKey, {
            ...detailItem,
            quantity: part.pallets.length, // Общее количество поддонов
            priority: priorityMap.get(partId) || 0,
            readyForProcessing: stats?.readyForProcessing || 0,
            distributed: 0, // Не используется для станков
            completed: stats?.completed || 0,
          });
        }
      }
    }

    // Фильтруем задания по stageId, если он передан
    let tasks = Array.from(detailMap.values());
    console.log(`DEBUG: Before final filtering - ${tasks.length} tasks`);
    console.log(
      'DEBUG: Task processStepIds:',
      tasks.map((t) => ({
        operationId: t.operationId,
        processStepId: t.processStepId,
        processStepName: t.processStepName,
      })),
    );

    if (stageId) {
      console.log(`DEBUG: Filtering tasks by stageId=${stageId}`);
      tasks = tasks.filter((task) => task.processStepId === stageId);
      console.log(
        `DEBUG: After filtering by stageId - ${tasks.length} tasks remain`,
      );
    }

    console.log(`DEBUG: Final result - returning ${tasks.length} tasks`);
    return {
      machineId: machine.machineId,
      machineName: machine.machineName,
      tasks,
    };
  }
}
