export interface StreamDto {
  streamId: number;
  streamName: string;
}

export interface StageProgressDto {
  stageId: number;
  stageName: string;
  shiftNorm: number;
  completed: number;
  readyForProcessing: number;
  totalWorkplaces: number;
  activeWorkplaces: number;
}

export interface MachineWorkplaceDto {
  machineId: number;
  machineName: string;
  status: string;
  norm: number;
  completed: number;
  planned: number;
}