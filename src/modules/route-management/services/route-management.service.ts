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
import { EventsService } from '../../websocket/services/events.service';
import { WebSocketRooms } from '../../websocket/types/rooms.types';

@Injectable()
export class RouteManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
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
            productionPackageParts: {
              include: {
                part: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      // Подсчитываем общее количество деталей в заказе
      const totalParts = order.packages.reduce((total, pkg) => {
        return total + pkg.productionPackageParts.length;
      }, 0);

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
    // Получаем заказ с деталями
    const order = await this.prismaService.order.findUnique({
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
                          include: {
                            stage: true,
                            substage: true,
                          },
                          orderBy: { sequenceNumber: 'asc' },
                        },
                      },
                    },
                    material: true,
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

    // Собираем все детали из всех упаковок
    const parts: PartForRouteManagementDto[] = [];
    
    for (const pkg of order.packages) {
      for (const ppp of pkg.productionPackageParts) {
        const part = ppp.part;
        
        // Формируем информацию о текущем маршруте
        const currentRoute: RouteInfoDto = {
          routeId: part.route.routeId,
          routeName: part.route.routeName,
          stages: part.route.routeStages.map((rs) => ({
            routeStageId: rs.routeStageId,
            stageName: rs.stage.stageName,
            substageName: rs.substage?.substageName,
            sequenceNumber: Number(rs.sequenceNumber),
          })),
        };

        // Собираем информацию об упаковках, где используется эта деталь
        const packageInfo = {
          packageId: pkg.packageId,
          packageCode: pkg.packageCode,
          packageName: pkg.packageName,
          quantity: Number(ppp.quantity),
        };

        // Проверяем, есть ли уже эта деталь в списке (может быть в нескольких упаковках)
        const existingPartIndex = parts.findIndex(p => p.partId === part.partId);
        
        if (existingPartIndex >= 0) {
          // Добавляем упаковку к существующей детали
          parts[existingPartIndex].packages.push(packageInfo);
        } else {
          // Добавляем новую деталь
          parts.push({
            partId: part.partId,
            partCode: part.partCode,
            partName: part.partName,
            totalQuantity: Number(part.totalQuantity),
            status: part.status,
            currentRoute,
            size: part.size,
            materialName: part.material?.materialName || 'Не указан',
            packages: [packageInfo],
          });
        }
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
    // Получаем текущую деталь с маршрутом
    const currentPart = await this.prismaService.part.findUnique({
      where: { partId },
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
    });

    if (!currentPart) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    // Проверяем, что деталь принадлежит заказу с подходящим статусом
    const order = currentPart.productionPackageParts[0]?.package?.order;
    if (!order || !['PRELIMINARY', 'APPROVED'].includes(order.status)) {
      throw new BadRequestException(
        'Можно изменять маршруты только у деталей из заказов со статусом "Предварительный" или "Утверждено"',
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
    if (currentPart.routeId === updateDto.routeId) {
      throw new BadRequestException('Новый маршрут совпадает с текущим');
    }

    // Сохраняем информацию о предыдущем маршруте
    const previousRoute: RouteInfoDto = {
      routeId: currentPart.route.routeId,
      routeName: currentPart.route.routeName,
      stages: currentPart.route.routeStages.map((rs) => ({
        routeStageId: rs.routeStageId,
        stageName: rs.stage.stageName,
        substageName: rs.substage?.substageName,
        sequenceNumber: Number(rs.sequenceNumber),
      })),
    };

    // Обновляем маршрут детали в транзакции
    await this.prismaService.$transaction(async (prisma) => {
      // Обновляем маршрут детали
      await prisma.part.update({
        where: { partId },
        data: {
          routeId: updateDto.routeId,
        },
      });

      // Удаляем старый прогресс по маршруту
      await prisma.partRouteProgress.deleteMany({
        where: { partId },
      });

      // Создаем новый прогресс для нового маршрута
      const newRouteStages = await prisma.routeStage.findMany({
        where: { routeId: updateDto.routeId },
        orderBy: { sequenceNumber: 'asc' },
      });

      for (const routeStage of newRouteStages) {
        await prisma.partRouteProgress.create({
          data: {
            partId,
            routeStageId: routeStage.routeStageId,
            status: 'NOT_PROCESSED',
          },
        });
      }
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
      partId: currentPart.partId,
      partCode: currentPart.partCode,
      partName: currentPart.partName,
      previousRoute,
      newRoute: newRouteInfo,
      updatedAt: new Date().toISOString(),
    };

    // Отправляем событие об изменении маршрута
    this.eventsService.emitToRoom(
      WebSocketRooms.ROUTE_MANAGEMENT || 'route-management',
      'partRouteUpdated',
      {
        orderId: order.orderId,
        batchNumber: order.batchNumber,
        partRouteUpdate: result,
        timestamp: new Date().toISOString(),
      },
    );

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