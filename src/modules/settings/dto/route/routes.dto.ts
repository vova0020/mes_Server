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

// DTO для создания маршрута
export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  routeName: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStageDto)
  stages?: CreateRouteStageDto[];
}

// DTO для обновления маршрута
export class UpdateRouteDto {
  @IsString()
  @IsNotEmpty()
  routeName: string;
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
