import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PackageQueryDto } from '../dto/package-query.dto';

@Injectable()
export class PackagingService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение упаковок по ID заказа
  async getPackagesByOrderId(orderId: number) {
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
              },
            },
          },
        },
      },
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
        const totalQuantityInPackage = pkg.quantity.toNumber();
        const readyForPackaging = totalQuantityInPackage; // пока всегда ставим количество в упаковке
        const assembled = totalQuantityInPackage; // то же самое что ReadyForPackaging
        
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
          parts: pkg.productionPackageParts.map(ppp => ({
            partId: ppp.part.partId,
            partCode: ppp.part.partCode,
            partName: ppp.part.partName,
            quantity: ppp.quantity.toNumber(),
          })),
          // Расчетные переменные
          readyForPackaging,
          assembled,
          distributed: packingStats.distributed,
          packaged: packingStats.packaged,
          // Добавляем задачи упаковки
          tasks: tasks.map(task => ({
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
            assignedUser: task.assignedUser ? {
              userId: task.assignedUser.userId,
              login: task.assignedUser.login,
              userDetail: task.assignedUser.userDetail ? {
                firstName: task.assignedUser.userDetail.firstName,
                lastName: task.assignedUser.userDetail.lastName,
              } : null,
            } : null,
          })),
        };
      })
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
        const totalQuantityInPackage = pkg.quantity.toNumber();
        const readyForPackaging = totalQuantityInPackage; // пока всегда ставим количество в упаковке
        const assembled = totalQuantityInPackage; // ��о же самое что ReadyForPackaging
        
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
          parts: pkg.productionPackageParts.map(ppp => ({
            partId: ppp.part.partId,
            partCode: ppp.part.partCode,
            partName: ppp.part.partName,
            quantity: ppp.quantity.toNumber(),
          })),
          // Расчетные переменные
          readyForPackaging,
          assembled,
          distributed: packingStats.distributed,
          packaged: packingStats.packaged,
          // Добавляем задачи упаковки
          tasks: tasks.map(task => ({
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
            assignedUser: task.assignedUser ? {
              userId: task.assignedUser.userId,
              login: task.assignedUser.login,
              userDetail: task.assignedUser.userDetail ? {
                firstName: task.assignedUser.userDetail.firstName,
                lastName: task.assignedUser.userDetail.lastName,
              } : null,
            } : null,
          })),
        };
      })
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

  // Вспомогательный метод для расчета статистики упаковки
  private async getPackingStatistics(packageId: number) {
    // Получаем задачи упаковки для данной производственной упаковки
    const packingTasks = await this.prisma.packingTask.findMany({
      where: {
        packageId: packageId,
      },
    });

    let distributed = 0;
    let packaged = 0;

    for (const task of packingTasks) {
      // Distributed: сумма количества упаковок, распределенных на станок
      if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
        distributed += 1; // считаем количество задач в работе
      }
      
      // Packaged: сумма количества выполненных заданий упаковки
      if (task.status === 'COMPLETED') {
        packaged += 1;
      }
    }

    return {
      distributed,
      packaged,
    };
  }
}