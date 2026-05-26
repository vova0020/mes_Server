import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { CustomOrderQueryDto } from '../dto/custom-order-query.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение списка заказов заказного производства с фильтрами
  async getCustomOrders(query: CustomOrderQueryDto) {
    const { stageId } = query;

    if (!stageId) {
      return [];
    }

    const whereClause = {
      status: { in: [OrderStatus.LAUNCH_PERMITTED, OrderStatus.IN_PROGRESS] },
    };

    // 1) Получаем заказы с деталями
    const ordersRaw = (await this.prisma.customOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customParts: {
          include: {
            route: {
              include: {
                routeStages: {
                  include: {
                    stage: true,
                  },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
            customPalletParts: {
              include: {
                customPallet: true,
              },
            },
          },
        },
      },
    })) as any[];

    // 2) Автоматически обновляем статус заказов на IN_PROGRESS если есть детали в работе
    await this.updateOrderStatusToInProgress(ordersRaw);

    // 3) Обрабатываем данные и рассчитываем доступно/выполнено для указанного этапа
    const orders = ordersRaw
      .filter((order) => {
        // Проверяем, есть ли детали, которые проходят обработку на указанном этапе
        return order.customParts.some((part) =>
          part.route.routeStages.some((rs) => rs.stage.stageId === stageId),
        );
      })
      .map((order) => {
        let available = 0;
        let completed = 0;

        let totalQuantityForStage = 0;
        let completedQuantity = 0;
        let availableQuantity = 0;

        // Для каждой детали анализируем прогресс по указанному этапу
        order.customParts.forEach((part) => {
          const routeStages = part.route.routeStages;
          const stageIndex = routeStages.findIndex(
            (rs) => rs.stage.stageId === stageId,
          );

          if (stageIndex !== -1) {
            const partQuantity = part.quantity.toNumber();
            totalQuantityForStage += partQuantity;

            // Для первого этапа всегда все количество доступно
            if (stageIndex === 0) {
              availableQuantity += partQuantity;
            }

            // Проверяем статус детали
            if (part.status === 'COMPLETED') {
              completedQuantity += partQuantity;
              if (stageIndex > 0) {
                availableQuantity += partQuantity;
              }
            } else if (part.status === 'IN_PROGRESS') {
              if (stageIndex > 0) {
                availableQuantity += partQuantity;
              }
            }
          }
        });

        // Рассчитываем проценты
        available =
          totalQuantityForStage > 0
            ? Math.round((availableQuantity / totalQuantityForStage) * 100)
            : 0;
        completed =
          totalQuantityForStage > 0
            ? Math.round((completedQuantity / totalQuantityForStage) * 100)
            : 0;

        return {
          id: order.customOrderId,
          orderNumber: order.orderNumber,
          orderName: order.orderName,
          completionPercentage: order.completionPercentage.toNumber(),
          status: order.status,
          priority: order.priority,
          available,
          completed,
        };
      });

    return orders;
  }

  // Получение заказа по id
  async getCustomOrderById(customOrderId: number) {
    return this.prisma.customOrder.findUnique({
      where: { customOrderId },
      include: {
        customParts: {
          include: {
            route: {
              include: {
                routeStages: {
                  include: {
                    stage: true,
                    substage: true,
                  },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
            customPalletParts: {
              include: {
                customPallet: true,
              },
            },
          },
        },
      },
    });
  }

  // Автоматическое обновление статуса заказов на IN_PROGRESS
  private async updateOrderStatusToInProgress(orders: any[]) {
    for (const order of orders) {
      if (order.status === 'LAUNCH_PERMITTED') {
        const hasPartsInProgress = this.checkIfOrderHasPartsInProgress(order);

        if (hasPartsInProgress) {
          await this.prisma.customOrder.update({
            where: { customOrderId: order.customOrderId },
            data: { status: 'IN_PROGRESS' },
          });
          order.status = 'IN_PROGRESS'; // Обновляем в памяти для текущего запроса
        }
      }
    }
  }

  // Проверка, есть ли у заказа детали в работе
  private checkIfOrderHasPartsInProgress(order: any): boolean {
    return order.customParts.some((part) => {
      return part.status === 'IN_PROGRESS' || part.status === 'COMPLETED';
    });
  }
}
