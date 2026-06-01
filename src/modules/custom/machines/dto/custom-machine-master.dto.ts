import { IsInt, IsPositive } from 'class-validator';

export class CompletePartDto {
  @IsInt()
  @IsPositive()
  processedQuantity: number;
}

export class ReassignMachineDto {
  @IsInt()
  @IsPositive()
  newMachineId: number;
}
