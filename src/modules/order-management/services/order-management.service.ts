import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  OrderStatus,
  UpdateOrderStatusDto,
  OrderListResponseDto,
  OrderDetailResponseDto,
  OrderStatusUpdateResponseDto,
} from '../dto/order-management.dto';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class OrderManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private socketService: SocketService,
  ) { }

  /**
   * Получить все заказы с базовой информацией
   */
  async getAllOrders(): Promise<OrderListResponseDto[]> {
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

    return orders.map((order) => this.mapOrderToListResponse(order));
  }

  /**
   * Получить детальную информацию о заказе по ID
   * Включает все упаковки и детали в них
   */
  async getOrderDetails(orderId: number): Promise<OrderDetailResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            productionPackageParts: {
              include: {
                part: true,
              },
            },
            composition: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    return this.mapOrderToDetailResponse(order);
  }

  /**
   * Изменить статус заказа
   * Поддерживает изменение на статус "разрешить к запуску"
   */
  async updateOrderStatus(
    orderId: number,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderStatusUpdateResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            composition: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    const currentStatus = order.status as OrderStatus;
    const newStatus = updateStatusDto.status;

    // Проверяем валидность перехода статуса
    this.validateStatusTransition(currentStatus, newStatus);

    // При переходе в LAUNCH_PERMITTED объединяем детали
    if (
      newStatus === OrderStatus.LAUNCH_PERMITTED &&
      !order.partsConsolidated
    ) {
      await this.consolidateParts(orderId);
    }

    // Обновляем статус заказа
    const updatedOrder = await this.prismaService.order.update({
      where: { orderId },
      data: {
        status: newStatus,
        launchPermission:
          newStatus === OrderStatus.LAUNCH_PERMITTED ||
          newStatus === OrderStatus.IN_PROGRESS,
        isCompleted: newStatus === OrderStatus.COMPLETED,
        completedAt:
          newStatus === OrderStatus.COMPLETED ? new Date() : undefined,
        partsConsolidated:
          newStatus === OrderStatus.LAUNCH_PERMITTED
            ? true
            : order.partsConsolidated,
      },
    });

    // Отправляем WebSocket уведомление о событии
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

    return {
      orderId,
      previousStatus: currentStatus,
      newStatus,
      launchPermission: updatedOrder.launchPermission,
      updatedAt: updatedOrder.updatedAt!.toISOString(),
    };
  }

  /**
   * Отложить заказ
   */
  async postponeOrder(orderId: number): Promise<OrderStatusUpdateResponseDto> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    const currentStatus = order.status as OrderStatus;

    // Можно отложить только предварительные и утвержденные заказы
    if (
      ![OrderStatus.PRELIMINARY, OrderStatus.APPROVED].includes(currentStatus)
    ) {
      throw new BadRequestException(
        `Нельзя отложить заказ со статусом ${currentStatus}`,
      );
    }

    const updatedOrder = await this.prismaService.order.update({
      where: { orderId },
      data: {
        status: OrderStatus.POSTPONED,
        launchPermission: false,
      },
    });

    // Отправляем WebSocket уведомление о событии
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

    return {
      orderId,
      previousStatus: currentStatus,
      newStatus: OrderStatus.POSTPONED,
      launchPermission: false,
      updatedAt: updatedOrder.updatedAt!.toISOString(),
    };
  }

  /**
   * Удалить заказ (только если детали не прошли этапы)
   */
  async deleteOrder(orderId: number): Promise<{ message: string }> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            productionPackageParts: {
              include: {
                part: {
                  include: {
                    partRouteProgress: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    // Проверяем, что детали не прошли этапы производства
    const hasProgressedParts = order.packages.some((pkg) =>
      pkg.productionPackageParts.some((ppp) =>
        ppp.part.partRouteProgress.some(
          (progress) =>
            progress.status === 'COMPLETED' ||
            progress.status === 'IN_PROGRESS',
        ),
      ),
    );

    if (hasProgressedParts) {
      throw new BadRequestException(
        'Нельзя удалить заказ, так как некоторые детали уже прошли этапы производства',
      );
    }

    await this.prismaService.order.delete({
      where: { orderId },
    });

    // Отправляем WebSocket уведомление о событии
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

    return { message: `Заказ ${orderId} успешно удален` };
  }

  /**
   * Проверка валидности перехода между статусами
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PRELIMINARY]: [OrderStatus.APPROVED, OrderStatus.POSTPONED],
      [OrderStatus.APPROVED]: [
        OrderStatus.LAUNCH_PERMITTED,
        OrderStatus.PRELIMINARY,
        OrderStatus.POSTPONED,
      ],
      [OrderStatus.LAUNCH_PERMITTED]: [
        OrderStatus.IN_PROGRESS,
        OrderStatus.APPROVED,
      ],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [], // Завершенный заказ нельзя изменить
      [OrderStatus.POSTPONED]: [OrderStatus.PRELIMINARY, OrderStatus.APPROVED], // Из отложенного можно вернуть
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Недопустимый переход статуса с ${currentStatus} на ${newStatus}`,
      );
    }
  }

  /**
   * Преобразование заказа в формат для списка заказов
   */
  private mapOrderToListResponse(order: any): OrderListResponseDto {
    const packagesCount = order.packages?.length || 0;
    const totalPartsCount =
      order.packages?.reduce((total: number, pkg: any) => {
        return total + (pkg.productionPackageParts?.length || 0);
      }, 0) || 0;

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
      packagesCount,
      totalPartsCount,
      priority: order.priority,
    };
  }

  /**
   * Объединение одинаковых деталей при запуске в производство
   */
  private async consolidateParts(orderId: number): Promise<void> {
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            composition: true,
          },
        },
      },
    });

    if (!order) return;

    // Группируем детали по коду и маршруту
    const consolidatedParts = new Map<
      string,
      {
        partCode: string;
        partName: string;
        partSize: string;
        routeId: number;
        thickness?: number;
        thicknessWithEdging?: number;
        finishedLength?: number;
        finishedWidth?: number;
        groove?: string;
        edgingNameL1: string; // Общее количество с учетом количества упаковок
        edgingNameL2: string; // Общее количество с учетом количества упаковок
        edgingNameW1: string; // Общее количество с учетом количества упаковок
        edgingNameW2: string; // Общее количество с учетом количества упаковок
        totalQuantity: number;
        packages: { packageId: number; quantity: number }[];
      }
    >();

    order.packages.forEach((pkg) => {
      pkg.composition.forEach((comp) => {
        const key = `${comp.partCode}_${comp.routeId}`;
        if (consolidatedParts.has(key)) {
          const existing = consolidatedParts.get(key)!;
          existing.totalQuantity += Number(comp.quantity);
          existing.packages.push({
            packageId: pkg.packageId,
            quantity: Number(comp.quantity),
          });
        } else {
          consolidatedParts.set(key, {
            partCode: comp.partCode,
            partName: comp.partName,
            partSize: comp.partSize,
            routeId: comp.routeId,
            thickness: comp.thickness ?? undefined,
            thicknessWithEdging: comp.thicknessWithEdging ?? undefined,
            finishedLength: comp.finishedLength ?? undefined,
            finishedWidth: comp.finishedWidth ?? undefined,
            groove: comp.groove ?? undefined,
            edgingNameL1: comp.edgingNameL1 ?? "", // Общее количество с учетом количества упаковок
            edgingNameL2: comp.edgingNameL2 ?? "", // Общее количество с учетом количества упаковок
            edgingNameW1: comp.edgingNameW1 ?? "", // Общее количество с учетом количества упаковок
            edgingNameW2: comp.edgingNameW2 ?? "", // Общее количество с учетом количества упаковок
            totalQuantity: Number(comp.quantity),
            packages: [
              { packageId: pkg.packageId, quantity: Number(comp.quantity) },
            ],
          });
        }
      });
    });

    // Создаем объединенные детали в таблице Part и связи с упаковками
    for (const [, partData] of consolidatedParts) {
      const newPart = await this.prismaService.part.create({
        data: {
          partCode: partData.partCode,
          partName: partData.partName,
          size: partData.partSize,
          totalQuantity: partData.totalQuantity,
          status: 'PENDING',
          routeId: partData.routeId,
          thickness: partData.thickness ?? undefined,
          thicknessWithEdging: partData.thicknessWithEdging ?? undefined,
          finishedLength: partData.finishedLength ?? undefined,
          finishedWidth: partData.finishedWidth ?? undefined,
          groove: partData.groove ?? undefined,
        },
      });

      // Создаем связи с упаковками
      for (const pkgInfo of partData.packages) {
        await this.prismaService.productionPackagePart.create({
          data: {
            packageId: pkgInfo.packageId,
            partId: newPart.partId,
            quantity: pkgInfo.quantity,
          },
        });
      }
    }
  }

  /**
   * Преобразование заказа в детальный формат с упаковками и деталями
   */
  private mapOrderToDetailResponse(order: any): OrderDetailResponseDto {
    return {
      order: {
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
        priority: order.priority,
      },
      packages:
        order.packages?.map((pkg: any) => ({
          packageId: pkg.packageId,
          packageCode: pkg.packageCode,
          packageName: pkg.packageName,
          quantity: Number(pkg.quantity),
          completionPercentage: Number(pkg.completionPercentage),
          // Всегда показываем исходный состав из композиции
          details:
            pkg.composition?.map((comp: any) => ({
              partId: comp.compositionId,
              partCode: comp.partCode,
              partName: comp.partName,
              totalQuantity: Number(comp.quantity),
              status: 'PENDING',
              size: comp.partSize,
              materialId: null,
            })) || [],
        })) || [],
    };
  }
}
