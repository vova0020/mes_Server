import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionLineDto {
  @IsString()
  @IsNotEmpty()
  lineName: string;

  @IsString()
  @IsNotEmpty()
  lineType: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  materialIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  stageIds?: number[];
}

export class UpdateProductionLineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lineName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lineType?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  materialIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  stageIds?: number[];
}

export class ProductionLineResponseDto {
  lineId: number;
  lineName: string;
  lineType: string;
  stagesCount: number;
  materialsCount: number;
  stages?: LineStageResponseDto[];
  materials?: LineMaterialResponseDto[];
}

export class LineMaterialResponseDto {
  materialId: number;
  materialName: string;
  article: string;
  unit: string;
}

export class LineStageResponseDto {
  lineStageId: number;
  lineId: number;
  stageId: number;
  stageName: string;
}

export class LinkStageToLineDto {
  @IsNumber()
  lineId: number;

  @IsNumber()
  stageId: number;
}

export class LinkMaterialToLineDto {
  @IsNumber()
  lineId: number;

  @IsNumber()
  materialId: number;
}

export class LineMaterialsUpdateDto {
  @IsArray()
  @IsNumber({}, { each: true })
  materialIds: number[];
}

export class LineStagesUpdateDto {
  @IsArray()
  @IsNumber({}, { each: true })
  stageIds: number[];
}
