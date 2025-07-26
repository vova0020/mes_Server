import {
  IsInt,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderStatusForRoutes {
  PRELIMINARY = 'PRELIMINARY',
  APPROVED = 'APPROVED',
}

export class UpdatePartRouteDto {
  @ApiProperty({
    description: 'ID нового маршрута для детали',
    example: 2,
  })
  @IsInt()
  routeId: number;
}

export class OrderForRoutesResponseDto {
  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  orderId: number;

  @ApiProperty({
    description: 'Номер производственной партии',
    example: 'BATCH-2024-001',
  })
  batchNumber: string;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ на производство мебели',
  })
  orderName: string;

  @ApiProperty({
    description: 'Стат��с заказа',
    enum: OrderStatusForRoutes,
    example: OrderStatusForRoutes.PRELIMINARY,
  })
  status: OrderStatusForRoutes;

  @ApiProperty({
    description: 'Требуемая дата выполнения заказа',
    example: '2024-12-31T23:59:59.000Z',
  })
  requiredDate: string;

  @ApiProperty({
    description: 'Дата создания заказа',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Количество деталей в заказе',
    example: 25,
  })
  totalParts: number;
}

export class RouteInfoDto {
  @ApiProperty({
    description: 'ID маршрута',
    example: 1,
  })
  routeId: number;

  @ApiProperty({
    description: 'Название маршрута',
    example: 'Стандартный маршрут обработки',
  })
  routeName: string;

  @ApiProperty({
    description: 'Этапы маршрута',
    example: [
      {
        routeStageId: 1,
        stageName: 'Резка',
        substageName: null,
        sequenceNumber: 1,
      },
      {
        routeStageId: 2,
        stageName: 'Сборка',
        substageName: 'Склейка',
        sequenceNumber: 2,
      },
    ],
  })
  stages: {
    routeStageId: number;
    stageName: string;
    substageName?: string;
    sequenceNumber: number;
  }[];
}

export class PartForRouteManagementDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  partId: number;

  @ApiProperty({
    description: 'Код детали',
    example: 'PART-001',
  })
  partCode: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Ножка стула',
  })
  partName: string;

  @ApiProperty({
    description: 'Общее количество деталей',
    example: 44,
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Статус детали',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Информация о текущем маршруте',
    type: RouteInfoDto,
  })
  currentRoute: RouteInfoDto;

  @ApiProperty({
    description: 'Размеры детали',
    example: '100x50x20',
  })
  size: string;

  @ApiProperty({
    description: 'Название материала',
    example: 'Дерево дуб',
  })
  materialName: string;

  @ApiProperty({
    description: 'Упаковки, в которых используется эта детал��',
    example: [
      {
        packageId: 1,
        packageCode: 'PKG-001',
        packageName: 'Упаковка стульев',
        quantity: 4,
      },
    ],
  })
  packages: {
    packageId: number;
    packageCode: string;
    packageName: string;
    quantity: number;
  }[];
}

export class OrderPartsForRoutesResponseDto {
  @ApiProperty({
    description: 'Информация о заказе',
    type: OrderForRoutesResponseDto,
  })
  order: OrderForRoutesResponseDto;

  @ApiProperty({
    description: 'Список деталей в заказе',
    type: [PartForRouteManagementDto],
  })
  parts: PartForRouteManagementDto[];

  @ApiProperty({
    description: 'Доступные маршруты для назначения',
    type: [RouteInfoDto],
  })
  availableRoutes: RouteInfoDto[];
}

export class PartRouteUpdateResponseDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  partId: number;

  @ApiProperty({
    description: 'Код детали',
    example: 'PART-001',
  })
  partCode: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Ножка стула',
  })
  partName: string;

  @ApiProperty({
    description: 'Предыдущий маршрут',
    type: RouteInfoDto,
  })
  previousRoute: RouteInfoDto;

  @ApiProperty({
    description: 'Новый маршрут',
    type: RouteInfoDto,
  })
  newRoute: RouteInfoDto;

  @ApiProperty({
    description: 'Время изменения маршрута',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: string;
}