import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class OrderStatisticsService {
  constructor(private prisma: PrismaService) {}

  async getAllOrders() {
    const orders = await this.prisma.order.findMany({
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
                          include: { stage: true },
                          orderBy: { sequenceNumber: 'asc' },
                        },
                      },
                    },
                    pallets: {
                      include: {
                        palletStageProgress: {
                          include: { routeStage: { include: { stage: true } } },
                        },
                      },
                    },
                    partRouteProgress: {
                      include: { routeStage: { include: { stage: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const partsMap = new Map();
      order.packages.forEach((pkg) => {
        pkg.productionPackageParts.forEach((ppp) => {
          const part = ppp.part;
          if (!partsMap.has(part.partId)) {
            partsMap.set(part.partId, {
              pallets: part.pallets,
              stages: part.route.routeStages.map((rs) => {
                let completionPercentage = 0;

                // Для финального этапа считаем по упаковкам
                if (rs.stage.finalStage) {
                  const partPackages = order.packages.filter((pkg) =>
                    pkg.productionPackageParts.some(
                      (ppp) => ppp.partId === part.partId,
                    ),
                  );
                  const totalPackages = partPackages.length;
                  const completedPackages = partPackages.filter(
                    (pkg) => pkg.packingStatus === 'COMPLETED',
                  ).length;

                  completionPercentage =
                    totalPackages > 0
                      ? Math.round((completedPackages / totalPackages) * 100)
                      : 0;
                } else {
                  // Для обычных этапов считаем по прогрессу детали + поддонам
                  const partProgress = part.partRouteProgress?.find(
                    (p) => p.routeStageId === rs.routeStageId,
                  );
                  if (partProgress?.completedAt) {
                    // Если деталь полностью прошла этап - 100%
                    completionPercentage = 100;
                  } else {
                    // Иначе считаем по поддонам
                    const totalQuantityOnPallets = part.pallets.reduce(
                      (sum, pallet) => sum + Number(pallet.quantity),
                      0,
                    );
                    const completedQuantity = part.pallets.reduce(
                      (sum, pallet) => {
                        const palletProgress = pallet.palletStageProgress?.find(
                          (p) => p.routeStageId === rs.routeStageId,
                        );
                        return (
                          sum +
                          (palletProgress?.completedAt
                            ? Number(pallet.quantity)
                            : 0)
                        );
                      },
                      0,
                    );

                    completionPercentage =
                      totalQuantityOnPallets > 0
                        ? Math.round(
                            (completedQuantity / totalQuantityOnPallets) * 100,
                          )
                        : 0;
                  }
                }

                return {
                  completionPercentage,
                  finalStage: rs.stage.finalStage,
                };
              }),
            });
          }
        });
      });

      const orderProgress = this.calculateOrderProgress(
        order,
        Array.from(partsMap.values()),
      );

      return {
        orderId: order.orderId,
        batchNumber: `${order.batchNumber} - ${order.orderName}`,
        orderName: order.orderName,
        status: order.status,
        completionPercentage: order.completionPercentage,
        productionProgress: orderProgress.productionProgress,
        packingProgress: orderProgress.packingProgress,
        createdAt: order.createdAt,
        requiredDate: order.requiredDate,
      };
    });
  }

  async getOrderById(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
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
                          include: { stage: true },
                          orderBy: { sequenceNumber: 'asc' },
                        },
                      },
                    },
                    pallets: {
                      include: {
                        palletStageProgress: {
                          include: { routeStage: { include: { stage: true } } },
                        },
                        packageAssignments: true,
                      },
                    },
                    partRouteProgress: {
                      include: { routeStage: { include: { stage: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const packages = order.packages.map((pkg) => ({
      packageId: pkg.packageId,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      quantity: pkg.quantity,
      partCount: pkg.productionPackageParts.length,
    }));

    const partsMap = new Map();
    order.packages.forEach((pkg) => {
      pkg.productionPackageParts.forEach((ppp) => {
        const part = ppp.part;
        if (!partsMap.has(part.partId)) {
          partsMap.set(part.partId, {
            partId: part.partId,
            partCode: part.partCode,
            partName: part.partName,
            totalQuantity: part.totalQuantity,
            packages: [],
            stages: [],
          });
        }
        partsMap.get(part.partId).packages.push(pkg.packageName);
      });
    });

    order.packages.forEach((pkg) => {
      pkg.productionPackageParts.forEach((ppp) => {
        const part = ppp.part;
        if (partsMap.has(part.partId)) {
          const partData = partsMap.get(part.partId);
          partData.pallets = part.pallets.map((pallet) => ({
            palletId: pallet.palletId,
            palletName: pallet.palletName,
            quantity: pallet.quantity,
            stages: part.route.routeStages.map((rs) => {
              let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' =
                'NOT_STARTED';

              if (rs.stage.finalStage) {
                // Для финального этапа (упаковка) проверяем назначение поддона на упаковку
                const isAssignedToPacking =
                  pallet.packageAssignments?.length > 0;
                status = isAssignedToPacking ? 'COMPLETED' : 'NOT_STARTED';
              } else {
                // Для обычных этапов проверяем прогресс
                const progress = pallet.palletStageProgress?.find(
                  (p) => p.routeStageId === rs.routeStageId,
                );
                status = progress?.completedAt
                  ? 'COMPLETED'
                  : progress
                    ? 'IN_PROGRESS'
                    : 'NOT_STARTED';
              }

              return {
                routeStageId: rs.routeStageId,
                stageName: rs.stage.stageName,
                sequenceNumber: rs.sequenceNumber,
                status,
              };
            }),
          }));

          // Пересчитываем процент готовности этапов на основе поддонов
          partData.stages = part.route.routeStages.map((rs) => {
            let completionPercentage = 0;

            // Для финального этапа (упаковка) считаем по упаковкам
            if (rs.stage.finalStage) {
              const partPackages = order.packages.filter((pkg) =>
                pkg.productionPackageParts.some(
                  (ppp) => ppp.partId === part.partId,
                ),
              );
              const totalPackages = partPackages.length;
              const completedPackages = partPackages.filter(
                (pkg) => pkg.packingStatus === 'COMPLETED',
              ).length;

              completionPercentage =
                totalPackages > 0
                  ? Math.round((completedPackages / totalPackages) * 100)
                  : 0;
            } else {
              // Для обычных этапов считаем по поддонам
              const totalQuantityOnPallets = part.pallets.reduce(
                (sum, pallet) => sum + Number(pallet.quantity),
                0,
              );
              const completedQuantity = part.pallets.reduce((sum, pallet) => {
                const palletProgress = pallet.palletStageProgress?.find(
                  (p) => p.routeStageId === rs.routeStageId,
                );
                return (
                  sum +
                  (palletProgress?.completedAt ? Number(pallet.quantity) : 0)
                );
              }, 0);

              completionPercentage =
                totalQuantityOnPallets > 0
                  ? Math.round(
                      (completedQuantity / totalQuantityOnPallets) * 100,
                    )
                  : 0;
            }

            return {
              routeStageId: rs.routeStageId,
              stageName: rs.stage.stageName,
              sequenceNumber: rs.sequenceNumber,
              completionPercentage,
            };
          });
        }
      });
    });

    // Считаем общий процент выполнения заказа
    const orderProgress = this.calculateOrderProgress(
      order,
      Array.from(partsMap.values()),
    );

    return {
      orderId: order.orderId,
      batchNumber: order.batchNumber,
      orderName: order.orderName,
      status: order.status,
      completionPercentage: order.completionPercentage,
      productionProgress: orderProgress.productionProgress,
      packingProgress: orderProgress.packingProgress,
      packages,
      parts: Array.from(partsMap.values()),
    };
  }

  private calculateOrderProgress(order: any, parts: any[]) {
    // Процент упаковки
    const totalPackages = order.packages.length;
    const completedPackages = order.packages.filter(
      (pkg) => pkg.packingStatus === 'COMPLETED',
    ).length;
    const packingProgress =
      totalPackages > 0
        ? Math.round((completedPackages / totalPackages) * 100)
        : 0;

    // Процент производства (все этапы кроме финального)
    let totalStageWork = 0;
    let completedStageWork = 0;

    parts.forEach((part) => {
      const totalQuantityOnPallets = part.pallets.reduce(
        (sum, pallet) => sum + Number(pallet.quantity),
        0,
      );

      part.stages.forEach((stage) => {
        const stageWork = totalQuantityOnPallets;
        totalStageWork += stageWork;
        completedStageWork += (stageWork * stage.completionPercentage) / 100;
      });
    });

    const productionProgress =
      totalStageWork > 0
        ? Math.round((completedStageWork / totalStageWork) * 100)
        : 0;

    return {
      productionProgress,
      packingProgress,
    };
  }
}
