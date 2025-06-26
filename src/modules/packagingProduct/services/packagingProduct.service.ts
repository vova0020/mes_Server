import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';


@Injectable()
export class PackagingProductService {
  private readonly logger = new Logger(PackagingProductService.name);
  constructor(private readonly prisma: PrismaService) {}

  // Получение упаковок по ID заказа
  async getPackagesByOrderId(orderId: number) {
    this.logger.log(`Получен id заказа=${orderId}`);
    const packagesRaw = await this.prisma.package.findMany({
      where: { orderId },
      orderBy: { packageId: 'asc' },
      select: {
        packageId: true,
        orderId: true,
        packageCode: true,
        packageName: true,
        quantity: true,
        completionPercentage: true,
      },
    });

    // Преобразуем Decimal в number и форматируем данные
    // const packages = packagesRaw.map((pkg) => ({
    //   id: pkg.packageId,
    //   orderId: pkg.orderId,
    //   packageCode: pkg.packageCode,
    //   packageName: pkg.packageName,
    //   completionPercentage: pkg.completionPercentage.toNumber(),
    // }));

    // return packages;
    return packagesRaw.map((pkg) => ({
      id: pkg.packageId,
      orderId: pkg.orderId,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      quantity: pkg.quantity.toNumber(),
      completionPercentage: pkg.completionPercentage.toNumber(),
    }));
  }
}
