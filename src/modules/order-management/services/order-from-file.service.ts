import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { SaveOrderFromFileDto } from '../dto/order-from-file.dto';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class OrderFromFileService {
  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  async saveOrder(dto: SaveOrderFromFileDto) {
    // Проверяем, что все упаковки существуют в базе
    const missingPackages: string[] = [];
    const packageMap = new Map<string, any>();

    for (const pkg of dto.packages) {
      const existingPackage = await this.prisma.packageDirectory.findUnique({
        where: { packageCode: pkg.code },
        include: {
          packageDetails: {
            include: {
              detail: true,
              route: true,
            },
          },
        },
      });

      if (!existingPackage) {
        missingPackages.push(pkg.code);
      } else {
        packageMap.set(pkg.code, {
          ...existingPackage,
          requestedQuantity: pkg.quantity,
        });
      }
    }

    if (missingPackages.length > 0) {
      throw new BadRequestException(
        `Следующие упаковки не найдены в базе: ${missingPackages.join(', ')}`,
      );
    }

    // Создаем заказ
    const order = await this.prisma.order.create({
      data: {
        batchNumber: dto.batchNumber,
        orderName: dto.orderName,
        requiredDate: new Date(dto.requiredDate),
        completionPercentage: 0,
        launchPermission: false,
        isCompleted: false,
        status: 'PRELIMINARY',
        priority: 0,
      },
    });

    // Создаем упаковки и их состав
    for (const pkgDto of dto.packages) {
      const packageData = packageMap.get(pkgDto.code);

      // Создаем упаковку в заказе
      const orderPackage = await this.prisma.package.create({
        data: {
          orderId: order.orderId,
          packageCode: packageData.packageCode,
          packageName: packageData.packageName,
          quantity: pkgDto.quantity,
          completionPercentage: 0,
        },
      });

      // Создаем состав упаковки (composition) на основе деталей из справочника
      for (const detail of packageData.packageDetails) {
        if (!detail.routeId) {
          throw new BadRequestException(
            `У детали ${detail.detail.partSku} в упаковке ${packageData.packageCode} не указан маршрут`,
          );
        }

        const totalQuantity = Number(detail.quantity) * pkgDto.quantity;

        await this.prisma.packageComposition.create({
          data: {
            packageId: orderPackage.packageId,
            partCode: detail.detail.partSku,
            partName: detail.detail.partName,
            partSize: `${detail.detail.finishedLength || 0}x${detail.detail.finishedWidth || 0}`,
            routeId: detail.routeId,
            thickness: detail.detail.thickness ?? undefined,
            thicknessWithEdging: detail.detail.thicknessWithEdging ?? undefined,
            finishedLength: detail.detail.finishedLength ?? undefined,
            finishedWidth: detail.detail.finishedWidth ?? undefined,
            groove: detail.detail.groove ?? undefined,
            edgingNameL1: detail.detail.edgingNameL1 ?? null,
            edgingNameL2: detail.detail.edgingNameL2 ?? null,
            edgingNameW1: detail.detail.edgingNameW1 ?? null,
            edgingNameW2: detail.detail.edgingNameW2 ?? null,
            quantity: totalQuantity,
            quantityPerPackage: Number(detail.quantity),
            materialName: detail.detail.materialName,
            materialSku: detail.detail.materialSku,
          },
        });
      }
    }

    // Отправляем WebSocket уведомление
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'order:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );

    return {
      message: 'Заказ успешно создан',
      orderId: order.orderId,
      batchNumber: order.batchNumber,
      packagesCount: dto.packages.length,
    };
  }
}
