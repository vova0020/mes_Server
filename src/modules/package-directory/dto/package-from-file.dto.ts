import { IsString, IsNotEmpty, IsArray, ValidateNested, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class PackageFromFileDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @Allow()
  exists?: boolean;

  @Allow()
  existingPackage?: any;
}

export class SavePackagesFromFileDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageFromFileDto)
  packages: PackageFromFileDto[];
}
