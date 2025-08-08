import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateDetailWithPackageDto {
  @IsString()
  partSku: string;

  @IsString()
  partName: string;

  @IsOptional()
  @IsString()
  materialName?: string;

  @IsOptional()
  @IsString()
  materialSku?: string;

  @IsOptional()
  @IsNumber()
  thickness?: number;

  @IsOptional()
  @IsNumber()
  thicknessWithEdging?: number;

  @IsOptional()
  @IsNumber()
  finishedLength?: number;

  @IsOptional()
  @IsNumber()
  finishedWidth?: number;

  @IsOptional()
  @IsString()
  groove?: string;

  @IsOptional()
  @IsString()
  edgingSkuL1?: string;

  @IsOptional()
  @IsString()
  edgingNameL1?: string;

  @IsOptional()
  @IsString()
  edgingSkuL2?: string;

  @IsOptional()
  @IsString()
  edgingNameL2?: string;

  @IsOptional()
  @IsString()
  edgingSkuW1?: string;

  @IsOptional()
  @IsString()
  edgingNameW1?: string;

  @IsOptional()
  @IsString()
  edgingSkuW2?: string;

  @IsOptional()
  @IsString()
  edgingNameW2?: string;

  @IsOptional()
  @IsString()
  plasticFace?: string;

  @IsOptional()
  @IsString()
  plasticFaceSku?: string;

  @IsOptional()
  @IsString()
  plasticBack?: string;

  @IsOptional()
  @IsString()
  plasticBackSku?: string;

  @IsOptional()
  @IsBoolean()
  pf?: boolean;

  @IsOptional()
  @IsString()
  pfSku?: string;

  @IsOptional()
  @IsBoolean()
  sbPart?: boolean;

  @IsOptional()
  @IsBoolean()
  pfSb?: boolean;

  @IsOptional()
  @IsString()
  sbPartSku?: string;

  @IsOptional()
  @IsNumber()
  conveyorPosition?: number;

  // Поля для привязки к упаковке
  @IsInt()
  @Min(1)
  routeId: number;
  @IsInt()
  @Min(1)
  packageId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}