import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  ProductionOrderResponseDto,
  OrderStatus,
  PackageDirectoryResponseDto,
} from '../dto/production-order.dto';
import { EventsService } from '../../websocket/services/events.service';
import { WebSocketRooms } from '../../websocket/types/rooms.types';

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    createOrderDto: CreateProductionOrderDto,
  ): Promise<ProductionOrderResponseDto> {
    // Проверяем уникальность номера партии
    const existingOrder = await this.prismaService.order.findFirst({
      where: { batchNumber: createOrderDto.batchNumber },
    });

    if (existingOrder) {
      throw new ConflictException('Заказ с таким номером партии уже существует');
    }

    // Проверяем существование упаковок в справочнике и получаем их детали
    const packageDirectoryIds = createOrderDto.packages.map(
      (pkg) => pkg.packageDirectoryId,
    );
    const existingPackages = await this.prismaService.packageDirectory.findMany({
      where: { packageId: { in: packageDirectoryIds } },
      include: {
        packageDetails: {
          include: {
            detail: true,
          },
        },
      },
    });

    if (existingPackages.length !== packageDirectoryIds.length) {
      throw new NotFoundException(
        'Одна или несколько указанных упаковок не найдены в справочнике',
      );
    }

    // Проверяем, что у всех упаковок есть детали
    for (const pkg of existingPackages) {
      if (!pkg.packageDetails || pkg.packageDetails.length === 0) {
        throw new BadRequestException(
          `Упаковка "${pkg.packageName}" (ID: ${pkg.packageId}) не содержит деталей в справо��нике`,
        );
      }
    }

    // Создаем заказ в транзакции
    const order = await this.prismaService.$transaction(async (prisma) => {
      // Создаем заказ
      const newOrder = await prisma.order.create({
        data: {
          batchNumber: createOrderDto.batchNumber,
          orderName: createOrderDto.orderName,
          requiredDate: new Date(createOrderDto.requiredDate),
          status: createOrderDto.status || OrderStatus.PRELIMINARY,
          completionPercentage: 0,
          launchPermission: false,
          isCompleted: false,
        },
      });

      // Создаем упаковки и их детали
      for (const packageDto of createOrderDto.packages) {
        const packageDirectory = existingPackages.find(
          (pkg) => pkg.packageId === packageDto.packageDirectoryId,
        );

        if (!packageDirectory) {
          throw new NotFoundException(
            `Упаковка с ID ${packageDto.packageDirectoryId} не найдена`,
          );
        }

        // Создаем упаковку
        const newPackage = await prisma.package.create({
          data: {
            orderId: newOrder.orderId,
            packageCode: packageDirectory.packageCode,
            packageName: packageDirectory.packageName,
            quantity: packageDto.quantity,
            completionPercentage: 0,
          },
        });

        // Автоматически создаем детали из справочника упаковки
        for (const packageDetail of packageDirectory.packageDetails) {
          const detailDirectory = packageDetail.detail;

          // Рассчитываем общее количество: количество в справочнике * количество упаковок
          const totalQuantity = packageDetail.quantity * packageDto.quantity;

          // Создаем деталь в производстве
          const newPart = await prisma.part.create({
            data: {
              partCode: detailDirectory.partSku,
              partName: detailDirectory.partName,
              materialId: 1, // Временно используем ID 1, нужно будет связать с материалом из справочника
              size: `${detailDirectory.finishedLength || 0}x${detailDirectory.finishedWidth || 0}x${detailDirectory.thickness || 0}`,
              totalQuantity: totalQuantity,
              status: 'PENDING',
              routeId: packageDetail.routeId!, // Временно используем ID 1, нужно будет определить маршрут
            },
          });

          // Связываем деталь с упаковкой
          await prisma.productionPackagePart.create({
            data: {
              packageId: newPackage.packageId,
              partId: newPart.partId,
              quantity: packageDetail.quantity, // Количество деталей в одной упаковке (из справочника)
            },
          });
        }
      }

      return newOrder;
    });

    const newOrder = await this.findOne(order.orderId);

    // Отправляем событие о создании заказа
    this.eventsService.emitToRoom(
      WebSocketRooms.PRODUCTION_ORDERS || 'production-orders',
      'orderCreated',
      {
        order: newOrder,
        timestamp: new Date().toISOString(),
      },
    );

    return newOrder;
  }

  async findAll(): Promise<ProductionOrderResponseDto[]> {
    const orders = await this.prismaService.order.findMany({
      include: {
        packages: {
          include: {
            productionPackageParts: {
              include: {
                part: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrderToResponse(order));
  }

  async findOne(id: number): Promise<ProductionOrderResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId: id },
      include: {
        packages: {
          include: {
            productionPackageParts: {
              include: {
                part: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${id} не найден`);
    }

    return this.mapOrderToResponse(order);
  }

  async update(
    id: number,
    updateOrderDto: UpdateProductionOrderDto,
  ): Promise<ProductionOrderResponseDto> {
    const existingOrder = await this.prismaService.order.findUnique({
      where: { orderId: id },
      include: {
        packages: {
          include: {
            productionPackageParts: true,
          },
        },
      },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Заказ с ID ${id} не найден`);
    }

    // Проверяем, можно ли изменять заказ (например, если он не в работе)
    if (existingOrder.status === OrderStatus.IN_PROGRESS && updateOrderDto.packages) {
      throw new ConflictException(
        'Нельзя изменять упаковки заказа, который находится в работе',
      );
    }

    // Проверяем уникальность нового номера партии (если он изменяется)
    if (
      updateOrderDto.batchNumber &&
      updateOrderDto.batchNumber !== existingOrder.batchNumber
    ) {
      const duplicateOrder = await this.prismaService.order.findFirst({
        where: {
          batchNumber: updateOrderDto.batchNumber,
          orderId: { not: id },
        },
      });

      if (duplicateOrder) {
        throw new ConflictException(
          'Заказ с таким номером партии уже существует',
        );
      }
    }

    // Если указаны новые упаковки, проверяем их существование в справочнике
    let existingPackages: any[] = [];
    if (updateOrderDto.packages && updateOrderDto.packages.length > 0) {
      const packageDirectoryIds = updateOrderDto.packages.map(
        (pkg) => pkg.packageDirectoryId,
      );
      existingPackages = await this.prismaService.packageDirectory.findMany({
        where: { packageId: { in: packageDirectoryIds } },
        include: {
          packageDetails: {
            include: {
              detail: true,
            },
          },
        },
      });

      if (existingPackages.length !== packageDirectoryIds.length) {
        throw new NotFoundException(
          'Одна или несколько указанных упаковок не найдены в справочнике',
        );
      }

      // Проверяем, что у всех упаковок есть детали
      for (const pkg of existingPackages) {
        if (!pkg.packageDetails || pkg.packageDetails.length === 0) {
          throw new BadRequestException(
            `Упаковка "${pkg.packageName}" (ID: ${pkg.packageId}) не содержит деталей в справочнике`,
          );
        }
      }
    }

    // Обновляем заказ в транзакции
    await this.prismaService.$transaction(async (prisma) => {
      // Обновляем основные поля заказа
      await prisma.order.update({
        where: { orderId: id },
        data: {
          batchNumber: updateOrderDto.batchNumber,
          orderName: updateOrderDto.orderName,
          requiredDate: updateOrderDto.requiredDate
            ? new Date(updateOrderDto.requiredDate)
            : undefined,
          status: updateOrderDto.status,
          launchPermission: updateOrderDto.launchPermission,
          isCompleted: updateOrderDto.isCompleted,
          completedAt:
            updateOrderDto.isCompleted === true ? new Date() : undefined,
        },
      });

      // Если указаны новые упаковки, з��меняем существующие
      if (updateOrderDto.packages) {
        // Удаляем старые упаковки и их детали
        for (const pkg of existingOrder.packages) {
          // Удаляем связи упаковок с деталями
          await prisma.productionPackagePart.deleteMany({
            where: { packageId: pkg.packageId },
          });

          // Удаляем детали, созданные для этого заказа
          const partIds = pkg.productionPackageParts.map((ppp) => ppp.partId);
          if (partIds.length > 0) {
            await prisma.part.deleteMany({
              where: { partId: { in: partIds } },
            });
          }
        }

        // Удаляем упаковки
        await prisma.package.deleteMany({
          where: { orderId: id },
        });

        // Создаем новые упаковки и их детали
        for (const packageDto of updateOrderDto.packages) {
          const packageDirectory = existingPackages.find(
            (pkg) => pkg.packageId === packageDto.packageDirectoryId,
          );

          if (!packageDirectory) {
            throw new NotFoundException(
              `Упаковка с ID ${packageDto.packageDirectoryId} не найдена`,
            );
          }

          // Создаем упаковку
          const newPackage = await prisma.package.create({
            data: {
              orderId: id,
              packageCode: packageDirectory.packageCode,
              packageName: packageDirectory.packageName,
              quantity: packageDto.quantity,
              completionPercentage: 0,
            },
          });

          // Автоматически создаем детали из справочника упаковки
          for (const packageDetail of packageDirectory.packageDetails) {
            const detailDirectory = packageDetail.detail;

            // Рассчитываем общее количество: количество в справочнике * количество упаковок
            const totalQuantity = packageDetail.quantity * packageDto.quantity;

            // Создаем деталь в производстве
            const newPart = await prisma.part.create({
              data: {
                partCode: detailDirectory.partSku,
                partName: detailDirectory.partName,
                materialId: 1, // Временно используем ID 1, нужно будет связать с материалом из справочника
                size: `${detailDirectory.finishedLength || 0}x${detailDirectory.finishedWidth || 0}x${detailDirectory.thickness || 0}`,
                totalQuantity: totalQuantity,
                status: 'PENDING',
                routeId: 1, // Временно используем ID 1, нужно будет определить маршрут
              },
            });

            // Связываем деталь с упаковкой
            await prisma.productionPackagePart.create({
              data: {
                packageId: newPackage.packageId,
                partId: newPart.partId,
                quantity: packageDetail.quantity, // Количество деталей в одной упаковке (из справочника)
              },
            });
          }
        }
      }
    });

    const updatedOrder = await this.findOne(id);

    // Отправляем событие об обновлении заказа
    this.eventsService.emitToRoom(
      WebSocketRooms.PRODUCTION_ORDERS || 'production-orders',
      'orderUpdated',
      {
        order: updatedOrder,
        timestamp: new Date().toISOString(),
      },
    );

    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId: id },
      include: {
        packages: {
          include: {
            productionPackageParts: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${id} не найден`);
    }

    // Проверяем, можно ли удалить заказ (например, если он не в работе)
    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Нельзя удалить заказ, который находится в работе',
      );
    }

    // Удаляем заказ в транзакции
    await this.prismaService.$transaction(async (prisma) => {
      // Удаляем связи упаковок с деталями
      for (const pkg of order.packages) {
        await prisma.productionPackagePart.deleteMany({
          where: { packageId: pkg.packageId },
        });

        // Удаляем детали, созданные для этого заказа
        const partIds = pkg.productionPackageParts.map((ppp) => ppp.partId);
        if (partIds.length > 0) {
          await prisma.part.deleteMany({
            where: { partId: { in: partIds } },
          });
        }
      }

      // Удаляем упаковки
      await prisma.package.deleteMany({
        where: { orderId: id },
      });

      // Удаляем заказ
      await prisma.order.delete({
        where: { orderId: id },
      });
    });

    // Отправляем событие об удалении заказа
    this.eventsService.emitToRoom(
      WebSocketRooms.PRODUCTION_ORDERS || 'production-orders',
      'orderDeleted',
      {
        orderId: id,
        batchNumber: order.batchNumber,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async updateStatus(id: number, status: OrderStatus): Promise<ProductionOrderResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId: id },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${id} не найден`);
    }

    // Проверяем валидность перехода статуса
    this.validateStatusTransition(order.status as OrderStatus, status);

    await this.prismaService.order.update({
      where: { orderId: id },
      data: {
        status,
        launchPermission: status === OrderStatus.LAUNCH_PERMITTED || status === OrderStatus.IN_PROGRESS,
        isCompleted: status === OrderStatus.COMPLETED,
        completedAt: status === OrderStatus.COMPLETED ? new Date() : undefined,
      },
    });

    const updatedOrder = await this.findOne(id);

    // Отправляем событие об изменении статуса
    this.eventsService.emitToRoom(
      WebSocketRooms.PRODUCTION_ORDERS || 'production-orders',
      'orderStatusChanged',
      {
        order: updatedOrder,
        previousStatus: order.status,
        newStatus: status,
        timestamp: new Date().toISOString(),
      },
    );

    return updatedOrder;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PRELIMINARY]: [OrderStatus.APPROVED],
      [OrderStatus.APPROVED]: [OrderStatus.LAUNCH_PERMITTED, OrderStatus.PRELIMINARY],
      [OrderStatus.LAUNCH_PERMITTED]: [OrderStatus.IN_PROGRESS, OrderStatus.APPROVED],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [], // Завершенный заказ нельзя изменить
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Недопустимый переход статуса с ${currentStatus} на ${newStatus}`,
      );
    }
  }

  // Метод для получения списка упаковок из справочника
  async getPackageDirectory(): Promise<PackageDirectoryResponseDto[]> {
    const packages = await this.prismaService.packageDirectory.findMany({
      include: {
        packageDetails: {
          include: {
            detail: true,
          },
        },
      },
      orderBy: { packageCode: 'asc' },
    });

    return packages.map((pkg) => ({
      packageId: pkg.packageId,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      detailsCount: pkg.packageDetails.length,
      details: pkg.packageDetails.map((detail) => ({
        detailId: detail.detail.id,
        partSku: detail.detail.partSku,
        partName: detail.detail.partName,
        quantity: detail.quantity,
      })),
    }));
  }

  private mapOrderToResponse(order: any): ProductionOrderResponseDto {
    return {
      orderId: order.orderId,
      batchNumber: order.batchNumber,
      orderName: order.orderName,
      completionPercentage: Number(order.completionPercentage),
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString(),
      requiredDate: order.requiredDate.toISOString(),
      status: order.status as OrderStatus,
      launchPermission: order.launchPermission,
      isCompleted: order.isCompleted,
      packages: order.packages?.map((pkg: any) => ({
        packageId: pkg.packageId,
        packageCode: pkg.packageCode,
        packageName: pkg.packageName,
        completionPercentage: Number(pkg.completionPercentage),
        quantity: Number(pkg.quantity),
        details: pkg.productionPackageParts?.map((ppp: any) => ({
          partId: ppp.part.partId,
          partCode: ppp.part.partCode,
          partName: ppp.part.partName,
          quantity: Number(ppp.part.totalQuantity), // Показываем общее количество деталей
        })),
      })),
    };
  }
}