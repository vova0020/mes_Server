import { IsString, IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class PartOnPalletDto {
  @IsInt()
  @Min(1)
  customPartId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateCustomPalletDto {
  @IsString()
  palletName: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'На поддоне должна быть хотя бы одна деталь' })
  @Type(() => PartOnPalletDto)
  parts: PartOnPalletDto[];
}
