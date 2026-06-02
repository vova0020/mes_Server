import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';

@Injectable()
export class CustomDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение всех деталей для определенного заказа с фильтрацией по этапу
  async getDetailsByOrderId(customOrderId: number, stageId?: number) {
    // Проверяем существование заказа
    const order = await this.prisma.customOrder.findUnique({
      where: { customOrderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с id ${customOrderId} не найден`);
    }

    // Получаем все детали заказа с учетом фильтрации по этапу
    const parts = await this.prisma.customOrderPart.findMany({
      where: { customOrderId },
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
            customPallet: {
              select: {
                customPalletId: true,
                palletName: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        partCode: 'asc',
      },
    });

    // Фильтруем детали по этапу, если stageId указан
    let filteredParts = parts;
    if (stageId !== undefined) {
      filteredParts = parts.filter((part) => {
        // Проверяем, есть ли указанный этап в маршруте детали
        return part.route.routeStages.some((rs) => rs.stageId === stageId);
      });
    }

    // Форматируем ответ, преобразуя Decimal в number
    const formattedParts = filteredParts.map((part) => {
      // Подсчитываем распределенное количество по активным поддонам
      const distributedQuantity = part.customPalletParts
        .filter((cpp) => cpp.customPallet.isActive)
        .reduce((sum, cpp) => sum + cpp.quantity.toNumber(), 0);

      const totalQuantity = part.quantity.toNumber();
      const undistributedQuantity = totalQuantity - distributedQuantity;

      return {
        customPartId: part.customPartId,
        customOrderId: part.customOrderId,
        partCode: part.partCode,
        partName: part.partName,
        materialName: part.materialName,
        materialSku: part.materialSku,
        thickness: part.thickness,
        thicknessWithEdging: part.thicknessWithEdging,
        quantity: totalQuantity,
        distributedQuantity,
        undistributedQuantity,
        blankLength: part.blankLength,
        blankWidth: part.blankWidth,
        finishedLength: part.finishedLength,
        finishedWidth: part.finishedWidth,
        groove: part.groove,
        edgingSkuL1: part.edgingSkuL1,
        edgingNameL1: part.edgingNameL1,
        edgingSkuL2: part.edgingSkuL2,
        edgingNameL2: part.edgingNameL2,
        edgingSkuW1: part.edgingSkuW1,
        edgingNameW1: part.edgingNameW1,
        edgingSkuW2: part.edgingSkuW2,
        edgingNameW2: part.edgingNameW2,
        plasticFace: part.plasticFace,
        plasticFaceSku: part.plasticFaceSku,
        plasticBack: part.plasticBack,
        plasticBackSku: part.plasticBackSku,
        additionalMaterial: part.additionalMaterial,
        pf: part.pf,
        pfSku: part.pfSku,
        sbPart: part.sbPart,
        pfSb: part.pfSb,
        sbPartSku: part.sbPartSku,
        conveyorPosition: part.conveyorPosition,
        routeId: part.routeId,
        status: part.status,
        route: {
          routeId: part.route.routeId,
          routeName: part.route.routeName,
          routeStages: part.route.routeStages.map((rs) => ({
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
        pallets: part.customPalletParts.map((cpp) => ({
          customPalletId: cpp.customPallet.customPalletId,
          palletName: cpp.customPallet.palletName,
          isActive: cpp.customPallet.isActive,
          quantityOnPallet: cpp.quantity.toNumber(),
        })),
      };
    });

    return {
      orderId: customOrderId,
      orderNumber: order.orderNumber,
      orderName: order.orderName,
      totalParts: formattedParts.length,
      parts: formattedParts,
    };
  }
}
