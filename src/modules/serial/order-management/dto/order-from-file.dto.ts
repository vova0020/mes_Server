import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsDateString, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PackageFromOrderFileDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  exists?: boolean;

  @IsOptional()
  existingPackage?: {
    packageId: number;
    packageCode: string;
    packageName: string;
  };
}

export class SaveOrderFromFileDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsString()
  @IsNotEmpty()
  orderName: string;

  @IsDateString()
  requiredDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageFromOrderFileDto)
  packages: PackageFromOrderFileDto[];
}
