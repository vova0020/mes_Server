import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PackageQueryDto } from '../dto/package-query.dto';

@Injectable()
export class PackagingService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение упаковок по ID заказа
  async getPackagesByOrderId(orderId: number) {
    // Проверяем статус заказа - не показываем завершенные заказы
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      select: { isCompleted: true, status: true },
    });

    if (!order || order.isCompleted || order.status === 'COMPLETED') {
      return [];
    }

    const packagesRaw = await this.prisma.package.findMany({
      where: { orderId },
      orderBy: { packageId: 'asc' },
      select: {
        packageId: true,
        orderId: true,
        packageCode: true,
        packageName: true,
        completionPercentage: true,
        quantity: true,
        packingStatus: true,
        packingAssignedAt: true,
        packingCompletedAt: true,
        order: {
          select: {
            orderName: true,
            batchNumber: true,
          },
        },
        productionPackageParts: {
          select: {
            quantity: true,
            part: {
              select: {
                partId: true,
                partCode: true,
                partName: true,
                route: {
                  select: {
                    routeStages: {
                      select: {
                        routeStageId: true,
                        sequenceNumber: true,
                        stage: {
                          select: {
                            finalStage: true,
                          },
                        },
                      },
                      orderBy: { sequenceNumber: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const packagesWithStats = await Promise.all(
      packagesRaw.map(async (pkg) => {
        const packingStats = await this.getPackingStatistics(pkg.packageId);

        const tasks = await this.prisma.packingTask.findMany({
          where: { packageId: pkg.packageId },
          include: {
            machine: true,
            assignedUser: {
              include: {
                userDetail: true,
              },
            },
          },
        });

        // Рассчитываем переменные
        const totalQuantity = pkg.quantity.toNumber();
        const { baseReadyForPackaging, assembled } =
          await this.calculatePackageStatistics(
            pkg.packageId,
            pkg.productionPackageParts,
            totalQuantity,
            pkg.orderId,
          );
        
        const readyForPackaging = Math.max(0, baseReadyForPackaging - packingStats.distributed);

        return {
          id: pkg.packageId,
          orderId: pkg.orderId,
          packageCode: pkg.packageCode,
          packageName: pkg.packageName,
          completionPercentage: pkg.completionPercentage.toNumber(),
          packingStatus: pkg.packingStatus,
          packingAssignedAt: pkg.packingAssignedAt,
          packingCompletedAt: pkg.packingCompletedAt,
          order: {
            orderName: pkg.order.orderName,
            batchNumber: pkg.order.batchNumber,
          },
          parts: pkg.productionPackageParts.map((ppp) => ({
            partId: ppp.part.partId,
            partCode: ppp.part.partCode,
            partName: ppp.part.partName,
            quantity: ppp.quantity.toNumber(),
          })),
          // Расчетные переменные
          totalQuantity,
          readyForPackaging,
          distributed: packingStats.distributed,
          assembled,
          completed: packingStats.completed,
          available: totalQuantity - packingStats.completed,
          tasks: tasks.map((task) => ({
            taskId: task.taskId,
            status: task.status,
            priority: task.priority.toNumber(),
            assignedAt: task.assignedAt,
            completedAt: task.completedAt,
            machine: {
              machineId: task.machine.machineId,
              machineName: task.machine.machineName,
              status: task.machine.status,
            },
            assignedUser: task.assignedUser
              ? {
                  userId: task.assignedUser.userId,
                  login: task.assignedUser.login,
                  userDetail: task.assignedUser.userDetail
                    ? {
                        firstName: task.assignedUser.userDetail.firstName,
                        lastName: task.assignedUser.userDetail.lastName,
                      }
                    : null,
                }
              : null,
          })),
        };
      }),
    );

    return packagesWithStats;
  }

  // Получение всех упаковок с фильтрами
  async getPackages(query: PackageQueryDto) {
    const { orderId, page = 1, limit = 10 } = query;

    let whereClause = {};
    if (orderId) {
      whereClause = { orderId };
    }

    const packagesRaw = await this.prisma.package.findMany({
      where: whereClause,
      orderBy: { packageId: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        packageId: true,
        orderId: true,
        packageCode: true,
        packageName: true,
        completionPercentage: true,
        quantity: true,
        packingStatus: true,
        packingAssignedAt: true,
        packingCompletedAt: true,
        order: {
          select: {
            orderName: true,
            batchNumber: true,
          },
        },
        productionPackageParts: {
          select: {
            quantity: true,
            part: {
              select: {
                partId: true,
                partCode: true,
                partName: true,
              },
            },
          },
        },
      },
    });

    // Получаем общее количество для пагинации
    const total = await this.prisma.package.count({
      where: whereClause,
    });

    // Получаем статистику по упаковочным задачам для каждой упаковки
    const packagesWithStats = await Promise.all(
      packagesRaw.map(async (pkg) => {
        const packingStats = await this.getPackingStatistics(pkg.packageId);

        // Получаем задачи упаковки для данной упаковки
        const tasks = await this.prisma.packingTask.findMany({
          where: { packageId: pkg.packageId },
          include: {
            machine: true,
            assignedUser: {
              include: {
                userDetail: true,
              },
            },
          },
        });

        // Рассчитываем переменные
        const totalQuantity = pkg.quantity.toNumber();
        const { baseReadyForPackaging, assembled } =
          await this.calculatePackageStatistics(
            pkg.packageId,
            pkg.productionPackageParts,
            totalQuantity,
            pkg.orderId,
          );
        
        const readyForPackaging = Math.max(0, baseReadyForPackaging - packingStats.distributed);

        return {
          id: pkg.packageId,
          orderId: pkg.orderId,
          packageCode: pkg.packageCode,
          packageName: pkg.packageName,
          completionPercentage: pkg.completionPercentage.toNumber(),
          // Новые поля статуса упаковки
          packingStatus: pkg.packingStatus,
          packingAssignedAt: pkg.packingAssignedAt,
          packingCompletedAt: pkg.packingCompletedAt,
          order: {
            orderName: pkg.order.orderName,
            batchNumber: pkg.order.batchNumber,
          },
          parts: pkg.productionPackageParts.map((ppp) => ({
            partId: ppp.part.partId,
            partCode: ppp.part.partCode,
            partName: ppp.part.partName,
            quantity: ppp.quantity.toNumber(),
          })),
          // Расчетные переменные
          readyForPackaging,
          assembled,
          distributed: packingStats.distributed,
          completed: packingStats.completed,
          available: totalQuantity - packingStats.completed,
          // Добавляем задачи упаковки
          tasks: tasks.map((task) => ({
            taskId: task.taskId,
            status: task.status,
            priority: task.priority.toNumber(),
            assignedAt: task.assignedAt,
            completedAt: task.completedAt,
            machine: {
              machineId: task.machine.machineId,
              machineName: task.machine.machineName,
              status: task.machine.status,
            },
            assignedUser: task.assignedUser
              ? {
                  userId: task.assignedUser.userId,
                  login: task.assignedUser.login,
                  userDetail: task.assignedUser.userDetail
                    ? {
                        firstName: task.assignedUser.userDetail.firstName,
                        lastName: task.assignedUser.userDetail.lastName,
                      }
                    : null,
                }
              : null,
          })),
        };
      }),
    );

    return {
      packages: packagesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Расчет статистики для конкретной упаковки
  private async calculatePackageStatistics(
    packageId: number,
    packageParts: any[],
    totalPackages: number,
    orderId: number,
  ) {
    // Получаем состав упаковки из package_composition
    const composition = await this.prisma.packageComposition.findMany({
      where: { packageId },
      include: {
        route: {
          include: {
            routeStages: {
              include: {
                stage: true
              },
              orderBy: { sequenceNumber: 'asc' }
            }
          }
        }
      }
    });

    let minReadyPackages = Infinity;

    // Подсчитываем сколько упаковок готово к упаковке
    for (const comp of composition) {
      const totalRequired = comp.quantity.toNumber();
      const requiredPerPackage = totalRequired / totalPackages;
      const route = comp.route;

      // Находим финальный этап маршрута (не упаковочный)
      const nonFinalStages = route.routeStages.filter(
        (rs) => !rs.stage.finalStage,
      );
      const lastNonFinalStage = nonFinalStages[nonFinalStages.length - 1];

      if (!lastNonFinalStage) continue;

      // Получаем поддоны по partCode, которые завершили ВСЕ этапы маршрута
      const allNonFinalStageIds = nonFinalStages.map(rs => rs.routeStageId);
      
      const completedPallets = await this.prisma.pallet.findMany({
        where: {
          part: {
            partCode: comp.partCode,
            productionPackageParts: {
              some: {
                package: {
                  orderId
                }
              }
            }
          },
          // Проверяем, что поддон завершил ВСЕ не-финальные этапы
          palletStageProgress: {
            every: {
              OR: [
                {
                  routeStageId: { notIn: allNonFinalStageIds }
                },
                {
                  AND: [
                    { routeStageId: { in: allNonFinalStageIds } },
                    { status: 'COMPLETED' }
                  ]
                }
              ]
            }
          }
        },
        include: {
          palletStageProgress: {
            where: {
              routeStageId: { in: allNonFinalStageIds }
            }
          }
        }
      });
      
      // Фильтруем поддоны, которые действительно завершили все этапы
      const fullyCompletedPallets = completedPallets.filter(pallet => {
        const completedStages = pallet.palletStageProgress
          .filter(progress => progress.status === 'COMPLETED')
          .map(progress => progress.routeStageId);
        
        return allNonFinalStageIds.every(stageId => 
          completedStages.includes(stageId)
        );
      });

      const totalCompletedQuantity = fullyCompletedPallets.reduce(
        (sum, pallet) => sum + pallet.quantity.toNumber(),
        0,
      );

      const possiblePackages = Math.floor(totalCompletedQuantity / requiredPerPackage);
      minReadyPackages = Math.min(minReadyPackages, possiblePackages);
    }

    let baseReadyForPackaging = minReadyPackages === Infinity ? 0 : Math.min(minReadyPackages, totalPackages);

    // Подсчитываем сколько упаковок реально скомплектовано
    let minAssembledPackages = Infinity;

    for (const comp of composition) {
      const totalRequired = comp.quantity.toNumber();
      const requiredPerPackage = totalRequired / totalPackages;

      // Получаем назначенные поддоны для этой детали в данной упаковке
      const assignedPallets = await this.prisma.palletPackageAssignment.findMany({
        where: {
          packageId,
          pallet: {
            part: {
              partCode: comp.partCode
            }
          }
        },
        select: {
          quantity: true
        }
      });

      const totalAssignedQuantity = assignedPallets.reduce(
        (sum, assignment) => sum + assignment.quantity.toNumber(),
        0,
      );

      const assembledForThisPart = Math.floor(
        totalAssignedQuantity / requiredPerPackage,
      );
      minAssembledPackages = Math.min(
        minAssembledPackages,
        assembledForThisPart,
      );
    }

    const assembled =
      minAssembledPackages === Infinity ? 0 : minAssembledPackages;

    return {
      baseReadyForPackaging,
      assembled,
    };
  }

  // Получение статистики упаковочных задач
  private async getPackingStatistics(packageId: number) {
    // Получаем все задачи упаковки для данной упаковки
    const packingTasks = await this.prisma.packingTask.findMany({
      where: { packageId },
      select: {
        assignedQuantity: true,
        completedQuantity: true,
        status: true,
      },
    });

    // Считаем распределенное количество как назначенное минус выполненное
    const distributed = packingTasks.reduce(
      (sum, task) => sum + (task.assignedQuantity.toNumber() - task.completedQuantity.toNumber()),
      0,
    );

    // Считаем выполненное количество как сумму всех выполненных
    const completed = packingTasks.reduce(
      (sum, task) => sum + task.completedQuantity.toNumber(),
      0,
    );

    return {
      distributed,
      completed,
    };
  }
}