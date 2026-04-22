import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OrderStatus {
  PRELIMINARY = 'PRELIMINARY',
  APPROVED = 'APPROVED',
  LAUNCH_PERMITTED = 'LAUNCH_PERMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class CreatePackageDto {
  @ApiProperty({
    description: 'ID упаковки из справочника',
    example: 1,
  })
  @IsInt()
  packageDirectoryId: number;

  @ApiProperty({
    description: 'Количество упаковок в заказе',
    example: 5,
  })
  @IsNumber()
  quantity: number;
}

export class CreateProductionOrderDto {
  @ApiProperty({
    description: 'Номер производственной партии',
    example: 'BATCH-2024-001',
  })
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ на производство мебели',
  })
  @IsString()
  @IsNotEmpty()
  orderName: string;

  @ApiProperty({
    description: 'Требуемая дата выполнения заказа',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  requiredDate: string;

  @ApiProperty({
    description: 'Статус заказа',
    enum: OrderStatus,
    example: OrderStatus.PRELIMINARY,
    required: false,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({
    description: 'Упаковки в заказе (детали будут автоматически добавлены из справочника)',
    type: [CreatePackageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageDto)
  packages: CreatePackageDto[];
}

export class UpdateProductionOrderDto {
  @ApiProperty({
    description: 'Номер производственной партии',
    required: false,
    example: 'BATCH-2024-002',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  batchNumber?: string;

  @ApiProperty({
    description: 'Название заказа',
    required: false,
    example: 'Обновленный заказ на производство',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  orderName?: string;

  @ApiProperty({
    description: 'Требуемая дата выполнения заказа',
    required: false,
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  requiredDate?: string;

  @ApiProperty({
    description: 'Статус заказа',
    enum: OrderStatus,
    required: false,
    example: OrderStatus.APPROVED,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({
    description: 'Флаг разрешения запуска в производство',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  launchPermission?: boolean;

  @ApiProperty({
    description: 'Флаг завершенности заказа',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @ApiProperty({
    description: 'Упаковки в заказе (если указано, то полностью заменит существующие упаковки)',
    type: [CreatePackageDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageDto)
  @IsOptional()
  packages?: CreatePackageDto[];
}

export class UpdateOrderPriorityDto {
  @ApiProperty({
    description: 'Новый приоритет заказа (чем больше число, тем выше приоритет)',
    example: 1,
  })
  @IsInt()
  priority: number;
}

export class PackageResponseDto {
  @ApiProperty({
    description: 'ID упаковки',
    example: 1,
  })
  packageId: number;

  @ApiProperty({
    description: 'Код упаковки',
    example: 'PKG-001',
  })
  packageCode: string;

  @ApiProperty({
    description: 'Название упаковки',
    example: 'Упаковка стульев',
  })
  packageName: string;

  @ApiProperty({
    description: 'Процент готовности упаковки',
    example: 0,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Количество упаковок в заказе',
    example: 5,
  })
  quantity: number;

  @ApiProperty({
    description: 'Детали в упаковке (автоматически добавленные из справочника)',
    example: [
      {
        partId: 1,
        partCode: 'PART-001',
        partName: 'Ножка стула',
        quantity: 44, // 11 (из справочника) * 4 (количество упаковок)
      },
    ],
  })
  details?: {
    partId: number;
    partCode: string;
    partName: string;
    quantity: number;
  }[];
}

export class ProductionOrderResponseDto {
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
    example: 0,
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
    description: 'Приоритет заказа (чем больше число, тем выше приоритет)',
    example: 1,
  })
  priority: number;

  @ApiProperty({
    description: 'Упаковки в заказе',
    type: [PackageResponseDto],
  })
  packages?: PackageResponseDto[];
}

// DTO для справочника упаковок
export class PackageDirectoryResponseDto {
  @ApiProperty({
    description: 'ID упаковки в справочнике',
    example: 1,
  })
  packageId: number;

  @ApiProperty({
    description: 'Код упаковки',
    example: 'PKG-001',
  })
  packageCode: string;

  @ApiProperty({
    description: 'Название упаковки',
    example: 'Упаковка стульев',
  })
  packageName: string;

  @ApiProperty({
    description: 'Количество деталей в упаковке',
    example: 4,
  })
  detailsCount: number;

  @ApiProperty({
    description: 'Детали в упаковке из справочника',
    example: [
      {
        detailId: 1,
        partSku: 'PART-001',
        partName: 'Ножка стула',
        quantity: 4,
      },
    ],
  })
  details?: {
    detailId: number;
    partSku: string;
    partName: string;
    quantity: number;
  }[];
}