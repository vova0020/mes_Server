import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO для запроса информации о станках по сегменту
export class MachineSegmentQueryDto {
  @ApiProperty({
    description: 'ID производственного участка для получения станков',
    example: 1,
    required: true,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  stageId: number;
}

// DTO для ответа с детальной информацией о станке
export class MachineSegmentResponseDto {
  @ApiProperty({ description: 'ID станка', example: 1 })
  id: number;

  @ApiProperty({ description: 'Название станка', example: 'Станок №1' })
  name: string;

  @ApiProperty({
    description: 'Статус станка',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
  })
  status: string;

  @ApiProperty({
    description: 'Рекомендуемая норма выработки (количество деталей)',
    example: 100,
  })
  recommendedLoad: number;

  @ApiProperty({
    description: 'Запланированное количество деталей',
    example: 150,
  })
  plannedQuantity: number;

  @ApiProperty({
    description: 'Выполненное количество деталей',
    example: 5,
  })
  completedQuantity: number;
}