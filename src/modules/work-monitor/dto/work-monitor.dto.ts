export interface StreamDto {
  streamId: number;
  streamName: string;
}

export interface StageProgressDto {
  stageId: number;
  stageName: string;
  shiftNorm: number;
  completed: number;
  workplaceCount: number;
}

export interface MachineWorkplaceDto {
  machineId: number;
  machineName: string;
  norm: number;
  completed: number;
  planned: number;
}