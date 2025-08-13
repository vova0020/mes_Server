import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PackagePartsQueryDto } from '../dto/package-parts-query.dto';
import {
  PackagePartsResponseDto,
  PackagePartDetailDto,
} from '../dto/package-parts-response.dto';

@Injectable()
export class PackagePartsService {
  constructor(private readonly prisma: PrismaService) { }

  // Получение деталей по ID упаковки
  async getPartsByPackageId(
    packageId: number,
    query?: PackagePartsQueryDto,
  ): Promise<PackagePartsResponseDto> {
    // Сначала проверяем, существует ли упаковка
    const packageInfo = await this.prisma.package.findUnique({
      where: { packageId },
      select: {
        packageId: true,
        packageCode: true,
        packageName: true,
        completionPercentage: true,
        order: {
          select: {
            orderId: true,
            orderName: true,
            batchNumber: true,
          },
        },
      },
    });



    if (!packageInfo) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }
    // 2) получаем все PackingTask по этому же packageId
    const tasks = await this.prisma.packingTask.findMany({
      where: { packageId: packageInfo.packageId },
      include: {
        machine: true,
        assignedUser: true,
      },
    });

    // Строим условие фильтрации для деталей
    let whereClause: any = {
      packageId,
    };

    // Добавляем фильтр по статусу детали, если указан
    if (query?.status) {
      whereClause.part = {
        status: query.status,
      };
    }

    // Получаем детали с пагинацией
    const { page = 1, limit = 10 } = query || {};

    const productionPackagePartsRaw =
      await this.prisma.productionPackagePart.findMany({
        where: whereClause,
        orderBy: { partId: 'asc' },
        select: {
          quantity: true,
          part: {
            select: {
              partId: true,
              partCode: true,
              partName: true,
              status: true,
              totalQuantity: true,
              isSubassembly: true,
              readyForMainFlow: true,
              size: true,
              material: {
                select: {
                  materialId: true,
                  materialName: true,
                  article: true,
                  unit: true,
                },
              },
              route: {
                select: {
                  routeId: true,
                  routeName: true,
                },
              },
              pallets: {
                select: {
                  palletId: true,
                  palletName: true,
                },
              },
              partRouteProgress: {
                select: {
                  routeStageId: true,
                  status: true,
                  completedAt: true,
                  routeStage: {
                    select: {
                      stage: {
                        select: {
                          stageName: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  routeStageId: 'asc',
                },
              },
            },
          },
        },
      });

    // Получаем общее количество деталей для пагинации
    const totalParts = await this.prisma.productionPackagePart.count({
      where: whereClause,
    });

    // Вычисляем готовность деталей (процент деталей готовых к финальному этапу)
    const readyParts = productionPackagePartsRaw.filter((ppp) => {
      // Проверяем, что все нефинальные этапы завершены
      const completedStages = ppp.part.partRouteProgress.filter(
        progress => progress.status === 'COMPLETED'
      );
      const totalStages = ppp.part.partRouteProgress.length;
      
      // Деталь готова если все этапы кроме последнего (финального) завершены
      return totalStages > 0 && completedStages.length >= totalStages - 1;
    });
    
    const readiness = productionPackagePartsRaw.length > 0 
      ? Math.round((readyParts.length / productionPackagePartsRaw.length) * 100)
      : 0;

    // Преобразуем данные
    const parts: PackagePartDetailDto[] = productionPackagePartsRaw.map(
      (ppp) => ({
        partId: ppp.part.partId,
        partCode: ppp.part.partCode,
        partName: ppp.part.partName,
        status: ppp.part.status as string,
        totalQuantity: ppp.part.totalQuantity.toNumber(),
        requiredQuantity: ppp.quantity.toNumber(),
        isSubassembly: ppp.part.isSubassembly,
        readyForMainFlow: ppp.part.readyForMainFlow,
        size: ppp.part.size,
        material: ppp.part.material ? {
          materialId: ppp.part.material.materialId,
          materialName: ppp.part.material.materialName,
          article: ppp.part.material.article,
          unit: ppp.part.material.unit,
        } : {
          materialId: 0,
          materialName: 'Не указан',
          article: 'Не указан',
          unit: 'шт',
        },
        route: {
          routeId: ppp.part.route.routeId,
          routeName: ppp.part.route.routeName,
        },
        pallets: ppp.part.pallets.map((pallet) => ({
          palletId: pallet.palletId,
          palletName: pallet.palletName,
        })),
        routeProgress: ppp.part.partRouteProgress.map((progress) => ({
          routeStageId: progress.routeStageId,
          stageName: progress.routeStage.stage.stageName,
          status: progress.status as string,
          completedAt: progress.completedAt,
        })),
      }),
    );

    return {
      packageInfo: {
        packageId: packageInfo.packageId,
        packageCode: packageInfo.packageCode,
        packageName: packageInfo.packageName,
        completionPercentage: packageInfo.completionPercentage.toNumber(),
        readiness,
        order: {
          orderId: packageInfo.order.orderId,
          orderName: packageInfo.order.orderName,
          batchNumber: packageInfo.order.batchNumber,
        },
      },
      partsCount: parts.length,
      parts,
      pagination: {
        page,
        limit,
        total: totalParts,
        totalPages: Math.ceil(totalParts / limit),
      },
    };
  }

  // Получение конкретной детали из упаковки
  async getPartFromPackage(
    packageId: number,
    partId: number,
  ): Promise<PackagePartDetailDto> {
    const productionPackagePartRaw =
      await this.prisma.productionPackagePart.findFirst({
        where: {
          packageId,
          partId,
        },
        select: {
          quantity: true,
          part: {
            select: {
              partId: true,
              partCode: true,
              partName: true,
              status: true,
              totalQuantity: true,
              isSubassembly: true,
              readyForMainFlow: true,
              size: true,
              material: {
                select: {
                  materialId: true,
                  materialName: true,
                  article: true,
                  unit: true,
                },
              },
              route: {
                select: {
                  routeId: true,
                  routeName: true,
                },
              },
              pallets: {
                select: {
                  palletId: true,
                  palletName: true,
                },
              },
              partRouteProgress: {
                select: {
                  routeStageId: true,
                  status: true,
                  completedAt: true,
                  routeStage: {
                    select: {
                      stage: {
                        select: {
                          stageName: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  routeStageId: 'asc',
                },
              },
            },
          },
        },
      });

    if (!productionPackagePartRaw) {
      throw new NotFoundException(
        `Деталь с ID ${partId} не найдена в упаковке с ID ${packageId}`,
      );
    }

    return {
      partId: productionPackagePartRaw.part.partId,
      partCode: productionPackagePartRaw.part.partCode,
      partName: productionPackagePartRaw.part.partName,
      status: productionPackagePartRaw.part.status as string,
      totalQuantity: productionPackagePartRaw.part.totalQuantity.toNumber(),
      requiredQuantity: productionPackagePartRaw.quantity.toNumber(),
      isSubassembly: productionPackagePartRaw.part.isSubassembly,
      readyForMainFlow: productionPackagePartRaw.part.readyForMainFlow,
      size: productionPackagePartRaw.part.size,
      material: productionPackagePartRaw.part.material ? {
        materialId: productionPackagePartRaw.part.material.materialId,
        materialName: productionPackagePartRaw.part.material.materialName,
        article: productionPackagePartRaw.part.material.article,
        unit: productionPackagePartRaw.part.material.unit,
      } : {
        materialId: 0,
        materialName: 'Не указан',
        article: 'Не указан',
        unit: 'шт',
      },
      route: {
        routeId: productionPackagePartRaw.part.route.routeId,
        routeName: productionPackagePartRaw.part.route.routeName,
      },
      pallets: productionPackagePartRaw.part.pallets.map((pallet) => ({
        palletId: pallet.palletId,
        palletName: pallet.palletName,
      })),
      routeProgress: productionPackagePartRaw.part.partRouteProgress.map(
        (progress) => ({
          routeStageId: progress.routeStageId,
          stageName: progress.routeStage.stage.stageName,
          status: progress.status as string,
          completedAt: progress.completedAt,
        }),
      ),
    };
  }

  // Получение статистики по деталям упаковки
  async getPackagePartsStatistics(packageId: number) {
    // Проверяе�� существование упаковки
    const packageExists = await this.prisma.package.findUnique({
      where: { packageId },
      select: { packageId: true },
    });

    if (!packageExists) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    // Получаем статистику по статусам деталей
    const statusStats = await this.prisma.productionPackagePart.groupBy({
      by: ['partId'],
      where: { packageId },
      _count: {
        partId: true,
      },
    });

    // Получаем детальную статистику по статусам
    const detailedStats = await this.prisma.productionPackagePart.findMany({
      where: { packageId },
      select: {
        part: {
          select: {
            status: true,
            isSubassembly: true,
            readyForMainFlow: true,
          },
        },
      },
    });

    const stats = {
      totalParts: statusStats.length,
      byStatus: {
        PENDING: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
      } as Record<string, number>,
      subassemblies: 0,
      readyForMainFlow: 0,
    };

    detailedStats.forEach((item) => {
      const status = item.part.status as string;
      if (stats.byStatus[status] !== undefined) {
        stats.byStatus[status]++;
      } else {
        stats.byStatus[status] = 1;
      }
      if (item.part.isSubassembly) stats.subassemblies++;
      if (item.part.readyForMainFlow) stats.readyForMainFlow++;
    });

    return stats;
  }
}
