import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersYpackService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение списка заказов с фильтрами (без пагинации)
  async getOrders(query: OrderQueryDto) {
    const { stageId } = query;

    if (!stageId) {
      return [];
    }

    const whereClause = {
      status: { in: [OrderStatus.LAUNCH_PERMITTED, OrderStatus.IN_PROGRESS] },
    };

    // 1) Получаем «сырые» заказы с Decimal
    const ordersRaw = (await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        packages: {
          include: {
            productionPackageParts: {
              include: {
                part: {
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
                    partRouteProgress: true,
                    pallets: {
                      include: {
                        palletStageProgress: true,
                      },
                    },
                  },
                },
              },
            },
            packingTasks: true,
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
        const allParts = order.packages.flatMap((pkg) =>
          pkg.productionPackageParts.map((ppp) => ppp.part),
        );

        return allParts.some((part) =>
          part.route.routeStages.some((rs) => rs.stage.stageId === stageId),
        );
      })
      .map((order) => {
        let available = 0;
        let completed = 0;

        // Собираем все детали из всех упаковок заказа
        const allParts = order.packages.flatMap((pkg) =>
          pkg.productionPackageParts.map((ppp) => ({
            part: ppp.part,
            quantity: ppp.quantity.toNumber(),
          })),
        );

        let totalQuantityForStage = 0;
        let availableQuantity = 0;

        // Группируем детали по partId чтобы избежать дублирования
        const partMap = new Map();
        allParts.forEach(({ part, quantity }) => {
          if (!partMap.has(part.partId)) {
            partMap.set(part.partId, { part, totalInOrder: 0 });
          }
          partMap.get(part.partId).totalInOrder += quantity;
        });

        // Для каждой уникальной детали анализируем прогресс по указанному этапу
        partMap.forEach(({ part, totalInOrder }) => {
          const routeStages = part.route.routeStages;
          const stageIndex = routeStages.findIndex(
            (rs) => rs.stage.stageId === stageId,
          );

          if (stageIndex !== -1) {
            // Только детали, которые проходят через этот этап, учитываются в базе
            totalQuantityForStage += totalInOrder;

            // Если есть поддоны, считаем доступные по поддонам
            if (part.pallets && part.pallets.length > 0) {
              // Доступные - для первого этапа всегда все количество в заказе
              if (stageIndex === 0) {
                availableQuantity += totalInOrder;
              } else {
                // Не первый этап - доступно по выполненному на предыдущем этапе
                let palletAvailableQuantity = 0;
                part.pallets.forEach((pallet) => {
                  const palletQuantity = pallet.quantity.toNumber();
                  const prevStage = routeStages[stageIndex - 1];
                  const prevPalletProgress = pallet.palletStageProgress.find(
                    (p) => p.routeStageId === prevStage.routeStageId,
                  );
                  if (prevPalletProgress && prevPalletProgress.status === 'COMPLETED') {
                    palletAvailableQuantity += palletQuantity;
                  }
                });
                availableQuantity += Math.min(palletAvailableQuantity, totalInOrder);
              }
            } else {
              // Если поддонов нет, используем прогресс детали
              if (stageIndex === 0) {
                availableQuantity += totalInOrder;
              } else {
                const prevStage = routeStages[stageIndex - 1];
                const prevProgress = part.partRouteProgress.find(
                  (p) => p.routeStageId === prevStage.routeStageId,
                );
                if (prevProgress && prevProgress.status === 'COMPLETED') {
                  availableQuantity += totalInOrder;
                }
              }
            }
          }
        });

        // Считаем выполненное количество упаковок из packing_tasks
        const completedPackagesCount = order.packages.reduce((sum, pkg) => {
          return sum + (pkg.packingTasks || []).reduce((taskSum, task) => {
            return taskSum + task.completedQuantity.toNumber();
          }, 0);
        }, 0);

        // Рассчитываем проценты
        available =
          totalQuantityForStage > 0
            ? Math.round((availableQuantity / totalQuantityForStage) * 100)
            : 0;
        completed =
          totalQuantityForStage > 0
            ? Math.round((completedPackagesCount / totalQuantityForStage) * 100)
            : 0;

        return {
          id: order.orderId,
          batchNumber: order.batchNumber,
          orderName: order.orderName,
          completionPercentage: order.completionPercentage.toNumber(),
          isCompleted: order.isCompleted,
          status: order.status,
          priority: order.priority,
          available,
          completed,
        };
      });

    return orders;
  }

  // Получение заказа по id
  async getOrderById(orderId: number) {
    return this.prisma.order.findUnique({
      where: { orderId },
    });
  }

  // Автоматическое обновление статуса заказов на IN_PROGRESS
  private async updateOrderStatusToInProgress(orders: any[]) {
    for (const order of orders) {
      if (order.status === 'LAUNCH_PERMITTED') {
        const hasPartsInProgress = this.checkIfOrderHasPartsInProgress(order);

        if (hasPartsInProgress) {
          await this.prisma.order.update({
            where: { orderId: order.orderId },
            data: { status: 'IN_PROGRESS' },
          });
          order.status = 'IN_PROGRESS'; // Обновляем в памяти для текущего запроса
        }
      }
    }
  }

  // Проверка, есть ли у заказа детали в работе
  private checkIfOrderHasPartsInProgress(order: any): boolean {
    const allParts = order.packages.flatMap((pkg) =>
      pkg.productionPackageParts.map((ppp) => ppp.part),
    );

    return allParts.some((part) => {
      // Если у детали есть поддоны, проверяем их статус
      if (part.pallets && part.pallets.length > 0) {
        return part.pallets.some((pallet) => {
          return pallet.palletStageProgress.some(
            (progress) =>
              progress.status === 'IN_PROGRESS' || progress.status === 'COMPLETED',
          );
        });
      }

      // Если поддонов нет, проверяем статус детали
      if (part.status === 'IN_PROGRESS' || part.status === 'COMPLETED') {
        return true;
      }

      // Проверяем прогресс по этапам маршрута детали
      return part.partRouteProgress.some(
        (progress) =>
          progress.status === 'IN_PROGRESS' || progress.status === 'COMPLETED',
      );
    });
  }
}
