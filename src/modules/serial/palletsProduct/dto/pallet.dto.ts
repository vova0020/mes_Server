import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

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
    description: 'ID этапа производства (обязательно для станков без сменного задания)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  stageId?: number;

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
    description: 'ID этапа производства (обязательно для станков без сменного задания)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  stageId?: number;

  @ApiProperty({
    description: 'ID оператора, завершающего обработку',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  operatorId?: number;
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
interface CurrentOperationDto {
  id: number;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  processStep: {
    id: number;
    name: string;
    sequence: number;
  };
}

interface PalletDto {
  id: number;
  name: string;
  quantity: number;
  detailId: number;
  bufferCell: {
    id: number;
    code: string;
    bufferId: number;
    bufferName?: string;
  } | null;
  machine: { id: number; name: string; status: string } | null;
  currentOperation: CurrentOperationDto | null;
}

interface PalletsResponseDto {
  pallets: PalletDto[];
  total: number;
}
