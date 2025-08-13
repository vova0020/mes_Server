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
      select: { isCompleted: true, status: true }
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
        const { readyForPackaging, assembled } =
          await this.calculatePackageStatistics(
            pkg.packageId,
            pkg.productionPackageParts,
            totalQuantity,
          );

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
        const { readyForPackaging, assembled } =
          await this.calculatePackageStatistics(
            pkg.packageId,
            pkg.productionPackageParts,
            totalQuantity,
          );

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
  ) {
    let minReadyPackages = Infinity;
    
    // Подсчитываем сколько упаковок можно собрать на основе готовых деталей
    for (const packagePart of packageParts) {
      const partId = packagePart.part.partId;
      const requiredPerPackage = packagePart.quantity.toNumber();

      // Получаем количество готовых деталей (со статусом COMPLETED или AWAITING_PACKAGING)
      const readyPallets = await this.prisma.pallet.findMany({
        where: {
          partId,
          part: {
            status: {
              in: ['COMPLETED', 'AWAITING_PACKAGING']
            }
          }
        },
        select: {
          quantity: true
        }
      });

      const totalReadyQuantity = readyPallets.reduce(
        (sum, pallet) => sum + pallet.quantity.toNumber(),
        0
      );

      const possiblePackages = Math.floor(totalReadyQuantity / requiredPerPackage);
      minReadyPackages = Math.min(minReadyPackages, possiblePackages);
    }

    const readyForPackaging = minReadyPackages === Infinity ? 0 : minReadyPackages;

    // Подсчитываем сколько упаковок реально скомплектовано (изъято из буфера)
    let assembled = 0;
    
    // Проверяем для каждой детали в упаковке, сколько поддонов назначено
    for (const packagePart of packageParts) {
      const partId = packagePart.part.partId;
      const requiredPerPackage = packagePart.quantity.toNumber();

      // Получаем назначенные поддоны для этой детали в данной упаковке
      const assignedPallets = await this.prisma.palletPackageAssignment.findMany({
        where: {
          packageId,
          pallet: {
            partId
          }
        },
        select: {
          quantity: true
        }
      });

      const totalAssignedQuantity = assignedPallets.reduce(
        (sum, assignment) => sum + assignment.quantity.toNumber(),
        0
      );

      const assembledForThisPart = Math.floor(totalAssignedQuantity / requiredPerPackage);
      
      // Минимальное количество среди всех деталей определяет количество собранных упаковок
      if (assembled === 0) {
        assembled = assembledForThisPart;
      } else {
        assembled = Math.min(assembled, assembledForThisPart);
      }
    }

    return {
      readyForPackaging,
      assembled
    };
  }

  // Получение статистики упаковочных задач
  private async getPackingStatistics(packageId: number) {
    // Получаем количество распределенных задач упаковки
    const distributedTasks = await this.prisma.packingTask.count({
      where: {
        packageId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED']
        }
      }
    });

    // Получаем количество завершенных упаковок (по статусу COMPLETED)
    const packageData = await this.prisma.package.findUnique({
      where: { packageId },
      select: { packingStatus: true }
    });

    const completed = packageData?.packingStatus === 'COMPLETED' ? 1 : 0;

    return {
      distributed: distributedTasks,
      completed
    };
  }
}