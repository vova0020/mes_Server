import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

export interface PalletRouteData {
  palletNumber: string;
  partName: string;
  partSku: string;
  partCreatedAt: Date;
  palletCreatedAt: Date;
  quantity: number;
  materialName: string;
  partSize: string;
  totalOrderQuantity: number;
  edgingNameL1: string | null;
  edgingSkuL1: string | null;
  edgingNameW1: string | null;
  edgingSkuW1: string | null;
  finishedLength: number | null;
  finishedWidth: number | null;
  groove: string | null;
  bufferCellAddress: string | null;
  orderName: string;
  orderNumber: string;
  routeStages: RouteStageData[];
}

export interface RouteStageData {
  stageName: string;
  completedAt: Date | null;
  quantity: number;
  status: string;
}

@Injectable()
export class RouteListService {
  private readonly logger = new Logger(RouteListService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPalletRouteData(palletId: number): Promise<PalletRouteData | null> {
    this.logger.log(`Запрос данных для поддона: ${palletId}`);

    try {
      const pallet = await this.prisma.pallet.findUnique({
        where: { palletId },
        include: {
          part: {
            include: {
              material: true,
              route: {
                include: {
                  routeStages: {
                    include: {
                      stage: true,
                    },
                  },
                },
              },
              productionPackageParts: {
                include: {
                  package: {
                    include: {
                      order: true,
                    },
                  },
                },
              },
            },
          },
          palletStageProgress: {
            include: {
              routeStage: {
                include: {
                  stage: true,
                },
              },
            },
          },
          palletBufferCells: {
            where: {
              removedAt: null,
            },
            include: {
              cell: true,
            },
          },
        },
      });

      if (!pallet) {
        return null;
      }

      // Получаем детали из справочника по артикулу
      const detailInfo = await this.prisma.detailDirectory.findUnique({
        where: { partSku: pallet.part.partCode },
      });

      // Получаем информацию о заказе через упаковку
      const orderInfo = pallet.part.productionPackageParts[0]?.package?.order;

      // Получаем общее количество детали в заказе
      const totalOrderQuantity = await this.prisma.part.aggregate({
        where: {
          partCode: pallet.part.partCode,
        },
        _sum: {
          totalQuantity: true,
        },
      });

      // Получаем текущее местоположение поддона в буферной ячейке
      const currentBufferCell = pallet.palletBufferCells[0]?.cell?.cellCode || null;

      // Формируем данные маршрутных этапов
      const routeStages: RouteStageData[] = pallet.part.route.routeStages.map(
        (routeStage) => {
          const progress = pallet.palletStageProgress.find(
            (p) => p.routeStageId === routeStage.routeStageId,
          );

          return {
            stageName: routeStage.stage.stageName,
            completedAt: progress?.completedAt || null,
            quantity: Number(pallet.quantity),
            status: progress?.status || 'NOT_PROCESSED',
          };
        },
      );

      return {
        palletNumber: pallet.palletName,
        partName: detailInfo?.partName || pallet.part.partName,
        partSku: pallet.part.partCode,
        partCreatedAt: new Date(), // Заглушка, так как нет поля createdAt в Part
        palletCreatedAt: new Date(), // Заглушка, так как нет поля createdAt в Pallet
        quantity: Number(pallet.quantity),
        materialName:
          detailInfo?.materialName || pallet.part.material?.materialName || '',
        partSize: detailInfo
          ? `${detailInfo.finishedLength || 0}x${detailInfo.finishedWidth || 0}`
          : pallet.part.size,
        totalOrderQuantity: Number(totalOrderQuantity._sum.totalQuantity) || 0,
        edgingNameL1: detailInfo?.edgingNameL1 || null,
        edgingSkuL1: detailInfo?.edgingSkuL1 || null,
        edgingNameW1: detailInfo?.edgingNameW1 || null,
        edgingSkuW1: detailInfo?.edgingSkuW1 || null,
        finishedLength: detailInfo?.finishedLength || null,
        finishedWidth: detailInfo?.finishedWidth || null,
        groove: detailInfo?.groove || null,
        bufferCellAddress: currentBufferCell,
        orderName: orderInfo?.orderName || '',
        orderNumber: orderInfo?.batchNumber || '',
        routeStages,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при получении данных поддона: ${error.message}`,
      );
      throw error;
    }
  }
}
