import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateProductionStageLevel1Dto {
  @IsString()
  @IsNotEmpty()
  stageName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  finalStage?: boolean;
}

export class UpdateProductionStageLevel1Dto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stageName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  finalStage?: boolean;
}

export class ProductionStageLevel1ResponseDto {
  stageId: number;
  stageName: string;
  description?: string;
  finalStage: boolean;
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