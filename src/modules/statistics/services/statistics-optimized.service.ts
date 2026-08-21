import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { GetMachineProductionDto } from '../dto';
import { MachineProductionRecord } from './statistics.service';

/**
 * Оптимизированная версия метода getMachineProduction
 * Решает проблему зависания при фильтрации по orderId
 * Включает данные из MachineOperationHistory И PalletStageProgress (для ручного завершения мастером)
 */
@Injectable()
export class StatisticsOptimizedService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить данные учёта выпуска продукции по рабочим местам (станкам).
   * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ - фильтрация на уровне БД, минимальные include
   * Включает операции из MachineOperationHistory + завершенные вручную из PalletStageProgress
   */
  async getMachineProduction(
    dto: GetMachineProductionDto,
  ): Promise<MachineProductionRecord[]> {
    console.log('getMachineProduction (OPTIMIZED v2) called with:', dto);

    // Строим условие WHERE для дат
    const dateWhere: { gte?: Date; lte?: Date } = {};
    if (dto.startDate) {
      dateWhere.gte = new Date(dto.startDate);
    }
    if (dto.endDate) {
      const endDate = new Date(dto.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateWhere.lte = endDate;
    }

    // Если указан orderId, получаем список partId для этого заказа
    let partIdsForOrder: number[] | undefined;
    let palletIdsForOrder: number[] | undefined;
    if (dto.orderId) {
      const packages = await this.prisma.package.findMany({
        where: { orderId: dto.orderId },
        select: {
          productionPackageParts: {
            select: {
              partId: true,
              part: {
                select: {
                  pallets: {
                    select: { palletId: true },
                  },
                },
              },
            },
          },
        },
      });

      partIdsForOrder = [
        ...new Set(
          packages.flatMap((pkg) =>
            pkg.productionPackageParts.map((ppp) => ppp.partId),
          ),
        ),
      ];

      palletIdsForOrder = [
        ...new Set(
          packages.flatMap((pkg) =>
            pkg.productionPackageParts.flatMap((ppp) =>
              ppp.part.pallets.map((p) => p.palletId),
            ),
          ),
        ),
      ];

      if (partIdsForOrder.length === 0) {
        console.log(`No parts found for orderId ${dto.orderId}`);
        return [];
      }
      console.log(
        `Found ${partIdsForOrder.length} parts and ${palletIdsForOrder.length} pallets for orderId ${dto.orderId}`,
      );
    }

    // Определяем финальные станки
    const finalStageMachines = await this.prisma.machineStage.findMany({
      where: { stage: { finalStage: true } },
      select: { machineId: true },
    });
    const finalMachineIds = finalStageMachines.map((m) => m.machineId);

    const result: MachineProductionRecord[] = [];

    // Определяем, является ли запрошенный станок финальным
    const isFinalMachine = dto.machineId
      ? finalMachineIds.includes(dto.machineId)
      : false;

    // 1. Обрабатываем обычные станки (MachineOperationHistory + PalletStageProgress)
    if (!dto.machineId || !isFinalMachine) {
      // 1a. Получаем операции из MachineOperationHistory
      const whereCondition: any = {};

      // Фильтр по станку
      if (dto.machineId) {
        whereCondition.machineId = dto.machineId;
      } else if (finalMachineIds.length > 0) {
        whereCondition.machineId = { notIn: finalMachineIds };
      }

      // Фильтр по дате
      if (Object.keys(dateWhere).length > 0) {
        whereCondition.completedAt = dateWhere;
      }

      // Фильтр по этапу
      if (dto.stageId) {
        whereCondition.routeStage = { stageId: dto.stageId };
      }

      // Фильтр по заказу через partId
      if (partIdsForOrder && partIdsForOrder.length > 0) {
        whereCondition.partId = { in: partIdsForOrder };
      }

      // Фильтр по оператору
      if (dto.operatorId) {
        whereCondition.operatorId = dto.operatorId;
      }

      const operations = await this.prisma.machineOperationHistory.findMany({
        where: whereCondition,
        select: {
          operationId: true,
          machineId: true,
          partId: true,
          palletId: true,
          routeStageId: true,
          quantityProcessed: true,
          startedAt: true,
          completedAt: true,
          duration: true,
          operatorId: true,
          machine: {
            select: {
              machineId: true,
              machineName: true,
              loadUnit: true,
            },
          },
          part: {
            select: {
              partId: true,
              partCode: true,
              partName: true,
              size: true,
              material: {
                select: {
                  materialId: true,
                  materialName: true,
                  article: true,
                },
              },
              productionPackageParts: {
                select: {
                  packageId: true,
                  package: {
                    select: {
                      packageId: true,
                      packageCode: true,
                      packageName: true,
                      orderId: true,
                      composition: {
                        select: {
                          materialName: true,
                          materialSku: true,
                        },
                        take: 1,
                      },
                      order: {
                        select: {
                          orderId: true,
                          batchNumber: true,
                          orderName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          pallet: {
            select: {
              palletId: true,
              palletName: true,
            },
          },
          routeStage: {
            select: {
              routeStageId: true,
              stage: {
                select: {
                  stageId: true,
                  stageName: true,
                },
              },
            },
          },
          operator: {
            select: {
              userId: true,
              userDetail: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 1000, // Ограничение для безопасности
      });

      console.log(
        `Found ${operations.length} operations from MachineOperationHistory`,
      );

      // Добавляем операции из MachineOperationHistory
      result.push(
        ...operations.map((op) => {
          const packages = op.part.productionPackageParts.map((ppp) => ({
            packageId: ppp.packageId,
            packageCode: ppp.package.packageCode,
            packageName: ppp.package.packageName,
            orderId: ppp.package.orderId,
            orderBatchNumber: ppp.package.order.batchNumber,
            orderName: ppp.package.order.orderName,
          }));

          const operatorName = op.operator
            ? `${op.operator.userDetail?.firstName ?? ''} ${op.operator.userDetail?.lastName ?? ''}`.trim() ||
              null
            : null;

          // Получаем материал
          const materialId = op.part.material?.materialId ?? null;
          let materialName = op.part.material?.materialName ?? null;
          let materialSku = op.part.material?.article ?? null;

          // Если материал не найден в part, берем из composition
          if (!materialName && op.part.productionPackageParts.length > 0) {
            const firstPackage = op.part.productionPackageParts[0];
            const compositionItem = firstPackage.package.composition[0];
            if (compositionItem) {
              materialName = compositionItem.materialName;
              materialSku = compositionItem.materialSku;
            }
          }

          return {
            operationId: op.operationId,
            machineId: op.machine.machineId,
            machineName: op.machine.machineName,
            machineLoadUnit: op.machine.loadUnit,
            partId: op.part.partId,
            partCode: op.part.partCode,
            partName: op.part.partName,
            partSize: op.part.size,
            materialId: materialId,
            materialName: materialName,
            materialSku: materialSku,
            palletId: op.pallet.palletId,
            palletName: op.pallet.palletName,
            routeStageId: op.routeStageId,
            stageId: op.routeStage.stage.stageId,
            stageName: op.routeStage.stage.stageName,
            quantityProcessed: Number(op.quantityProcessed),
            startedAt: op.startedAt,
            completedAt: op.completedAt,
            durationSeconds: op.duration,
            operatorId: op.operatorId,
            operatorName,
            packages,
          };
        }),
      );

      // 1b. Получаем завершенные вручную операции из PalletStageProgress
      // (те, у которых нет соответствующей записи в MachineOperationHistory)
      const progressWhereCondition: any = {
        status: 'COMPLETED',
        completedAt: { not: null },
        isRedistributed: false,
      };

      // Фильтр по дате
      if (Object.keys(dateWhere).length > 0) {
        progressWhereCondition.completedAt = {
          ...progressWhereCondition.completedAt,
          ...dateWhere,
        };
      }

      // Фильтр по этапу
      if (dto.stageId) {
        progressWhereCondition.routeStage = { stageId: dto.stageId };
      }

      // Фильтр по заказу через palletId
      if (palletIdsForOrder && palletIdsForOrder.length > 0) {
        progressWhereCondition.palletId = { in: palletIdsForOrder };
      }

      const palletProgress = await this.prisma.palletStageProgress.findMany({
        where: progressWhereCondition,
        select: {
          pspId: true,
          palletId: true,
          routeStageId: true,
          completedAt: true,
          pallet: {
            select: {
              palletId: true,
              palletName: true,
              quantity: true,
              part: {
                select: {
                  partId: true,
                  partCode: true,
                  partName: true,
                  size: true,
                  material: {
                    select: {
                      materialId: true,
                      materialName: true,
                      article: true,
                    },
                  },
                  productionPackageParts: {
                    select: {
                      packageId: true,
                      package: {
                        select: {
                          packageId: true,
                          packageCode: true,
                          packageName: true,
                          orderId: true,
                          composition: {
                            select: {
                              materialName: true,
                              materialSku: true,
                            },
                            take: 1,
                          },
                          order: {
                            select: {
                              orderId: true,
                              batchNumber: true,
                              orderName: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          routeStage: {
            select: {
              routeStageId: true,
              stage: {
                select: {
                  stageId: true,
                  stageName: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 1000,
      });

      console.log(
        `Found ${palletProgress.length} completed pallets from PalletStageProgress`,
      );

      // Получаем список partId и routeStageId из MachineOperationHistory для исключения дубликатов
      // Используем partId (а не palletId), чтобы при перераспределении деталей на новый поддон
      // скопированный прогресс не попадал в историю обработки повторно
      const operationKeys = new Set(
        operations.map((op) => `${op.partId}-${op.routeStageId}`),
      );

      // Добавляем только те записи из PalletStageProgress, которых нет в MachineOperationHistory
      // ВАЖНО: Если фильтруем по operatorId, пропускаем ручные завершения (у них operatorId всегда null)
      const manualCompletions = palletProgress.filter(
        (progress) =>
          !operationKeys.has(`${progress.pallet.part.partId}-${progress.routeStageId}`),
      );

      // Если указан фильтр по оператору, не добавляем ручные завершения (у них нет operatorId)
      const filteredManualCompletions = dto.operatorId ? [] : manualCompletions;

      console.log(
        `Adding ${filteredManualCompletions.length} manual completions (not in MachineOperationHistory)${dto.operatorId ? ' - skipped due to operatorId filter' : ''}`,
      );

      result.push(
        ...filteredManualCompletions.map((progress) => {
          const packages = progress.pallet.part.productionPackageParts.map(
            (ppp) => ({
              packageId: ppp.packageId,
              packageCode: ppp.package.packageCode,
              packageName: ppp.package.packageName,
              orderId: ppp.package.orderId,
              orderBatchNumber: ppp.package.order.batchNumber,
              orderName: ppp.package.order.orderName,
            }),
          );

          // Получаем материал
          const materialId = progress.pallet.part.material?.materialId ?? null;
          let materialName =
            progress.pallet.part.material?.materialName ?? null;
          let materialSku = progress.pallet.part.material?.article ?? null;

          // Если материал не найден в part, берем из composition
          if (
            !materialName &&
            progress.pallet.part.productionPackageParts.length > 0
          ) {
            const firstPackage = progress.pallet.part.productionPackageParts[0];
            const compositionItem = firstPackage.package.composition[0];
            if (compositionItem) {
              materialName = compositionItem.materialName;
              materialSku = compositionItem.materialSku;
            }
          }

          return {
            operationId: progress.pspId, // Используем pspId как operationId
            machineId: 0, // Нет станка для ручного завершения
            machineName: 'Завершено мастером',
            machineLoadUnit: 'шт',
            partId: progress.pallet.part.partId,
            partCode: progress.pallet.part.partCode,
            partName: progress.pallet.part.partName,
            partSize: progress.pallet.part.size,
            materialId: materialId,
            materialName: materialName,
            materialSku: materialSku,
            palletId: progress.pallet.palletId,
            palletName: progress.pallet.palletName,
            routeStageId: progress.routeStageId,
            stageId: progress.routeStage.stage.stageId,
            stageName: progress.routeStage.stage.stageName,
            quantityProcessed: Number(progress.pallet.quantity),
            startedAt: progress.completedAt!, // Используем completedAt как startedAt
            completedAt: progress.completedAt!,
            durationSeconds: 0, // Нет данных о длительности
            operatorId: null, // Нет данных об операторе
            operatorName: null,
            packages,
          };
        }),
      );
    }

    // 2. Обрабатываем финальные станки (PackingTask)
    if (!dto.machineId || isFinalMachine) {
      const packingTaskWhere: any = {
        completedQuantity: { gt: 0 },
      };

      // Фильтр по станку
      if (dto.machineId) {
        packingTaskWhere.machineId = dto.machineId;
      } else if (finalMachineIds.length > 0) {
        packingTaskWhere.machineId = { in: finalMachineIds };
      }

      // Фильтр по дате
      if (Object.keys(dateWhere).length > 0) {
        packingTaskWhere.completedAt = dateWhere;
      }

      // Фильтр по заказу
      if (dto.orderId) {
        packingTaskWhere.package = { orderId: dto.orderId };
      }

      // Фильтр по оператору
      if (dto.operatorId) {
        packingTaskWhere.assignedTo = dto.operatorId;
      }

      const packingTasks = await this.prisma.packingTask.findMany({
        where: packingTaskWhere,
        select: {
          taskId: true,
          machineId: true,
          packageId: true,
          assignedTo: true,
          assignedAt: true,
          completedAt: true,
          completedQuantity: true,
          machine: {
            select: {
              machineId: true,
              machineName: true,
              loadUnit: true,
            },
          },
          package: {
            select: {
              packageId: true,
              packageCode: true,
              packageName: true,
              orderId: true,
              composition: {
                select: {
                  materialName: true,
                  materialSku: true,
                  routeId: true,
                },
                take: 1,
              },
              order: {
                select: {
                  orderId: true,
                  batchNumber: true,
                  orderName: true,
                },
              },
            },
          },
          assignedUser: {
            select: {
              userId: true,
              userDetail: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 1000, // Ограничение для безопасности
      });

      console.log(`Found ${packingTasks.length} tasks from PackingTask`);

      result.push(
        ...packingTasks.map((task) => {
          const packages = [
            {
              packageId: task.packageId,
              packageCode: task.package.packageCode,
              packageName: task.package.packageName,
              orderId: task.package.orderId,
              orderBatchNumber: task.package.order.batchNumber,
              orderName: task.package.order.orderName,
            },
          ];

          const operatorName = task.assignedUser
            ? `${task.assignedUser.userDetail?.firstName ?? ''} ${task.assignedUser.userDetail?.lastName ?? ''}`.trim() ||
              null
            : null;

          const routeStageId = task.package.composition[0]?.routeId || 0;
          const durationSeconds = task.completedAt
            ? Math.floor(
                (task.completedAt.getTime() - task.assignedAt.getTime()) / 1000,
              )
            : 0;

          const firstComposition = task.package.composition[0];
          const materialName = firstComposition?.materialName || null;
          const materialSku = firstComposition?.materialSku || null;

          return {
            operationId: task.taskId,
            machineId: task.machine.machineId,
            machineName: task.machine.machineName,
            machineLoadUnit: task.machine.loadUnit,
            partId: 0,
            partCode: task.package.packageCode,
            partName: task.package.packageName,
            partSize: '',
            materialId: null,
            materialName,
            materialSku,
            palletId: 0,
            palletName: '',
            routeStageId: routeStageId,
            stageId: 0,
            stageName: 'Упаковка',
            quantityProcessed: Number(task.completedQuantity),
            startedAt: task.assignedAt,
            completedAt: task.completedAt || task.assignedAt,
            durationSeconds,
            operatorId: task.assignedTo,
            operatorName,
            packages,
          };
        }),
      );
    }

    // Сортируем результат по дате завершения
    console.log(
      `Returning ${result.length} records (MachineOperationHistory + PalletStageProgress + PackingTask) for machineId: ${dto.machineId || 'all'}, orderId: ${dto.orderId || 'all'}, stageId: ${dto.stageId || 'all'}, operatorId: ${dto.operatorId || 'all'}`,
    );

    return result.sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
    );
  }
}
