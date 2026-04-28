import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PackagePartsQueryDto } from '../dto/package-parts-query.dto';
import {
  PackagePartsResponseDto,
  PackagePartDetailDto,
} from '../dto/package-parts-response.dto';

@Injectable()
export class PackagePartsService {
  private readonly logger = new Logger(PackagePartsService.name);
  
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

    // Получаем детали из packageComposition (там есть quantityPerPackage)
    const compositionRaw = await this.prisma.packageComposition.findMany({
      where: { packageId },
      orderBy: { partCode: 'asc' },
      select: {
        partCode: true,
        partName: true,
        partSize: true,
        quantity: true,
        quantityPerPackage: true,
        materialName: true,
        materialSku: true,
        thickness: true,
        thicknessWithEdging: true,
        finishedLength: true,
        finishedWidth: true,
        groove: true,
        edgingNameL1: true,
        edgingNameL2: true,
        edgingNameW1: true,
        edgingNameW2: true,
        route: {
          select: {
            routeId: true,
            routeName: true,
          },
        },
      },
    });

    // Получаем детали из справочника для substackLocation
    const detailsFromDirectory = await this.prisma.detailDirectory.findMany({
      where: {
        partSku: {
          in: compositionRaw.map(c => c.partCode),
        },
      },
      select: {
        partSku: true,
        conveyorPosition: true,
      },
    });

    // Логирование для заказа 54
    if (packageInfo.order.orderId === 54) {
      this.logger.log(`\n=== ЗАКАЗ 54, УПАКОВКА ${packageId} ===`);
      this.logger.log(`Детали из composition: ${compositionRaw.map(c => `${c.partCode}`).join(', ')}`);
    }

    const substackLocationMap = new Map(
      detailsFromDirectory.map(d => [d.partSku, d.conveyorPosition])
    );

    // Получаем детали из productionPackageParts (там правильные partId)
    const productionParts = await this.prisma.productionPackagePart.findMany({
      where: { packageId },
      select: {
        partId: true,
        quantity: true,
        part: {
          select: {
            partId: true,
            partCode: true,
            partName: true,
            status: true,
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
                routeStages: {
                  select: {
                    routeStageId: true,
                    stage: {
                      select: {
                        finalStage: true,
                      },
                    },
                  },
                  orderBy: { sequenceNumber: 'asc' },
                },
              },
            },
            pallets: {
              where: { isActive: true },
              select: {
                palletId: true,
                palletName: true,
                quantity: true,
                palletStageProgress: {
                  select: {
                    routeStageId: true,
                    status: true,
                  },
                },
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

    // Создаем Map по partCode для быстрого доступа
    const partsMap = new Map(productionParts.map(pp => [pp.part.partCode, pp.part]));

    // Логирование для заказа 54
    if (packageInfo.order.orderId === 54) {
      this.logger.log(`Детали из productionPackageParts: ${productionParts.map(pp => `${pp.part.partCode} (id: ${pp.part.partId}, поддонов: ${pp.part.pallets.length})`).join(', ')}`);
      const part1223 = productionParts.find(pp => pp.part.partId === 1223);
      if (part1223) {
        this.logger.log(`\nДеталь 1223 найдена:`);
        this.logger.log(`  - partCode: ${part1223.part.partCode}`);
        this.logger.log(`  - Количество поддонов: ${part1223.part.pallets.length}`);
        this.logger.log(`  - Поддоны: ${JSON.stringify(part1223.part.pallets.map(p => ({ id: p.palletId, name: p.palletName, qty: p.quantity.toNumber() })))}`);
      }
    }

    // Вычисляем готовность деталей
    const readyParts = productionParts.filter((pp) => {
      const completedStages = pp.part.partRouteProgress.filter(
        progress => progress.status === 'COMPLETED'
      );
      const totalStages = pp.part.partRouteProgress.length;
      return totalStages > 0 && completedStages.length >= totalStages - 1;
    });
    
    const readiness = productionParts.length > 0 
      ? Math.round((readyParts.length / productionParts.length) * 100)
      : 0;

    // Преобразуем данные
    const parts: PackagePartDetailDto[] = await Promise.all(
      compositionRaw.map(async (comp) => {
        const part = partsMap.get(comp.partCode);
        const substackLocation = substackLocationMap.get(comp.partCode);

        // Рассчитываем totalOnPallets и availableForPackaging
        let totalOnPallets = 0;
        let availableForPackaging = 0;
        let totalDefected = 0;
        let totalReturned = 0;

        // Логирование для детали 1223
        if (part?.partId === 1223) {
          this.logger.log(`\n=== ДЕТАЛЬ 1223 (${comp.partCode}) ===`);
          this.logger.log(`Упаковка ID: ${packageId}`);
          this.logger.log(`Количество поддонов: ${part.pallets?.length || 0}`);
        }

        if (part?.pallets) {
          // Получаем нефинальные этапы маршрута
          const nonFinalStageIds = part.route.routeStages
            .filter(stage => !stage.stage.finalStage)
            .map(stage => stage.routeStageId);

          if (part.partId === 1223) {
            this.logger.log(`Нефинальные этапы: ${JSON.stringify(nonFinalStageIds)}`);
          }

          // Получаем статистику по отбраковке и возврату для всех поддонов детали
          const palletIds = part.pallets.map(p => p.palletId);
          
          if (part.partId === 1223) {
            this.logger.log(`ID поддонов: ${JSON.stringify(palletIds)}`);
          }
          
          const defectMovements = await this.prisma.inventoryMovement.aggregate({
            where: {
              partId: part.partId,
              reason: 'DEFECT',
            },
            _sum: { deltaQuantity: true },
          });
          
          const returnMovements = await this.prisma.inventoryMovement.aggregate({
            where: {
              partId: part.partId,
              reason: 'RETURN_FROM_RECLAMATION',
            },
            _sum: { deltaQuantity: true },
          });
          
          // deltaQuantity для DEFECT отрицательное, поэтому берем абсолютное значение
          totalDefected = Math.abs(defectMovements._sum.deltaQuantity?.toNumber() || 0);
          totalReturned = returnMovements._sum.deltaQuantity?.toNumber() || 0;

          if (part.partId === 1223) {
            this.logger.log(`Отбраковано: ${totalDefected}, Возвращено: ${totalReturned}`);
          }

          for (const pallet of part.pallets) {
            // Получаем общее использованное количество с поддона
            const totalUsed = await this.prisma.palletPackageAssignment.aggregate({
              where: { palletId: pallet.palletId },
              _sum: { usedQuantity: true },
            });
            
            const usedQuantity = totalUsed._sum.usedQuantity?.toNumber() || 0;
            const availableOnPallet = pallet.quantity.toNumber() - usedQuantity;
            
            if (part.partId === 1223) {
              this.logger.log(`\nПоддон ${pallet.palletId} (${pallet.palletName}):`);
              this.logger.log(`  - Количество на поддоне: ${pallet.quantity.toNumber()}`);
              this.logger.log(`  - Использовано (usedQuantity): ${usedQuantity}`);
              this.logger.log(`  - Доступно: ${availableOnPallet}`);
              this.logger.log(`  - Прогресс этапов: ${JSON.stringify(pallet.palletStageProgress.map(p => ({ routeStageId: p.routeStageId, status: p.status })))}`);
            }
            
            totalOnPallets += availableOnPallet;

            // Проверяем готовность поддона к упаковке
            const completedStageIds = pallet.palletStageProgress
              .filter(progress => progress.status === 'COMPLETED')
              .map(progress => progress.routeStageId);

            const readyForPackaging = nonFinalStageIds.length === 0 ||
              nonFinalStageIds.every(stageId => completedStageIds.includes(stageId));

            if (part.partId === 1223) {
              this.logger.log(`  - Завершенные этапы: ${JSON.stringify(completedStageIds)}`);
              this.logger.log(`  - Готов к упаковке: ${readyForPackaging}`);
            }

            if (readyForPackaging) {
              availableForPackaging += availableOnPallet;
            }
          }
        }

        if (part?.partId === 1223) {
          this.logger.log(`\nИТОГО для детали 1223:`);
          this.logger.log(`  - totalOnPallets: ${totalOnPallets}`);
          this.logger.log(`  - availableForPackaging: ${availableForPackaging}`);
          this.logger.log(`=== КОНЕЦ ДЕТАЛИ 1223 ===\n`);
        }

        return {
          partId: part?.partId || 0,
          partCode: comp.partCode,
          partName: comp.partName,
          status: part?.status || 'PENDING',
          totalQuantity: comp.quantity.toNumber(),
          requiredQuantity: comp.quantity.toNumber(),
          quantityPerPackage: comp.quantityPerPackage.toNumber(),
          substackLocation: substackLocation || undefined,
          isSubassembly: part?.isSubassembly || false,
          readyForMainFlow: part?.readyForMainFlow || false,
          size: comp.partSize,
          totalOnPallets,
          availableForPackaging,
          totalDefected,
          totalReturned,
          material: {
            materialId: 0,
            materialName: comp.materialName,
            article: comp.materialSku,
            unit: 'шт',
          },
          route: {
            routeId: comp.route.routeId,
            routeName: comp.route.routeName,
          },
          pallets: part?.pallets.map((pallet) => ({
            palletId: pallet.palletId,
            palletName: pallet.palletName,
          })) || [],
          routeProgress: part?.partRouteProgress.map((progress) => ({
            routeStageId: progress.routeStageId,
            stageName: progress.routeStage.stage.stageName,
            status: progress.status as string,
            completedAt: progress.completedAt,
          })) || [],
        };
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
        page: query?.page || 1,
        limit: query?.limit || 10,
        total: parts.length,
        totalPages: Math.ceil(parts.length / (query?.limit || 10)),
      },
    };
  }

  // Получение конкретной детали из упаковки
  async getPartFromPackage(
    packageId: number,
    partId: number,
  ): Promise<PackagePartDetailDto> {
    // Получаем деталь из Part
    const part = await this.prisma.part.findUnique({
      where: { partId },
      select: {
        partId: true,
        partCode: true,
        partName: true,
        status: true,
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
            routeStages: {
              select: {
                routeStageId: true,
                stage: {
                  select: {
                    finalStage: true,
                  },
                },
              },
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
        pallets: {
          where: { isActive: true },
          select: {
            palletId: true,
            palletName: true,
            quantity: true,
            palletStageProgress: {
              select: {
                routeStageId: true,
                status: true,
              },
            },
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
    });

    if (!part) {
      throw new NotFoundException(
        `Деталь с ID ${partId} не найдена`,
      );
    }

    // Получаем данные из packageComposition
    const composition = await this.prisma.packageComposition.findFirst({
      where: {
        packageId,
        partCode: part.partCode,
      },
      select: {
        quantity: true,
        quantityPerPackage: true,
        materialName: true,
        materialSku: true,
      },
    });

    if (!composition) {
      throw new NotFoundException(
        `Деталь с ID ${partId} не найдена в упаковке с ID ${packageId}`,
      );
    }

    // Получаем substackLocation из справочника
    const detailFromDirectory = await this.prisma.detailDirectory.findUnique({
      where: { partSku: part.partCode },
      select: { conveyorPosition: true },
    });

    // Рассчитываем totalOnPallets и availableForPackaging
    let totalOnPallets = 0;
    let availableForPackaging = 0;
    let totalDefected = 0;
    let totalReturned = 0;

    const nonFinalStageIds = part.route.routeStages
      .filter(stage => !stage.stage.finalStage)
      .map(stage => stage.routeStageId);

    // Логирование для детали 1223
    if (part.partId === 1223) {
      this.logger.log(`\n=== ДЕТАЛЬ 1223 (getPartFromPackage) ===`);
      this.logger.log(`Упаковка ID: ${packageId}`);
      this.logger.log(`Количество поддонов: ${part.pallets.length}`);
      this.logger.log(`Нефинальные этапы: ${JSON.stringify(nonFinalStageIds)}`);
    }

    // Получаем статистику по отбраковке и возврату
    const palletIds = part.pallets.map(p => p.palletId);
    
    if (part.partId === 1223) {
      this.logger.log(`ID поддонов: ${JSON.stringify(palletIds)}`);
    }
    
    const defectMovements = await this.prisma.inventoryMovement.aggregate({
      where: {
        partId: part.partId,
        reason: 'DEFECT',
      },
      _sum: { deltaQuantity: true },
    });
    
    const returnMovements = await this.prisma.inventoryMovement.aggregate({
      where: {
        partId: part.partId,
        reason: 'RETURN_FROM_RECLAMATION',
      },
      _sum: { deltaQuantity: true },
    });
    
    totalDefected = Math.abs(defectMovements._sum.deltaQuantity?.toNumber() || 0);
    totalReturned = returnMovements._sum.deltaQuantity?.toNumber() || 0;

    if (part.partId === 1223) {
      this.logger.log(`Отбраковано: ${totalDefected}, Возвращено: ${totalReturned}`);
    }

    for (const pallet of part.pallets) {
      // Получаем общее использованное количество с поддона
      const totalUsed = await this.prisma.palletPackageAssignment.aggregate({
        where: { palletId: pallet.palletId },
        _sum: { usedQuantity: true },
      });
      
      const usedQuantity = totalUsed._sum.usedQuantity?.toNumber() || 0;
      const availableOnPallet = pallet.quantity.toNumber() - usedQuantity;
      
      if (part.partId === 1223) {
        this.logger.log(`\nПоддон ${pallet.palletId} (${pallet.palletName}):`);
        this.logger.log(`  - Количество на поддоне: ${pallet.quantity.toNumber()}`);
        this.logger.log(`  - Использовано (usedQuantity): ${usedQuantity}`);
        this.logger.log(`  - Доступно: ${availableOnPallet}`);
        this.logger.log(`  - Прогресс этапов: ${JSON.stringify(pallet.palletStageProgress.map(p => ({ routeStageId: p.routeStageId, status: p.status })))}`);
      }
      
      totalOnPallets += availableOnPallet;

      const completedStageIds = pallet.palletStageProgress
        .filter(progress => progress.status === 'COMPLETED')
        .map(progress => progress.routeStageId);

      const readyForPackaging = nonFinalStageIds.length === 0 ||
        nonFinalStageIds.every(stageId => completedStageIds.includes(stageId));

      if (part.partId === 1223) {
        this.logger.log(`  - Завершенные этапы: ${JSON.stringify(completedStageIds)}`);
        this.logger.log(`  - Готов к упаковке: ${readyForPackaging}`);
      }

      if (readyForPackaging) {
        availableForPackaging += availableOnPallet;
      }
    }

    if (part.partId === 1223) {
      this.logger.log(`\nИТОГО для детали 1223:`);
      this.logger.log(`  - totalOnPallets: ${totalOnPallets}`);
      this.logger.log(`  - availableForPackaging: ${availableForPackaging}`);
      this.logger.log(`=== КОНЕЦ ДЕТАЛИ 1223 (getPartFromPackage) ===\n`);
    }

    return {
      partId: part.partId,
      partCode: part.partCode,
      partName: part.partName,
      status: part.status as string,
      totalQuantity: composition.quantity.toNumber(),
      requiredQuantity: composition.quantity.toNumber(),
      quantityPerPackage: composition.quantityPerPackage.toNumber(),
      substackLocation: detailFromDirectory?.conveyorPosition || undefined,
      isSubassembly: part.isSubassembly,
      readyForMainFlow: part.readyForMainFlow,
      size: part.size,
      totalOnPallets,
      availableForPackaging,
      totalDefected,
      totalReturned,
      material: {
        materialId: 0,
        materialName: composition.materialName,
        article: composition.materialSku,
        unit: 'шт',
      },
      route: {
        routeId: part.route.routeId,
        routeName: part.route.routeName,
      },
      pallets: part.pallets.map((pallet) => ({
        palletId: pallet.palletId,
        palletName: pallet.palletName,
      })),
      routeProgress: part.partRouteProgress.map(
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
