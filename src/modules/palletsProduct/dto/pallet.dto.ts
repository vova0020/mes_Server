import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartPalletProcessingDto {
  @ApiProperty({
    description: 'ID поддона',
    example: 1,
  })
  @IsNumber()
  palletId: number;

  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  @IsNumber()
  machineId: number;

  @ApiProperty({
    description: 'ID оператора (опционально)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  operatorId?: number;
}

export class CompletePalletProcessingDto {
  @ApiProperty({
    description: 'ID поддона',
    example: 1,
  })
  @IsNumber()
  palletId: number;

  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  @IsNumber()
  machineId: number;

  @ApiProperty({
    description: 'ID оператора, завершающего обработку',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  operatorId?: number;

  @ApiProperty({
    description: 'ID этапа производства (используется как stageId)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  stageId?: number; // переименовано с segmentId для соответствия новой схеме
}

export class MovePalletToBufferDto {
  @ApiProperty({
    description: 'ID поддона',
    example: 1,
  })
  @IsNumber()
  palletId: number;

  @ApiProperty({
    description: 'ID ячейки буфера',
    example: 1,
  })
  @IsNumber()
  bufferCellId: number;
}