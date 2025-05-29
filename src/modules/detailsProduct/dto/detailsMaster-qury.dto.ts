import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetailsQueryDto {
  @ApiProperty({
    description: 'ID производственного заказа',
    example: 1
  })
  @IsNumber()
  @Type(() => Number)
  orderId: number;

  @ApiProperty({
    description: 'ID участка производства (если не указан, используется участок мастера)',
    required: false,
    example: 2
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  segmentId?: number;

  @ApiProperty({
    description: 'Максимальное количество записей для возврата',
    required: false,
    example: 10
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Смещение для пагинации',
    required: false,
    example: 0
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}