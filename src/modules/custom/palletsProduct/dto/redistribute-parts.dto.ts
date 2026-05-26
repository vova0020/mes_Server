import { IsInt, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PartToRedistribute {
  @IsInt()
  customPartId: number;

  @IsNumber()
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
