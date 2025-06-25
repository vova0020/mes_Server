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

    // Преобразуем Decimal в number и форматируем данные
    const packages = packagesRaw.map(pkg => ({
      id: pkg.packageId,
      orderId: pkg.orderId,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      completionPercentage: pkg.completionPercentage.toNumber(),
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
    }));

    return packages;
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

    // Преобразуем Decimal в number и форматируем данные
    const packages = packagesRaw.map(pkg => ({
      id: pkg.packageId,
      orderId: pkg.orderId,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      completionPercentage: pkg.completionPercentage.toNumber(),
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
    }));

    return {
      packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Получение упаковки по ID
  async getPackageById(packageId: number) {
    const packageRaw = await this.prisma.package.findUnique({
      where: { packageId },
      select: {
        packageId: true,
        orderId: true,
        packageCode: true,
        packageName: true,
        completionPercentage: true,
        order: {
          select: {
            orderName: true,
            batchNumber: true,
            isCompleted: true,
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
                status: true,
                totalQuantity: true,
              },
            },
          },
        },
      },
    });

    if (!packageRaw) {
      return null;
    }

    // Преобразуем Decimal в number и форматируем данные
    return {
      id: packageRaw.packageId,
      orderId: packageRaw.orderId,
      packageCode: packageRaw.packageCode,
      packageName: packageRaw.packageName,
      completionPercentage: packageRaw.completionPercentage.toNumber(),
      order: {
        orderName: packageRaw.order.orderName,
        batchNumber: packageRaw.order.batchNumber,
        isCompleted: packageRaw.order.isCompleted,
      },
      parts: packageRaw.productionPackageParts.map(ppp => ({
        partId: ppp.part.partId,
        partCode: ppp.part.partCode,
        partName: ppp.part.partName,
        status: ppp.part.status,
        totalQuantity: ppp.part.totalQuantity.toNumber(),
        requiredQuantity: ppp.quantity.toNumber(),
      })),
    };
  }
}