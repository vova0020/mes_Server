import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { CreateCustomPalletDto } from '../dto/create-custom-pallet.dto';

@Injectable()
export class CustomPalletsService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение всех поддонов для заказа
  async getPalletsByOrderId(customOrderId: number, stageId?: number) {
    const order = await this.prisma.customOrder.findUnique({
      where: { customOrderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с id ${customOrderId} не найден`);
    }

    const pallets = await this.prisma.customPallet.findMany({
      where: {
        customPalletParts: {
          some: {
            customPart: {
              customOrderId,
            },
          },
        },
      },
      include: {
        customPalletParts: {
          include: {
            customPart: {
              include: {
                route: {
                  include: {
                    routeStages: {
                      orderBy: { sequenceNumber: 'asc' },
                    },
                  },
                },
              },
            },
            stageProgress: {
              include: {
                routeStage: true,
              },
            },
          },
        },
        customMachineAssignments: {
          include: {
            machine: true,
            routeStage: {
              include: {
                stage: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (pallets.length === 0) {
      return {
        status: 'NO_PALLETS',
        message: 'У данного заказа нет поддонов',
        pallets: [],
      };
    }

    const formattedPallets = pallets.map((pallet) => {
      let readyQuantity = 0;
      let completedQuantity = 0;
      let palletStatus = 'NOT_PROCESSED';
      let currentMachine: any = null;
      let completedByMachine: any = null;

      if (stageId) {
        // Подсчитываем общее количество деталей на поддоне для данного этапа
        let totalQuantityForStage = 0;
        let hasInProgressPart = false;
        let hasCompletedPart = false;
        let allPartsCompleted = true;
        
        for (const palletPart of pallet.customPalletParts) {
          const part = palletPart.customPart;
          const routeStages = part.route.routeStages;
          const stageIndex = routeStages.findIndex((rs) => rs.stageId === stageId);

          if (stageIndex === -1) continue;

          const partQty = palletPart.quantity.toNumber();
          totalQuantityForStage += partQty;
          const currentStage = routeStages[stageIndex];

          // Находим прогресс для текущего этапа
          const progress = palletPart.stageProgress.find(
            (p) => p.routeStageId === currentStage.routeStageId,
          );

          const completed = progress?.completedQuantity.toNumber() || 0;
          completedQuantity += completed;

          // Проверяем статус прогресса для этой детали на данном этапе
          if (progress) {
            if (progress.status === 'IN_PROGRESS') {
              hasInProgressPart = true;
            }
            if (progress.status === 'COMPLETED' || completed >= partQty) {
              hasCompletedPart = true;
            } else {
              allPartsCompleted = false;
            }
          } else {
            allPartsCompleted = false;
          }

          // Готово к обработке
          if (stageIndex === 0) {
            // Первый этап - все детали готовы
            readyQuantity += partQty;
          } else {
            // Не первый этап - смотрим сколько прошло предыдущий этап
            const prevStage = routeStages[stageIndex - 1];
            const prevProgress = palletPart.stageProgress.find(
              (p) => p.routeStageId === prevStage.routeStageId,
            );
            const prevCompleted = prevProgress?.completedQuantity.toNumber() || 0;
            readyQuantity += prevCompleted;
          }
        }

        // Определяем статус поддона для этапа
        // Если хотя бы одна деталь в работе на этом этапе - поддон в работе
        // Если все детали завершили этот этап - поддон завершен
        if (totalQuantityForStage === 0) {
          palletStatus = 'NOT_PROCESSED';
        } else if (hasInProgressPart) {
          palletStatus = 'IN_PROGRESS';
        } else if (allPartsCompleted && completedQuantity >= totalQuantityForStage) {
          palletStatus = 'COMPLETED';
        } else if (hasCompletedPart || completedQuantity > 0) {
          palletStatus = 'IN_PROGRESS';
        } else if (readyQuantity > 0) {
          palletStatus = 'PENDING';
        } else {
          palletStatus = 'NOT_PROCESSED';
        }

        // Находим текущий или завершенный станок для этого этапа
        const stageAssignments = pallet.customMachineAssignments.filter(
          (a) => a.routeStage.stageId === stageId,
        );

        const activeAssignment = stageAssignments.find(
          (a) => a.status === 'IN_PROGRESS' || a.status === 'PENDING',
        );
        const completedAssignment = stageAssignments.find(
          (a) => a.status === 'COMPLETED',
        );

        if (activeAssignment) {
          currentMachine = {
            machineId: activeAssignment.machine.machineId,
            machineName: activeAssignment.machine.machineName,
            assignmentStatus: activeAssignment.status,
          };
        }

        if (completedAssignment) {
          completedByMachine = {
            machineId: completedAssignment.machine.machineId,
            machineName: completedAssignment.machine.machineName,
            completedAt: completedAssignment.completedAt,
          };
        }
      }

      return {
        customPalletId: pallet.customPalletId,
        palletName: pallet.palletName,
        isActive: pallet.isActive,
        createdAt: pallet.createdAt,
        readyToProcess: readyQuantity,
        completed: completedQuantity,
        status: palletStatus,
        currentMachine,
        completedByMachine,
        parts: pallet.customPalletParts.map((cpp) => ({
          customPartId: cpp.customPart.customPartId,
          partCode: cpp.customPart.partCode,
          partName: cpp.customPart.partName,
          materialName: cpp.customPart.materialName,
          status: cpp.customPart.status,
          quantity: cpp.quantity.toNumber(),
        })),
      };
    });

    return {
      status: 'SUCCESS',
      message: `Найдено поддонов: ${pallets.length}`,
      pallets: formattedPallets,
    };
  }

  // Получение деталей конкретного поддона
  async getPartsByPalletId(customPalletId: number, stageId?: number) {
    // Проверяем существование поддона
    const pallet = await this.prisma.customPallet.findUnique({
      where: { customPalletId },
      include: {
        customPalletParts: {
          include: {
            customPart: {
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
              },
            },
            stageProgress: {
              include: {
                routeStage: true,
              },
            },
          },
        },
      },
    });

    if (!pallet) {
      throw new NotFoundException(`Поддон с id ${customPalletId} не найден`);
    }

    // Форматируем ответ
    const parts = pallet.customPalletParts.map((cpp) => {
      let stageStatus: string | null = null;
      let stageCompletedQuantity = 0;
      let stageReadyQuantity = 0;

      // Если передан stageId, вычисляем статус для этого этапа
      if (stageId) {
        const routeStages = cpp.customPart.route.routeStages;
        // Ищем этап в маршруте по stageId (это ID из production_stages_level_1)
        const currentRouteStage = routeStages.find((rs) => rs.stageId === stageId);

        if (currentRouteStage) {
          const partQty = cpp.quantity.toNumber();

          // Находим прогресс для текущего этапа по routeStageId
          const progress = cpp.stageProgress.find(
            (p) => p.routeStageId === currentRouteStage.routeStageId,
          );

          stageCompletedQuantity = progress?.completedQuantity.toNumber() || 0;

          // Определяем статус детали для этого этапа на основе статуса в прогрессе
          if (progress) {
            // Если есть запись прогресса, используем её статус
            if (progress.status === 'COMPLETED' || stageCompletedQuantity >= partQty) {
              stageStatus = 'COMPLETED';
            } else if (progress.status === 'IN_PROGRESS') {
              stageStatus = 'IN_PROGRESS';
            } else if (progress.status === 'PENDING') {
              stageStatus = 'PENDING';
              stageReadyQuantity = partQty - stageCompletedQuantity;
            } else {
              stageStatus = 'NOT_PROCESSED';
            }
          } else {
            // Нет записи прогресса - проверяем готовность к обработке
            const stageIndex = routeStages.findIndex(
              (rs) => rs.routeStageId === currentRouteStage.routeStageId,
            );

            if (stageIndex === 0) {
              // Первый этап - деталь готова к обработке
              stageStatus = 'PENDING';
              stageReadyQuantity = partQty;
            } else {
              // Не первый этап - проверяем предыдущий этап
              const prevStage = routeStages[stageIndex - 1];
              const prevProgress = cpp.stageProgress.find(
                (p) => p.routeStageId === prevStage.routeStageId,
              );
              const prevCompleted = prevProgress?.completedQuantity.toNumber() || 0;

              if (prevCompleted >= partQty) {
                stageStatus = 'PENDING';
                stageReadyQuantity = partQty;
              } else if (prevCompleted > 0) {
                stageStatus = 'PENDING';
                stageReadyQuantity = prevCompleted;
              } else {
                stageStatus = 'NOT_PROCESSED';
              }
            }
          }
        }
      }

      return {
        customPartId: cpp.customPart.customPartId,
        customOrderId: cpp.customPart.customOrderId,
        partCode: cpp.customPart.partCode,
        partName: cpp.customPart.partName,
        materialName: cpp.customPart.materialName,
        materialSku: cpp.customPart.materialSku,
        thickness: cpp.customPart.thickness,
        thicknessWithEdging: cpp.customPart.thicknessWithEdging,
        totalQuantity: cpp.customPart.quantity.toNumber(),
        quantityOnPallet: cpp.quantity.toNumber(),
        blankLength: cpp.customPart.blankLength,
        blankWidth: cpp.customPart.blankWidth,
        finishedLength: cpp.customPart.finishedLength,
        finishedWidth: cpp.customPart.finishedWidth,
        groove: cpp.customPart.groove,
        edgingSkuL1: cpp.customPart.edgingSkuL1,
        edgingNameL1: cpp.customPart.edgingNameL1,
        edgingSkuL2: cpp.customPart.edgingSkuL2,
        edgingNameL2: cpp.customPart.edgingNameL2,
        edgingSkuW1: cpp.customPart.edgingSkuW1,
        edgingNameW1: cpp.customPart.edgingNameW1,
        edgingSkuW2: cpp.customPart.edgingSkuW2,
        edgingNameW2: cpp.customPart.edgingNameW2,
        plasticFace: cpp.customPart.plasticFace,
        plasticFaceSku: cpp.customPart.plasticFaceSku,
        plasticBack: cpp.customPart.plasticBack,
        plasticBackSku: cpp.customPart.plasticBackSku,
        additionalMaterial: cpp.customPart.additionalMaterial,
        pf: cpp.customPart.pf,
        pfSku: cpp.customPart.pfSku,
        sbPart: cpp.customPart.sbPart,
        pfSb: cpp.customPart.pfSb,
        sbPartSku: cpp.customPart.sbPartSku,
        conveyorPosition: cpp.customPart.conveyorPosition,
        routeId: cpp.customPart.routeId,
        status: cpp.customPart.status,
        // Статусы для конкретного этапа (если stageId передан)
        ...(stageId && {
          stageStatus,
          stageCompletedQuantity,
          stageReadyQuantity,
        }),
        route: {
          routeId: cpp.customPart.route.routeId,
          routeName: cpp.customPart.route.routeName,
          routeStages: cpp.customPart.route.routeStages.map((rs) => ({
            routeStageId: rs.routeStageId,
            sequenceNumber: rs.sequenceNumber.toNumber(),
            stage: {
              stageId: rs.stage.stageId,
              stageName: rs.stage.stageName,
            },
            substage: rs.substage
              ? {
                  substageId: rs.substage.substageId,
                  substageName: rs.substage.substageName,
                }
              : null,
          })),
        },
      };
    });

    return {
      customPalletId: pallet.customPalletId,
      palletName: pallet.palletName,
      isActive: pallet.isActive,
      createdAt: pallet.createdAt,
      totalParts: parts.length,
      ...(stageId && { stageId }),
      parts,
    };
  }

  // Создание поддона с деталями
  async createPallet(customOrderId: number, dto: CreateCustomPalletDto) {
    // Проверяем существование заказа
    const order = await this.prisma.customOrder.findUnique({
      where: { customOrderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с id ${customOrderId} не найден`);
    }

    // Проверяем, что все детали существуют и принадлежат этому заказу
    const partIds = dto.parts.map((p) => p.customPartId);
    const parts = await this.prisma.customOrderPart.findMany({
      where: {
        customPartId: { in: partIds },
        customOrderId,
      },
    });

    if (parts.length !== partIds.length) {
      throw new BadRequestException(
        'Одна или несколько деталей не найдены или не принадлежат этому заказу',
      );
    }

    // Проверяем, что количество деталей не превышает доступное
    for (const partDto of dto.parts) {
      const part = parts.find((p) => p.customPartId === partDto.customPartId);
      if (part && partDto.quantity > part.quantity.toNumber()) {
        throw new BadRequestException(
          `Количество детали ${part.partCode} (${partDto.quantity}) превышает доступное количество (${part.quantity.toNumber()})`,
        );
      }
    }

    // Создаем поддон с деталями
    const pallet = await this.prisma.customPallet.create({
      data: {
        palletName: dto.palletName,
        customPalletParts: {
          create: dto.parts.map((p) => ({
            customPartId: p.customPartId,
            quantity: p.quantity,
          })),
        },
      },
      include: {
        customPalletParts: {
          include: {
            customPart: {
              select: {
                customPartId: true,
                partCode: true,
                partName: true,
                materialName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Форматируем ответ
    return {
      customPalletId: pallet.customPalletId,
      palletName: pallet.palletName,
      isActive: pallet.isActive,
      createdAt: pallet.createdAt,
      parts: pallet.customPalletParts.map((cpp) => ({
        customPartId: cpp.customPart.customPartId,
        partCode: cpp.customPart.partCode,
        partName: cpp.customPart.partName,
        materialName: cpp.customPart.materialName,
        status: cpp.customPart.status,
        quantity: cpp.quantity.toNumber(),
      })),
    };
  }

  // Удаление поддона
  async deletePallet(customPalletId: number) {
    // Проверяем существование поддона
    const pallet = await this.prisma.customPallet.findUnique({
      where: { customPalletId },
      include: {
        customPalletParts: true,
      },
    });

    if (!pallet) {
      throw new NotFoundException(`Поддон с id ${customPalletId} не найден`);
    }

    // Проверяем, есть ли детали на поддоне
    if (pallet.customPalletParts.length > 0) {
      throw new BadRequestException(
        'Невозможно удалить поддон, на нем есть детали. Сначала удалите все детали с поддона.',
      );
    }

    // Удаляем поддон
    await this.prisma.customPallet.delete({
      where: { customPalletId },
    });

    return {
      message: `Поддон ${pallet.palletName} успешно удален`,
    };
  }

  // Перераспределение деталей между поддонами
  async redistributeParts(dto: any) {
    const { fromPalletId, toPalletId, newPalletName, parts } = dto;

    // Валидация входных данных
    if (!fromPalletId) {
      throw new BadRequestException('Не указан исходный поддон (fromPalletId)');
    }

    if (!toPalletId && !newPalletName && newPalletName !== '') {
      throw new BadRequestException(
        'Необходимо указать либо существующий поддон (toPalletId), либо название нового поддона (newPalletName)',
      );
    }

    if (!parts || parts.length === 0) {
      throw new BadRequestException(
        'Необходимо указать хотя бы одну деталь для перемещения',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Проверяем исходный поддон
      const fromPallet = await tx.customPallet.findUnique({
        where: { customPalletId: fromPalletId },
        include: {
          customPalletParts: {
            include: {
              stageProgress: true,
            },
          },
        },
      });

      if (!fromPallet) {
        throw new NotFoundException(`Поддон с id ${fromPalletId} не найден`);
      }

      // Определяем целевой поддон
      let targetPallet;
      if (toPalletId) {
        // Перенос на существующий поддон
        targetPallet = await tx.customPallet.findUnique({
          where: { customPalletId: toPalletId },
        });

        if (!targetPallet) {
          throw new NotFoundException(`Целевой поддон с id ${toPalletId} не найден`);
        }
      } else {
        // Создаем новый поддон
        const palletName = newPalletName || `Поддон-${Date.now()}`;
        targetPallet = await tx.customPallet.create({
          data: { palletName },
        });
      }

      // Перемещаем детали
      for (const partDto of parts) {
        const { customPartId, quantity } = partDto;

        // Находим запись на исходном поддоне
        const sourcePalletPart = fromPallet.customPalletParts.find(
          (cpp) => cpp.customPartId === customPartId,
        );

        if (!sourcePalletPart) {
          throw new BadRequestException(
            `Деталь с id ${customPartId} не найдена на поддоне ${fromPalletId}`,
          );
        }

        if (quantity > sourcePalletPart.quantity.toNumber()) {
          throw new BadRequestException(
            `Количество для переноса (${quantity}) превышает доступное на поддоне (${sourcePalletPart.quantity.toNumber()})`,
          );
        }

        // Проверяем, есть ли уже эта деталь на целевом поддоне
        const existingTargetPart = await tx.customPalletPart.findFirst({
          where: {
            customPalletId: targetPallet.customPalletId,
            customPartId,
          },
        });

        if (existingTargetPart) {
          // Обновляем количество на целевом поддоне
          await tx.customPalletPart.update({
            where: { id: existingTargetPart.id },
            data: {
              quantity: {
                increment: quantity,
              },
            },
          });

          // Копируем прогресс по этапам
          for (const progress of sourcePalletPart.stageProgress) {
            const existingProgress = await tx.customPalletPartStageProgress.findUnique({
              where: {
                palletPartId_routeStageId: {
                  palletPartId: existingTargetPart.id,
                  routeStageId: progress.routeStageId,
                },
              },
            });

            if (existingProgress) {
              // Обновляем количество
              await tx.customPalletPartStageProgress.update({
                where: { progressId: existingProgress.progressId },
                data: {
                  completedQuantity: {
                    increment: progress.completedQuantity,
                  },
                },
              });
            } else {
              // Создаем новую запись прогресса
              await tx.customPalletPartStageProgress.create({
                data: {
                  palletPartId: existingTargetPart.id,
                  routeStageId: progress.routeStageId,
                  completedQuantity: progress.completedQuantity,
                  status: progress.status,
                  startedAt: progress.startedAt,
                  completedAt: progress.completedAt,
                },
              });
            }
          }
        } else {
          // Создаем новую запись на целевом поддоне
          const newPalletPart = await tx.customPalletPart.create({
            data: {
              customPalletId: targetPallet.customPalletId,
              customPartId,
              quantity,
            },
          });

          // Копируем прогресс по этапам
          for (const progress of sourcePalletPart.stageProgress) {
            await tx.customPalletPartStageProgress.create({
              data: {
                palletPartId: newPalletPart.id,
                routeStageId: progress.routeStageId,
                completedQuantity: progress.completedQuantity,
                status: progress.status,
                startedAt: progress.startedAt,
                completedAt: progress.completedAt,
              },
            });
          }
        }

        // Уменьшаем количество на исходном поддоне
        const newQuantity = sourcePalletPart.quantity.toNumber() - quantity;
        if (newQuantity === 0) {
          // Удаляем запись (прогресс удалится автоматически через onDelete: Cascade)
          await tx.customPalletPart.delete({
            where: { id: sourcePalletPart.id },
          });
        } else {
          await tx.customPalletPart.update({
            where: { id: sourcePalletPart.id },
            data: { quantity: newQuantity },
          });
        }
      }

      // Проверяем, остались ли детали на исходном поддоне
      const remainingParts = await tx.customPalletPart.count({
        where: { customPalletId: fromPalletId },
      });

      if (remainingParts === 0) {
        // Удаляем пустой поддон
        await tx.customPallet.delete({
          where: { customPalletId: fromPalletId },
        });
      }

      // Возвращаем информацию о целевом поддоне
      const result = await tx.customPallet.findUnique({
        where: { customPalletId: targetPallet.customPalletId },
        include: {
          customPalletParts: {
            include: {
              customPart: true,
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundException('Целевой поддон не найден после операции');
      }

      return {
        message: remainingParts === 0 
          ? `Детали перемещены. Исходный поддон ${fromPallet.palletName} удален (был пустой)`
          : 'Детали успешно перемещены',
        sourcePalletDeleted: remainingParts === 0,
        targetPallet: {
          customPalletId: result.customPalletId,
          palletName: result.palletName,
          isActive: result.isActive,
          parts: result.customPalletParts.map((cpp) => ({
            customPartId: cpp.customPart.customPartId,
            partCode: cpp.customPart.partCode,
            partName: cpp.customPart.partName,
            quantity: cpp.quantity.toNumber(),
          })),
        },
      };
    });
  }
}
