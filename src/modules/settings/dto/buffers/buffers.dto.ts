import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsDecimal,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum CellStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

// ================================
// DTOs для ячеек буфера (объявляем первыми)
// ================================

export class CreateBufferCellDto {
  @ApiProperty({ description: 'Код ячейки', example: 'A01' })
  @IsString({ message: 'Код ячейки должен быть строкой' })
  @MaxLength(20, { message: 'Код ячейки не должен превышать 20 символов' })
  cellCode: string;

  @ApiPropertyOptional({ 
    description: 'Статус ячейки', 
    enum: CellStatus, 
    example: CellStatus.AVAILABLE 
  })
  @IsOptional()
  @IsEnum(CellStatus, { message: 'Статус должен быть AVAILABLE, OCCUPIED или RESERVED' })
  status?: CellStatus;

  @ApiProperty({ description: 'Вместимость ячейки', example: 100 })
  @IsNumber({}, { message: 'Вместимость должна быть числом' })
  @Min(0, { message: 'Вместимость не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  capacity: number;

  @ApiPropertyOptional({ description: 'Текущая загрузка ячейки', example: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Текущая загрузка должна быть числом' })
  @Min(0, { message: 'Текущая загрузка не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  currentLoad?: number;
}

export class UpdateBufferCellDto {
  @ApiPropertyOptional({ description: 'Код ячейки' })
  @IsOptional()
  @IsString({ message: 'Код ячейки должен быть строкой' })
  @MaxLength(20, { message: 'Код ячейки не должен превышать 20 символов' })
  cellCode?: string;

  @ApiPropertyOptional({ description: 'Статус ячейки', enum: CellStatus })
  @IsOptional()
  @IsEnum(CellStatus, { message: 'Статус должен быть AVAILABLE, OCCUPIED или RESERVED' })
  status?: CellStatus;

  @ApiPropertyOptional({ description: 'Вместимость ячейки' })
  @IsOptional()
  @IsNumber({}, { message: 'Вместимость должна быть числом' })
  @Min(0, { message: 'Вместимость не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  capacity?: number;

  @ApiPropertyOptional({ description: 'Текущая загрузка ячейки' })
  @IsOptional()
  @IsNumber({}, { message: 'Текущая загрузка должна быть числом' })
  @Min(0, { message: 'Текущая загрузка не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  currentLoad?: number;
}

// ================================
// DTOs для буферов
// ================================

export class CreateBufferDto {
  @ApiProperty({ description: 'Название буфера', example: 'Буфер линии 1' })
  @IsString({ message: 'Название буфера должно быть строкой' })
  @MaxLength(100, { message: 'Название буфера не должно превышать 100 символов' })
  bufferName: string;

  @ApiPropertyOptional({ description: 'Описание буфера', example: 'Основной буфер для хранения заготовок' })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(500, { message: 'Описание не должно превышать 500 символов' })
  description?: string;

  @ApiProperty({ description: 'Местоположение буфера', example: 'Цех 1, участок А' })
  @IsString({ message: 'Местоположение должно быть строкой' })
  @MaxLength(200, { message: 'Местоположение не должно превышать 200 символов' })
  location: string;

  @ApiPropertyOptional({ 
    description: 'Ячейки буфера', 
    type: [CreateBufferCellDto],
    example: [{ cellCode: 'A01', capacity: 100 }] 
  })
  @IsOptional()
  @IsArray({ message: 'Ячейки должны быть массивом' })
  @ValidateNested({ each: true })
  @Type(() => CreateBufferCellDto)
  cells?: CreateBufferCellDto[];

  @ApiPropertyOptional({ 
    description: 'ID этапов для привязки к буферу', 
    example: [1, 2, 3] 
  })
  @IsOptional()
  @IsArray({ message: 'Этапы должны быть массивом' })
  @IsNumber({}, { each: true, message: 'ID этапа должно быть числом' })
  stageIds?: number[];
}

export class UpdateBufferDto {
  @ApiPropertyOptional({ description: 'Название буфера' })
  @IsOptional()
  @IsString({ message: 'Название буфера должно быть строкой' })
  @MaxLength(100, { message: 'Название буфера не должно превышать 100 символов' })
  bufferName?: string;

  @ApiPropertyOptional({ description: 'Описание буфера' })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(500, { message: 'Описание не должно превышать 500 символов' })
  description?: string;

  @ApiPropertyOptional({ description: 'Местоположение буфера' })
  @IsOptional()
  @IsString({ message: 'Местоположение должно быть строкой' })
  @MaxLength(200, { message: 'Местоположение не должно превышать 200 символов' })
  location?: string;
}

// ================================
// DTOs для связей буфера с этапами
// ================================

export class CreateBufferStageDto {
  @ApiProperty({ description: 'ID этапа для привязки', example: 1 })
  @IsNumber({}, { message: 'ID этапа должно быть числом' })
  @Transform(({ value }) => parseInt(value))
  stageId: number;
}

export class UpdateBufferStagesDto {
  @ApiProperty({ 
    description: 'Массив ID этапов для привязки к буферу', 
    example: [1, 2, 3] 
  })
  @IsArray({ message: 'Этапы должны быть массивом' })
  @IsNumber({}, { each: true, message: 'ID этапа должно быть числом' })
  stageIds: number[];
}

// ================================
// DTOs для копирования
// ================================

export class CopyBufferDto {
  @ApiProperty({ description: 'Новое название буфера', example: 'Буфер линии 1 (копия)' })
  @IsString({ message: 'Название буфера должно быть строкой' })
  @MaxLength(100, { message: 'Название буфе��а не должно превышать 100 символов' })
  newBufferName: string;

  @ApiPropertyOptional({ description: 'Новое местоположение буфера' })
  @IsOptional()
  @IsString({ message: 'Местоположение должно быть строкой' })
  @MaxLength(200, { message: 'Местоположение не должно превышать 200 символов' })
  newLocation?: string;

  @ApiPropertyOptional({ 
    description: 'Копировать ячейки', 
    example: true,
    default: true 
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  copyCells?: boolean;

  @ApiPropertyOptional({ 
    description: 'Копировать связи с этапами', 
    example: true,
    default: true 
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  copyStages?: boolean;
}

// ================================
// Response DTOs
// ================================

export interface BufferResponse {
  bufferId: number;
  bufferName: string;
  description: string | null;
  location: string;
  cellsCount: number;
  stagesCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BufferDetailResponse extends BufferResponse {
  bufferCells: BufferCellResponse[];
  bufferStages: BufferStageResponse[];
}

export interface BufferCellResponse {
  cellId: number;
  bufferId: number;
  cellCode: string;
  status: CellStatus;
  capacity: number;
  currentLoad: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BufferStageResponse {
  bufferStageId: number;
  bufferId: number;
  stageId: number;
  stage: {
    stageId: number;
    stageName: string;
    description: string | null;
  };
}

export interface StagesWithBuffersResponse {
  stageId: number;
  stageName: string;
  description: string | null;
  buffersCount: number;
  buffers: {
    bufferId: number;
    bufferName: string;
    location: string;
  }[];
}