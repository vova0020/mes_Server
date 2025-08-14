import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// DTO для создания маршрута
export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  routeName: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lineId?: number;

  @ApiProperty({
    required: false,
    description: 'Этапы маршрута с порядковыми номерами',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStageDto)
  stages?: CreateRouteStageDto[];
}

// DTO для обновления маршрута
export class UpdateRouteDto {
  @ApiProperty({ required: false, description: 'Новое имя маршрута' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routeName?: string;

  @ApiProperty({ required: false, description: 'ID производственной линии' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  lineId?: number;

  @ApiProperty({
    required: false,
    type: [Number],
    description: 'Идентификаторы этапов в порядке их следования',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  stageIds?: number[];

  @ApiProperty({
    required: false,
    description: 'Этапы маршрута с порядковыми номерами',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStageDto)
  stages?: CreateRouteStageDto[];
}

// DTO для создания этапа маршрута
export class CreateRouteStageDto {
  @IsNumber()
  @IsPositive()
  stageId: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  substageId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sequenceNumber?: number;
}

// DTO для обновления этапа маршрута
export class UpdateRouteStageDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  stageId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  substageId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sequenceNumber?: number;
}

// DTO для изменения порядка этапов
export class ReorderRouteStagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  stageIds: number[];
}

// DTO для перемещения этапа
export class MoveRouteStageDto {
  @IsNumber()
  @IsPositive()
  newSequenceNumber: number;
}

// DTO для копирования маршрута
export class CopyRouteDto {
  @IsString()
  @IsNotEmpty()
  newRouteName: string;
}