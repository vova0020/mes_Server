import { IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateMachineAssignmentDto {
  @IsInt()
  machineId: number;

  @IsInt()
  customPalletId: number;

  @IsInt()
  stageId: number; // ID этапа из ProductionStageLevel1

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;
}
