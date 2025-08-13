import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum OrderStatus {
  PRELIMINARY = 'PRELIMINARY',
  APPROVED = 'APPROVED',
  LAUNCH_PERMITTED = 'LAUNCH_PERMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Новый статус заказа',
    enum: OrderStatus,
    example: OrderStatus.LAUNCH_PERMITTED,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class UpdateOrderPriorityDto {
  @ApiProperty({
    description: 'Новый приоритет заказа',
    example: 1,
  })
  @IsOptional()
  priority: number;
}

export class OrderListResponseDto {
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
    description: 'Процент выполнения заказа',
    example: 25.5,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Дата создания заказа',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Дата завершения заказа',
    required: false,
    example: null,
  })
  completedAt?: string;

  @ApiProperty({
    description: 'Требуемая дата выполнения заказа',
    example: '2024-12-31T23:59:59.000Z',
  })
  requiredDate: string;

  @ApiProperty({
    description: 'Статус заказа',
    enum: OrderStatus,
    example: OrderStatus.PRELIMINARY,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Флаг разрешения запуска в производство',
    example: false,
  })
  launchPermission: boolean;

  @ApiProperty({
    description: 'Флаг завершенности заказа',
    example: false,
  })
  isCompleted: boolean;

  @ApiProperty({
    description: 'Количество упаковок в заказе',
    example: 3,
  })
  packagesCount: number;

  @ApiProperty({
    description: 'Общее количество деталей в заказе',
    example: 45,
  })
  totalPartsCount: number;

  @ApiProperty({
    description: 'Приоритет заказа',
    example: 1,
  })
  priority: number;
}

export class OrderDetailResponseDto {
  @ApiProperty({
    description: 'Информация о заказе',
  })
  order: {
    orderId: number;
    batchNumber: string;
    orderName: string;
    completionPercentage: number;
    createdAt: string;
    completedAt?: string;
    requiredDate: string;
    status: OrderStatus;
    launchPermission: boolean;
    isCompleted: boolean;
    priority: number;
  };

  @ApiProperty({
    description: 'Упаковки в заказе с их деталями',
  })
  packages: {
    packageId: number;
    packageCode: string;
    packageName: string;
    quantity: number;
    completionPercentage: number;
    details: {
      partId: number;
      partCode: string;
      partName: string;
      totalQuantity: number;
      status: string;
      size: string;
      materialId: number;
    }[];
  }[];
}

export class OrderStatusUpdateResponseDto {
  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  orderId: number;

  @ApiProperty({
    description: 'Предыдущий статус заказа',
    enum: OrderStatus,
    example: OrderStatus.APPROVED,
  })
  previousStatus: OrderStatus;

  @ApiProperty({
    description: 'Новый статус заказа',
    enum: OrderStatus,
    example: OrderStatus.LAUNCH_PERMITTED,
  })
  newStatus: OrderStatus;

  @ApiProperty({
    description: 'Флаг разрешения запуска в производство',
    example: true,
  })
  launchPermission: boolean;

  @ApiProperty({
    description: 'Время обновления статуса',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: string;
}