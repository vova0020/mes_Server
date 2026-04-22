import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class PartPalletsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  palletName?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  onlyInCells?: boolean;
}