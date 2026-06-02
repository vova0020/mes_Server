import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { SaveCustomOrderFromFileDto } from '../dto/custom-order-from-file.dto';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class CustomOrderFromFileService {
  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  async saveOrder(dto: SaveCustomOrderFromFileDto) {
    // Проверяем, существует ли заказ с таким номером
    const existingOrder = await this.prisma.customOrder.findFirst({
      where: { orderNumber: dto.orderNumber },
    });

    if (existingOrder) {
      throw new BadRequestException(
        `Заказ с номером "${dto.orderNumber}" уже существует`,
      );
    }

    // Создаем заказ для индивидуального производства
    // ВРЕМЕННО: статус сразу LAUNCH_PERMITTED для упрощения работы
    const order = await this.prisma.customOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        orderName: dto.orderName,
        requiredDate: new Date(dto.requiredDate),
        completionPercentage: 0,
        status: 'LAUNCH_PERMITTED',
        priority: dto.priority || 0,
      },
    });

    // Создаем детали заказа со всеми полями из файла
    for (const partDto of dto.parts) {
      await this.prisma.customOrderPart.create({
        data: {
          customOrderId: order.customOrderId,
          partCode: partDto.partCode || partDto.partSku || `AUTO-${Date.now()}`,
          partName: partDto.partName,
          materialName: partDto.materialName ? String(partDto.materialName) : '',
          materialSku: partDto.materialSku ? String(partDto.materialSku) : '',
          thickness: partDto.thickness ?? undefined,
          thicknessWithEdging: partDto.thicknessWithEdging ?? undefined,
          quantity: partDto.quantity,
          blankLength: partDto.blankLength ?? undefined,
          blankWidth: partDto.blankWidth ?? undefined,
          finishedLength: partDto.finishedLength ?? undefined,
          finishedWidth: partDto.finishedWidth ?? undefined,
          groove: partDto.groove ?? undefined,
          edgingSkuL1:
            partDto.edgingSkuL1 !== null && partDto.edgingSkuL1 !== undefined
              ? String(partDto.edgingSkuL1)
              : undefined,
          edgingNameL1: partDto.edgingNameL1 ?? undefined,
          edgingSkuL2:
            partDto.edgingSkuL2 !== null && partDto.edgingSkuL2 !== undefined
              ? String(partDto.edgingSkuL2)
              : undefined,
          edgingNameL2: partDto.edgingNameL2 ?? undefined,
          edgingSkuW1:
            partDto.edgingSkuW1 !== null && partDto.edgingSkuW1 !== undefined
              ? String(partDto.edgingSkuW1)
              : undefined,
          edgingNameW1: partDto.edgingNameW1 ?? undefined,
          edgingSkuW2:
            partDto.edgingSkuW2 !== null && partDto.edgingSkuW2 !== undefined
              ? String(partDto.edgingSkuW2)
              : undefined,
          edgingNameW2: partDto.edgingNameW2 ?? undefined,
          plasticFace: partDto.plasticFace ?? undefined,
          plasticFaceSku:
            partDto.plasticFaceSku !== null &&
            partDto.plasticFaceSku !== undefined
              ? String(partDto.plasticFaceSku)
              : undefined,
          plasticBack: partDto.plasticBack ?? undefined,
          plasticBackSku:
            partDto.plasticBackSku !== null &&
            partDto.plasticBackSku !== undefined
              ? String(partDto.plasticBackSku)
              : undefined,
          additionalMaterial: partDto.additionalMaterial ?? undefined,
          pf:
            partDto.pf !== null && partDto.pf !== undefined
              ? Boolean(partDto.pf)
              : undefined,
          pfSku: partDto.pfSku ?? undefined,
          sbPart:
            partDto.sbPart !== null && partDto.sbPart !== undefined
              ? Boolean(partDto.sbPart)
              : undefined,
          pfSb:
            partDto.pfSb !== null && partDto.pfSb !== undefined
              ? Boolean(partDto.pfSb)
              : undefined,
          sbPartSku: partDto.sbPartSku ?? undefined,
          conveyorPosition: partDto.conveyorPosition ?? undefined,
          routeId: partDto.routeId,
          status: 'PENDING',
        },
      });
    }

    // Отправляем WebSocket уведомление
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:director',
      ],
      'custom-order:event',
      { status: 'created', orderId: order.customOrderId },
    );

    return {
      message: 'Заказ для индивидуального производства успешно создан',
      customOrderId: order.customOrderId,
      orderNumber: order.orderNumber,
      partsCount: dto.parts.length,
    };
  }
}
