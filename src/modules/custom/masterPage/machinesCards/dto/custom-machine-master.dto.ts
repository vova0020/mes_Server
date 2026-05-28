import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// DTO для запроса станков по участку
export class CustomMachineSegmentQueryDto {
  @ApiProperty({
    description: 'ID производственного участка (этапа 1-го уровня)',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  stageId: number;
}

// DTO для ответа со списком станков участка
export class CustomMachineSegmentResponseDto {
  @ApiProperty({ description: 'ID станка', example: 1 })
  id: number;

  @ApiProperty({ description: 'Название станка', example: 'Станок CNC-01' })
  name: string;

  @ApiProperty({
    description: 'Статус станка',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BROKEN'],
  })
  status: string;

  @ApiProperty({
    description: 'Единица измерения загрузки',
    example: 'м²',
  })
  load_unit: string;

  @ApiProperty({
    description: 'Флаг запрета сменных задач',
    example: false,
  })
  noSmenTask: boolean;

  @ApiProperty({
    description: 'Рекомендуемая загрузка станка',
    example: 100,
  })
  recommendedLoad: number;

  @ApiProperty({
    description: 'Запланированное количество для обработки',
    example: 50,
  })
  plannedQuantity: number;

  @ApiProperty({
    description: 'Выполненное количество',
    example: 25,
  })
  completedQuantity: number;

  @ApiProperty({
    description: 'Тип производства',
    example: 'CUSTOM',
    enum: ['SERIAL', 'CUSTOM', 'BOTH'],
  })
  productionType: string;
}

// DTO для запроса заданий станка
export class CustomMachineTaskQueryDto {
  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  machineId: number;
}

// DTO для ответа с заданиями станка
export class CustomMachineTaskResponseDto {
  @ApiProperty({ description: 'ID операции/задания', example: 1 })
  operationId: number;

  @ApiProperty({ description: 'ID заказа', example: 123 })
  orderId: number;

  @ApiProperty({ description: 'Название заказа', example: 'Заказ №123' })
  orderName: string;

  @ApiProperty({ description: 'Артикул детали', example: 'DET-001' })
  detailArticle: string;

  @ApiProperty({ description: 'Название детали', example: 'Столешница' })
  detailName: string;

  @ApiProperty({ description: 'Материал детали', example: 'ЛДСП' })
  detailMaterial: string;

  @ApiProperty({ description: 'Размер детали', example: '2000x600x18' })
  detailSize: string;

  @ApiProperty({ description: 'Название поддона', example: 'Поддон-001' })
  palletName: string;

  @ApiProperty({ description: 'Количество деталей', example: 10 })
  quantity: number;

  @ApiProperty({
    description: 'Статус задания',
    example: 'ON_MACHINE',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Статус завершения',
    example: null,
    nullable: true,
  })
  completionStatus: string | null;
}
