import { IsInt, IsDecimal, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PartToRedistribute {
  @IsInt()
  customPartId: number;

  @IsDecimal()
  @Min(0.01)
  quantity: number;
}

export class RedistributePartsDto {
  @IsInt()
  fromPalletId: number;

  @IsOptional()
  @IsInt()
  toPalletId?: number;

  @IsOptional()
  @IsString()
  newPalletName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartToRedistribute)
  parts: PartToRedistribute[];
}
