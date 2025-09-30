import { IsInt, IsOptional, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMachineJobDto {
  @IsInt()
  @Min(1)
  packageId: number;

  @IsInt()
  @Min(1)
  machineId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTo?: number;
}

export class CreateMachineJobPartDto {
  @IsInt()
  @Min(1)
  jobId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreatePartialAssignmentDto {
  @IsInt()
  @Min(1)
  packageId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineAssignmentDto)
  assignments: MachineAssignmentDto[];
}

export class MachineAssignmentDto {
  @IsInt()
  @Min(1)
  machineId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTo?: number;
}