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
import { EventsService } from '../../websocket/services/events.service';
import { WebSocketRooms } from '../../websocket/types/rooms.types';

@Injectable()
export class OrderManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

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
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    const currentStatus = order.status as OrderStatus;
    const newStatus = updateStatusDto.status;

    // Проверяем валидность перехода статуса
    this.validateStatusTransition(currentStatus, newStatus);

    // Обновляем статус заказа
    const updatedOrder = await this.prismaService.order.update({
      where: { orderId },
      data: {
        status: newStatus,
        launchPermission: newStatus === OrderStatus.LAUNCH_PERMITTED || newStatus === OrderStatus.IN_PROGRESS,
        isCompleted: newStatus === OrderStatus.COMPLETED,
        completedAt: newStatus === OrderStatus.COMPLETED ? new Date() : undefined,
      },
    });

    // Отправляем событие об изменении статуса через WebSocket
    this.eventsService.emitToRoom(
      WebSocketRooms.ORDER_MANAGEMENT || 'order-management',
      'orderStatusChanged',
      {
        orderId,
        previousStatus: currentStatus,
        newStatus,
        launchPermission: updatedOrder.launchPermission,
        timestamp: new Date().toISOString(),
      },
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
   * Проверка валидности перехода между статусами
   */
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

  /**
   * Преобразование заказа в форм��т для списка заказов
   */
  private mapOrderToListResponse(order: any): OrderListResponseDto {
    const packagesCount = order.packages?.length || 0;
    const totalPartsCount = order.packages?.reduce((total: number, pkg: any) => {
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
    };
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
      },
      packages: order.packages?.map((pkg: any) => ({
        packageId: pkg.packageId,
        packageCode: pkg.packageCode,
        packageName: pkg.packageName,
        quantity: Number(pkg.quantity),
        completionPercentage: Number(pkg.completionPercentage),
        details: pkg.productionPackageParts?.map((ppp: any) => ({
          partId: ppp.part.partId,
          partCode: ppp.part.partCode,
          partName: ppp.part.partName,
          totalQuantity: Number(ppp.part.totalQuantity),
          status: ppp.part.status,
          size: ppp.part.size,
          materialId: ppp.part.materialId,
        })) || [],
      })) || [],
    };
  }
}