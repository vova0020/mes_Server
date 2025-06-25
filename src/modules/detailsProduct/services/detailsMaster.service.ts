import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class DetailsMasterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получение списка деталей для указанного заказа с учетом участка обработки
   * @param orderId - ID производственного заказа
   * @param segmentId - ID участка (теперь ProductionStageLevel1), к которому привязан мастер
   */
  async getDetailsByOrderId(orderId: number, segmentId: number) {
    // Проверяем существование заказа (теперь Order)
    const orderExists = await this.prisma.order.findUnique({
      where: { orderId },
    });

    if (!orderExists) {
      throw new NotFoundException(
        `Производственный заказ с ID ${orderId} не найден`,
      );
    }

    // Проверяе�� существование участка (теперь ProductionStageLevel1)
    const segmentExists = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: segmentId },
      include: {
        productionStagesLevel2: true, // подэтапы
        routeStages: true, // этапы в маршрутах
        machinesStages: {
          include: {
            machine: true,
          },
        },
      },
    });

    if (!segmentExists) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем информацию о станках, привязанных к этому участку
    const segmentMachines = segmentExists.machinesStages.map(
      (ms) => ms.machine,
    );
    const machineIds = segmentMachines.map((machine) => machine.machineId);

    // Находим все пакеты (бывшие УПАКи), связанные с заказом
    const packages = await this.prisma.package.findMany({
      where: { orderId },
      include: {
        productionPackageParts: {
          include: {
            part: {
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
                material: true,
                pallets: {
                  select: {
                    palletId: true,
                    palletName: true,
                    quantity: true,
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
                      include: {
                        machine: true,
                      },
                    },
                  },
                },
                partRouteProgress: {
                  include: {
                    routeStage: {
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
        },
      },
    });

    // Если пакетов нет, возвращаем пустой массив
    if (packages.length === 0) {
      return [];
    }

    // Формируем список деталей из всех пакетов с подсчетом количества
    const detailsMap = new Map();

    // Проходим по всем пакетам и деталям в них
    for (const packageItem of packages) {
      for (const packagePart of packageItem.productionPackageParts) {
        const part = packagePart.part;

        // Если детали еще нет в нашей карте, добавляем её
        if (!detailsMap.has(part.partId)) {
          // Определяем технологический маршрут для детали
          const route = part.route;
          const routeStages = route
            ? route.routeStages.map((stage) => ({
                stageId: stage.stageId,
                substageId: stage.substageId,
                sequenceNumber: stage.sequenceNumber,
              }))
            : [];

          // Определяем, какие эта��ы относятся к текущему участку
          const currentSegmentStageIds = [segmentId]; // основной этап
          const currentSegmentSubstageIds =
            segmentExists.productionStagesLevel2.map((s) => s.substageId);

          // Определяем предыдущие этапы в маршруте до этапов текущего участка
          let previousStageIds: number[] = [];
          let isFirstSegment = false;

          if (routeStages.length > 0) {
            // Находим минимальную последовательность для этапов текущего участка
            const currentSegmentStagesInRoute = routeStages.filter(
              (stage) =>
                currentSegmentStageIds.includes(stage.stageId) ||
                (stage.substageId &&
                  currentSegmentSubstageIds.includes(stage.substageId)),
            );

            if (currentSegmentStagesInRoute.length > 0) {
              const minSequence = Math.min(
                ...currentSegmentStagesInRoute.map((stage) =>
                  Number(stage.sequenceNumber),
                ),
              );

              // Если минимальная последовательность равна 1, это первый участок
              isFirstSegment = minSequence === 1;

              // Находим все предыдущие этапы в маршруте
              previousStageIds = routeStages
                .filter((stage) => Number(stage.sequenceNumber) < minSequence)
                .map((stage) => stage.stageId);
            }
          } else {
            // Если маршрут не определен, проверяем по производственной линии
            const stageWithLine =
              await this.prisma.productionStageLevel1.findUnique({
                where: { stageId: segmentId },
                include: {
                  linesStages: {
                    include: {
                      line: {
                        include: {
                          linesStages: {
                            include: {
                              stage: true,
                            },
                            orderBy: {
                              lineStageId: 'asc',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              });

            if (stageWithLine && stageWithLine.linesStages.length > 0) {
              const line = stageWithLine.linesStages[0].line;
              isFirstSegment =
                line.linesStages.length > 0 &&
                line.linesStages[0].stage.stageId === segmentId;
            } else {
              isFirstSegment = true; // по умолчанию считаем первым
            }
          }

          // Вычисляем распределение по статусам с учетом участка
          let readyForProcessing = 0;
          let distributed = 0;
          let completed = 0;

          // Анализируем поддоны для данной детали
          for (const pallet of part.pallets) {
            // Используем количество деталей на конкретном поддоне
            const palletQuantity = Number(pallet.quantity);

            // Находим прогресс поддона по этапам текущего участка
            const currentSegmentProgress = pallet.palletStageProgress.filter(
              (progress) =>
                currentSegmentStageIds.includes(progress.routeStage.stageId) ||
                (progress.routeStage.substageId &&
                  currentSegmentSubstageIds.includes(
                    progress.routeStage.substageId,
                  )),
            );

            // Находим прогресс по предыдущим этапам
            const previousStageProgress = pallet.palletStageProgress.filter(
              (progress) =>
                previousStageIds.includes(progress.routeStage.stageId),
            );

            // Проверяем, завершены ли операции на предыдущих этапах
            const isPreviousStagesCompleted =
              previousStageProgress.length > 0 &&
              previousStageProgress.every(
                (progress) => progress.status === 'COMPLETED',
              );

            // Проверяем назначения на станки
            const currentMachineAssignments = pallet.machineAssignments.filter(
              (assignment) => machineIds.includes(assignment.machine.machineId),
            );

            // Определяем статус детали на текущем участке
            if (currentSegmentProgress.length > 0) {
              // Берем последний прогресс на текущем участке
              const latestProgress = currentSegmentProgress.sort(
                (a, b) =>
                  (b.completedAt?.getTime() || 0) -
                  (a.completedAt?.getTime() || 0),
              )[0];

              if (latestProgress.status === 'COMPLETED') {
                completed += palletQuantity;
              } else if (
                latestProgress.status === 'IN_PROGRESS' &&
                currentMachineAssignments.length > 0 &&
                !currentMachineAssignments.some(
                  (assignment) => assignment.completedAt,
                )
              ) {
                distributed += palletQuantity;
              }
            } else if (
              isFirstSegment &&
              pallet.palletStageProgress.length === 0
            ) {
              // Если это первый участок и нет прогресса вообще, деталь готова к обработке
              readyForProcessing += palletQuantity;
            } else if (!isFirstSegment && isPreviousStagesCompleted) {
              // Если не первый участок и предыдущие этапы завершены, деталь готова к обработке
              readyForProcessing += palletQuantity;
            }
          }

          // Если нет поддонов, анализируем общий прогресс детали
          if (part.pallets.length === 0) {
            const partProgress = part.partRouteProgress.filter(
              (progress) =>
                currentSegmentStageIds.includes(progress.routeStage.stageId) ||
                (progress.routeStage.substageId &&
                  currentSegmentSubstageIds.includes(
                    progress.routeStage.substageId,
                  )),
            );

            const previousPartProgress = part.partRouteProgress.filter(
              (progress) =>
                previousStageIds.includes(progress.routeStage.stageId),
            );

            const isPreviousStagesCompleted =
              previousPartProgress.length > 0 &&
              previousPartProgress.every(
                (progress) => progress.status === 'COMPLETED',
              );

            if (partProgress.length > 0) {
              const latestProgress = partProgress.sort(
                (a, b) =>
                  (b.completedAt?.getTime() || 0) -
                  (a.completedAt?.getTime() || 0),
              )[0];

              if (latestProgress.status === 'COMPLETED') {
                completed += Number(part.totalQuantity);
              } else if (latestProgress.status === 'IN_PROGRESS') {
                distributed += Number(part.totalQuantity);
              }
            } else if (isFirstSegment && part.partRouteProgress.length === 0) {
              readyForProcessing += Number(part.totalQuantity);
            } else if (!isFirstSegment && isPreviousStagesCompleted) {
              readyForProcessing += Number(part.totalQuantity);
            }
          }

          detailsMap.set(part.partId, {
            id: part.partId,
            articleNumber: part.partCode,
            name: part.partName,
            material: part.material.materialName,
            size: part.size,
            totalQuantity: Number(packagePart.quantity),
            readyForProcessing,
            distributed,
            completed,
          });
        } else {
          // Учитываем количество из пакета в общем количестве
          const currentDetail = detailsMap.get(part.partId);
          currentDetail.totalQuantity += Number(packagePart.quantity);
          detailsMap.set(part.partId, currentDetail);
        }
      }
    }

    // Преобразуем Map в массив для ответа
    return Array.from(detailsMap.values());
  }
}
