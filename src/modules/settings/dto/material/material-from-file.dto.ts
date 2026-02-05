import { IsString, IsNotEmpty, IsInt, Min, IsArray, ValidateNested, IsBoolean, IsOptional, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialFromFileDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @Allow()
  exists?: boolean;

  @Allow()
  existingMaterial?: any;
}

export class SaveMaterialsFromFileDto {
  @IsInt()
  @Min(1)
  groupId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialFromFileDto)
  materials: MaterialFromFileDto[];
}
