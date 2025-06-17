import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionStageLevel2Dto {
  @IsNumber()
  stageId: number;

  @IsString()
  @IsNotEmpty()
  substageName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  allowance: number;
}

export class UpdateProductionStageLevel2Dto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  substageName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  allowance?: number;
}

export class ProductionStageLevel2ResponseDto {
  substageId: number;
  stageId: number;
  stageName: string;
  substageName: string;
  description?: string;
  allowance: number;
}

export class LinkSubstageToStageDto {
  @IsNumber()
  stageId: number;

  @IsString()
  @IsNotEmpty()
  substageName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  allowance: number;
}

export class RebindSubstageDto {
  @IsNumber()
  newStageId: number;
}