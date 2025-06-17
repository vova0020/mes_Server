import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductionStageLevel1Dto {
  @IsString()
  @IsNotEmpty()
  stageName: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductionStageLevel1Dto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stageName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ProductionStageLevel1ResponseDto {
  stageId: number;
  stageName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  substagesCount: number;
  substages?: ProductionStageLevel2ResponseDto[];
}

export class ProductionStageLevel2ResponseDto {
  substageId: number;
  stageId: number;
  substageName: string;
  description?: string;
  allowance: number;
}