import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { SocketService } from '../../websocket/services/socket.service';
@Injectable()
export class DetailsMasterService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  /**
   * Изменить приоритет детали для определенного станка
   * @param partId - ID детали
   * @param machineId - ID станка
   * @param priority - Новый приоритет (большее значение = выше приоритет)
   */
  async updatePartPriorityForMachine(
    partId: number,
    machineId: number,
    priority: number,
  ) {
    // Проверяем существование детали
    const partExists = await this.prisma.part.findUnique({
      where: { partId },
    });

    if (!partExists) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    // Проверяем существование станка
    const machineExists = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machineExists) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Проверяем, существует ли уже назначение детали на станок
    const existingAssignment =
      await this.prisma.partMachineAssignment.findFirst({
        where: {
          partId,
          machineId,
        },
      });

    if (existingAssignment) {
      // Обновляем существующий приоритет
      const updatedAssignment = await this.prisma.partMachineAssignment.update({
        where: { assignmentId: existingAssignment.assignmentId },
        data: { priority },
        include: {
          part: true,
          machine: true,
        },
      });

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'detail:event',
        { status: 'updated' },
      );

      return {
        message: 'Приоритет детали для станка успешно обновлен',
        assignment: {
          assignmentId: updatedAssignment.assignmentId,
          partId: updatedAssignment.partId,
          partName: updatedAssignment.part.partName,
          partCode: updatedAssignment.part.partCode,
          machineId: updatedAssignment.machineId,
          machineName: updatedAssignment.machine.machineName,
          priority: updatedAssignment.priority,
        },
      };
    } else {
      // Создаем новое назначение с приоритетом
      const newAssignment = await this.prisma.partMachineAssignment.create({
        data: {
          partId,
          machineId,
          priority,
        },
        include: {
          part: true,
          machine: true,
        },
      });

      return {
        message: 'Приоритет детали для станка успешно установлен',
        assignment: {
          assignmentId: newAssignment.assignmentId,
          partId: newAssignment.partId,
          partName: newAssignment.part.partName,
          partCode: newAssignment.part.partCode,
          machineId: newAssignment.machineId,
          machineName: newAssignment.machine.machineName,
          priority: newAssignment.priority,
        },
      };
    }
  }

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

    // Проверяем существование участка (теперь ProductionStageLevel1)
    const segmentExists = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: segmentId },
      include: {
        productionStagesLevel2: true,
        routeStages: true,
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

    // Получаем ID подэтапов для текущего участка
    const currentSegmentSubstageIds = segmentExists.productionStagesLevel2.map(
      (s) => s.substageId,
    );

    // Получаем routeStageIds для текущего этапа
    const relevantRouteStages = await this.prisma.routeStage.findMany({
      where: {
        OR: [
          { stageId: segmentId },
          { substageId: { in: currentSegmentSubstageIds } },
        ],
      },
      select: {
        routeStageId: true,
      },
    });
    const currentSegmentRouteStageIds = relevantRouteStages.map(
      (rs) => rs.routeStageId,
    );

    // Находим все пакеты, связанные с заказом
    const packages = await this.prisma.package.findMany({
      where: { orderId },
      include: {
        composition: {
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
          },
        },
        productionPackageParts: {
          where: {
            part: {
              route: {
                routeStages: {
                  some: {
                    OR: [
                      { stageId: segmentId },
                      { substageId: { in: currentSegmentSubstageIds } },
                    ],
                  },
                },
              },
            },
          },
          include: {
            package: true,
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
                      select: {
                        assignmentId: true,
                        routeStageId: true,
                        completedAt: true,
                        machine: {
                          select: {
                            machineId: true,
                            machineName: true,
                          },
                        },
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

    // Фильтруем пакеты
    const filteredPackages = packages.filter(
      (pkg) => pkg.productionPackageParts.length > 0,
    );

    if (filteredPackages.length === 0) {
      return [];
    }

    const detailsMap = new Map();

    for (const packageItem of filteredPackages) {
      for (const packagePart of packageItem.productionPackageParts) {
        const part = packagePart.part;

        if (!detailsMap.has(part.partId)) {
          const route = part.route;
          const routeStages = route
            ? route.routeStages.map((stage) => ({
                routeStageId: stage.routeStageId,
                stageId: stage.stageId,
                substageId: stage.substageId,
                sequenceNumber: stage.sequenceNumber,
              }))
            : [];

          const currentSegmentStageIds = [segmentId];
          let previousStageIds: number[] = [];
          let isFirstSegment = false;

          if (routeStages.length > 0) {
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

              isFirstSegment = minSequence === 1;

              previousStageIds = routeStages
                .filter((stage) => Number(stage.sequenceNumber) < minSequence)
                .map((stage) => stage.stageId);
            }
          } else {
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
              isFirstSegment = true;
            }
          }

          const currentSubstage = route?.routeStages.find(
            (stage) => stage.stageId === segmentId && stage.substageId,
          )?.substage;

          let readyForProcessing = 0;
          let distributed = 0;
          let completed = 0;

          if (part.pallets.length === 0) {
            readyForProcessing = 0;
            distributed = 0;
            completed = 0;
          } else if (isFirstSegment) {
            let palletDistributed = 0;
            let palletCompleted = 0;

            for (const pallet of part.pallets) {
              const palletQuantity = Number(pallet.quantity);
              const currentSegmentProgress = pallet.palletStageProgress.filter(
                (progress) =>
                  currentSegmentStageIds.includes(
                    progress.routeStage.stageId,
                  ) ||
                  (progress.routeStage.substageId &&
                    currentSegmentSubstageIds.includes(
                      progress.routeStage.substageId,
                    )),
              );

              const currentMachineAssignments =
                pallet.machineAssignments.filter(
                  (assignment) =>
                    assignment.routeStageId &&
                    currentSegmentRouteStageIds.includes(
                      assignment.routeStageId,
                    ) &&
                    !assignment.completedAt,
                );

              const completedMachineAssignments =
                pallet.machineAssignments.filter(
                  (assignment) =>
                    assignment.routeStageId &&
                    currentSegmentRouteStageIds.includes(
                      assignment.routeStageId,
                    ) &&
                    assignment.completedAt,
                );

              if (currentSegmentProgress.length > 0) {
                const latestProgress = currentSegmentProgress[0];
                if (latestProgress.status === 'COMPLETED') {
                  palletCompleted += palletQuantity;
                } else {
                  palletDistributed += palletQuantity;
                }
              } else if (currentMachineAssignments.length > 0) {
                palletDistributed += palletQuantity;
              } else if (completedMachineAssignments.length > 0) {
                palletCompleted += palletQuantity;
              }
            }

            const totalOnPallets = part.pallets.reduce(
              (sum, pallet) => sum + Number(pallet.quantity),
              0,
            );
            readyForProcessing = Math.max(
              0,
              totalOnPallets - palletDistributed - palletCompleted,
            );
            distributed = palletDistributed;
            completed = palletCompleted;
          } else {
            for (const pallet of part.pallets) {
              const palletQuantity = Number(pallet.quantity);

              const currentSegmentProgress = pallet.palletStageProgress.filter(
                (progress) =>
                  currentSegmentStageIds.includes(
                    progress.routeStage.stageId,
                  ) ||
                  (progress.routeStage.substageId &&
                    currentSegmentSubstageIds.includes(
                      progress.routeStage.substageId,
                    )),
              );

              const previousStageProgress = pallet.palletStageProgress.filter(
                (progress) =>
                  previousStageIds.includes(progress.routeStage.stageId),
              );

              const isPreviousStagesCompleted =
                previousStageIds.length === 0 ||
                previousStageIds.every((stageId) =>
                  previousStageProgress.some(
                    (progress) =>
                      progress.routeStage.stageId === stageId &&
                      progress.status === 'COMPLETED',
                  ),
                );

              const currentMachineAssignments =
                pallet.machineAssignments.filter(
                  (assignment) =>
                    assignment.routeStageId &&
                    currentSegmentRouteStageIds.includes(
                      assignment.routeStageId,
                    ) &&
                    !assignment.completedAt,
                );

              const completedMachineAssignments =
                pallet.machineAssignments.filter(
                  (assignment) =>
                    assignment.routeStageId &&
                    currentSegmentRouteStageIds.includes(
                      assignment.routeStageId,
                    ) &&
                    assignment.completedAt,
                );

              const hasAnyMachineAssignments = pallet.machineAssignments.some(
                (assignment) =>
                  assignment.routeStageId &&
                  currentSegmentRouteStageIds.includes(
                    assignment.routeStageId,
                  ),
              );

              if (currentSegmentProgress.length > 0) {
                const latestProgress = currentSegmentProgress.sort(
                  (a, b) =>
                    (b.completedAt?.getTime() || 0) -
                    (a.completedAt?.getTime() || 0),
                )[0];

                if (latestProgress.status === 'COMPLETED') {
                  completed += palletQuantity;
                } else if (latestProgress.status === 'IN_PROGRESS') {
                  distributed += palletQuantity;
                } else if (
                  latestProgress.status === 'PENDING' ||
                  latestProgress.status === 'NOT_PROCESSED'
                ) {
                  if (currentMachineAssignments.length > 0) {
                    distributed += palletQuantity;
                  } else if (hasAnyMachineAssignments) {
                    // Не добавляем
                  } else if (isPreviousStagesCompleted) {
                    readyForProcessing += palletQuantity;
                  }
                }
              } else {
                if (currentMachineAssignments.length > 0) {
                  distributed += palletQuantity;
                } else if (completedMachineAssignments.length > 0) {
                  completed += palletQuantity;
                } else if (hasAnyMachineAssignments) {
                  // Не добавляем
                } else if (
                  isPreviousStagesCompleted &&
                  !hasAnyMachineAssignments
                ) {
                  readyForProcessing += palletQuantity;
                }
              }
            }
          }

          readyForProcessing = Math.min(
            readyForProcessing,
            Number(part.totalQuantity),
          );
          distributed = Math.min(distributed, Number(part.totalQuantity));
          completed = Math.min(completed, Number(part.totalQuantity));

          const compositionItem = packageItem.composition.find(
            (comp) => comp.partCode === part.partCode,
          );
          const materialName =
            compositionItem?.materialName ||
            part.material?.materialName ||
            'Не указан';

          detailsMap.set(part.partId, {
            id: part.partId,
            articleNumber: part.partCode,
            name: part.partName,
            material: materialName,
            size: part.size,
            totalQuantity: Number(part.totalQuantity),
            readyForProcessing,
            distributed,
            completed,
            packages: [
              {
                packageId: packageItem.packageId,
                packageCode: packageItem.packageCode,
                packageName: packageItem.packageName,
                quantity: Number(packagePart.quantity),
              },
            ],
            substage: currentSubstage
              ? {
                  substageId: currentSubstage.substageId,
                  substageName: currentSubstage.substageName,
                }
              : null,
          });
        } else {
          const currentDetail = detailsMap.get(part.partId);

          currentDetail.packages.push({
            packageId: packageItem.packageId,
            packageCode: packageItem.packageCode,
            packageName: packageItem.packageName,
            quantity: Number(packagePart.quantity),
          });

          detailsMap.set(part.partId, currentDetail);
        }
      }
    }

    return Array.from(detailsMap.values());
  }
}
