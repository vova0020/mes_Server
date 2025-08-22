import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  OrderForRoutesResponseDto,
  OrderPartsForRoutesResponseDto,
  PartRouteUpdateResponseDto,
  UpdatePartRouteDto,
  OrderStatusForRoutes,
  RouteInfoDto,
  PartForRouteManagementDto,
} from '../dto/route-management.dto';

@Injectable()
export class RouteManagementService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  async getOrdersForRouteManagement(): Promise<OrderForRoutesResponseDto[]> {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: {
          in: ['PRELIMINARY', 'APPROVED'],
        },
      },
      include: {
        packages: {
          include: {
            composition: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      // Подсчитываем общее количество всех деталей в заказе (не уникальных)
      let totalParts = 0;
      order.packages.forEach(pkg => {
        totalParts += pkg.composition.length;
      });

      return {
        orderId: order.orderId,
        batchNumber: order.batchNumber,
        orderName: order.orderName,
        status: order.status as OrderStatusForRoutes,
        requiredDate: order.requiredDate.toISOString(),
        createdAt: order.createdAt.toISOString(),
        totalParts,
      };
    });
  }

  async getOrderPartsForRouteManagement(
    orderId: number,
  ): Promise<OrderPartsForRoutesResponseDto> {
    // Получаем заказ с композицией упаковок
    const order = await this.prismaService.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            composition: {
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
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    // Проверяем, что заказ имеет подходящий статус
    if (!['PRELIMINARY', 'APPROVED'].includes(order.status)) {
      throw new BadRequestException(
        `Заказ должен иметь статус "Предварительный" или "Утверждено" для управления маршрутами. Текущий статус: ${order.status}`,
      );
    }

    // Получаем все доступные маршруты
    const availableRoutes = await this.getAvailableRoutes();

    // Формируем информацию о заказе
    const orderInfo: OrderForRoutesResponseDto = {
      orderId: order.orderId,
      batchNumber: order.batchNumber,
      orderName: order.orderName,
      status: order.status as OrderStatusForRoutes,
      requiredDate: order.requiredDate.toISOString(),
      createdAt: order.createdAt.toISOString(),
      totalParts: 0, // Будет пересчитано ниже
    };

    // Собираем все детали из композиции упаковок (каждая деталь отдельно)
    const parts: PartForRouteManagementDto[] = [];
    
    for (const pkg of order.packages) {
      for (const comp of pkg.composition) {
        // Формируем информацию о текущем маршруте
        const currentRoute: RouteInfoDto = {
          routeId: comp.route.routeId,
          routeName: comp.route.routeName,
          stages: comp.route.routeStages.map((rs) => ({
            routeStageId: rs.routeStageId,
            stageName: rs.stage.stageName,
            substageName: rs.substage?.substageName,
            sequenceNumber: Number(rs.sequenceNumber),
          })),
        };

        // Каждая деталь из каждой упаковки - отдельная запись
        parts.push({
          partId: comp.compositionId, // Используем compositionId как ID
          partCode: comp.partCode,
          partName: comp.partName,
          totalQuantity: Number(comp.quantity),
          status: 'PENDING',
          currentRoute,
          size: comp.partSize,
          materialName: 'Не указан',
          packages: [{
            packageId: pkg.packageId,
            packageCode: pkg.packageCode,
            packageName: pkg.packageName,
            quantity: Number(comp.quantity),
          }],
        });
      }
    }

    orderInfo.totalParts = parts.length;

    return {
      order: orderInfo,
      parts,
      availableRoutes,
    };
  }

  async updatePartRoute(
    partId: number,
    updateDto: UpdatePartRouteDto,
  ): Promise<PartRouteUpdateResponseDto> {
    // Получаем композицию по ID (partId здесь это compositionId)
    const composition = await this.prismaService.packageComposition.findUnique({
      where: { compositionId: partId },
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
        package: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!composition) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    const order = composition.package.order;

    // Запрещаем изменение маршрута если заказ уже в работе
    if (['LAUNCH_PERMITTED', 'IN_PROGRESS', 'COMPLETED'].includes(order.status)) {
      throw new BadRequestException(
        `Нельзя изменять маршруты у деталей из заказов со статусом "${order.status}". Изменение маршрутов разрешено только для заказов со статусом "Предварительный" или "Утверждено"`,
      );
    }

    // Проверяем, что новый маршрут существует
    const newRoute = await this.prismaService.route.findUnique({
      where: { routeId: updateDto.routeId },
      include: {
        routeStages: {
          include: {
            stage: true,
            substage: true,
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });

    if (!newRoute) {
      throw new NotFoundException(`Маршрут с ID ${updateDto.routeId} не найден`);
    }

    // Проверяем, что маршрут действительно изменяется
    if (composition.routeId === updateDto.routeId) {
      throw new BadRequestException('Новый маршрут совпадает с текущим');
    }

    // Сохраняем информацию о предыдущем маршруте
    const previousRoute: RouteInfoDto = {
      routeId: composition.route.routeId,
      routeName: composition.route.routeName,
      stages: composition.route.routeStages.map((rs) => ({
        routeStageId: rs.routeStageId,
        stageName: rs.stage.stageName,
        substageName: rs.substage?.substageName,
        sequenceNumber: Number(rs.sequenceNumber),
      })),
    };

    // Обновляем маршрут во всех композициях с таким же partCode в этом заказе
    await this.prismaService.packageComposition.updateMany({
      where: {
        partCode: composition.partCode,
        package: {
          orderId: order.orderId,
        },
      },
      data: {
        routeId: updateDto.routeId,
      },
    });

    const newRouteInfo: RouteInfoDto = {
      routeId: newRoute.routeId,
      routeName: newRoute.routeName,
      stages: newRoute.routeStages.map((rs) => ({
        routeStageId: rs.routeStageId,
        stageName: rs.stage.stageName,
        substageName: rs.substage?.substageName,
        sequenceNumber: Number(rs.sequenceNumber),
      })),
    };

    const result: PartRouteUpdateResponseDto = {
      partId: composition.compositionId,
      partCode: composition.partCode,
      partName: composition.partName,
      previousRoute,
      newRoute: newRouteInfo,
      updatedAt: new Date().toISOString(),
    };

    // Отправляем событие об изменении маршрута
   

    return result;
  }

  async getAllRoutes(): Promise<RouteInfoDto[]> {
    return this.getAvailableRoutes();
  }

  private async getAvailableRoutes(): Promise<RouteInfoDto[]> {
    const routes = await this.prismaService.route.findMany({
      include: {
        routeStages: {
          include: {
            stage: true,
            substage: true,
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
      orderBy: { routeName: 'asc' },
    });

    return routes.map((route) => ({
      routeId: route.routeId,
      routeName: route.routeName,
      stages: route.routeStages.map((rs) => ({
        routeStageId: rs.routeStageId,
        stageName: rs.stage.stageName,
        substageName: rs.substage?.substageName,
        sequenceNumber: Number(rs.sequenceNumber),
      })),
    }));
  }
}