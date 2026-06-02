import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class CustomOrderStatisticsService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  async getAllOrders() {
    const orders = await this.prisma.customOrder.findMany({
      include: {
        customParts: {
          include: {
            route: {
              include: {
                routeStages: {
                  include: { stage: true },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
            customPalletParts: {
              include: {
                customPallet: true,
                stageProgress: {
                  include: { routeStage: { include: { stage: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      customOrderId: order.customOrderId,
      orderNumber: `${order.orderNumber} - ${order.orderName}`,
      orderName: order.orderName,
      status: order.status,
      completionPercentage: order.completionPercentage,
      // TODO: Рассчитать реальные значения прогресса
      productionProgress: 0,
      packingProgress: 0,
      createdAt: order.createdAt,
      requiredDate: order.requiredDate,
    }));
  }

  async getOrderById(customOrderId: number) {
    const order = await this.prisma.customOrder.findUnique({
      where: { customOrderId },
      include: {
        customParts: {
          include: {
            route: {
              include: {
                routeStages: {
                  include: { stage: true },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
            customPalletParts: {
              include: {
                customPallet: {
                  select: {
                    customPalletId: true,
                    palletName: true,
                    isActive: true,
                  },
                },
                stageProgress: {
                  include: { routeStage: { include: { stage: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Заказ с ID ${customOrderId} не найден`,
      );
    }

    // Формируем список деталей с информацией о поддонах и этапах
    const parts = order.customParts.map((part) => {
      // Группируем поддоны по деталям
      const pallets = part.customPalletParts.map((cpp) => ({
        palletId: cpp.customPallet.customPalletId,
        palletName: cpp.customPallet.palletName,
        quantity: cpp.quantity.toNumber(),
        stages: part.route.routeStages.map((rs) => {
          // Находим прогресс для этого этапа на этом поддоне
          const progress = cpp.stageProgress.find(
            (p) => p.routeStageId === rs.routeStageId,
          );

          let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' =
            'NOT_STARTED';

          if (progress) {
            if (progress.status === 'COMPLETED') {
              status = 'COMPLETED';
            } else if (progress.status === 'IN_PROGRESS') {
              status = 'IN_PROGRESS';
            }
          }

          return {
            routeStageId: rs.routeStageId,
            stageName: rs.stage.stageName,
            sequenceNumber: rs.sequenceNumber.toNumber(),
            status,
          };
        }),
      }));

      // Рассчитываем процент выполнения по этапам
      const stages = part.route.routeStages.map((rs) => {
        // TODO: Рассчитать реальный процент выполнения
        const completionPercentage = 0;

        return {
          routeStageId: rs.routeStageId,
          stageName: rs.stage.stageName,
          sequenceNumber: rs.sequenceNumber.toNumber(),
          completionPercentage,
          finalStage: rs.stage.finalStage,
        };
      });

      return {
        customPartId: part.customPartId,
        partCode: part.partCode,
        partName: part.partName,
        totalQuantity: part.quantity.toNumber(),
        pallets,
        stages,
        // TODO: Рассчитать реальные значения отбраковки и возврата
        totalDefected: 0,
        totalReturned: 0,
      };
    });

    return {
      customOrderId: order.customOrderId,
      orderNumber: order.orderNumber,
      orderName: order.orderName,
      status: order.status,
      completionPercentage: order.completionPercentage,
      // TODO: Рассчитать реальные значения прогресса
      productionProgress: 0,
      packingProgress: 0,
      parts,
    };
  }

  async forceCompleteOrder(customOrderId: number) {
    const order = await this.prisma.customOrder.findUnique({
      where: { customOrderId },
    });

    if (!order) {
      throw new NotFoundException(
        `Заказ с ID ${customOrderId} не найден`,
      );
    }

    // Принудительно переводим заказ в статус COMPLETED
    const updatedOrder = await this.prisma.customOrder.update({
      where: { customOrderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Отправляем WebSocket уведомление во все комнаты
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:director',
      ],
      'custom-order:event',
      { status: 'updated', orderId: customOrderId },
    );

    return {
      customOrderId: updatedOrder.customOrderId,
      status: updatedOrder.status,
      completedAt: updatedOrder.completedAt,
    };
  }
}
