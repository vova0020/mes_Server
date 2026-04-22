import { IsInt, Min, IsNumber } from 'class-validator';

export class AssignPalletToPackageDto {
  @IsInt()
  @Min(1)
  palletId: number;

  @IsInt()
  @Min(1)
  packageId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}