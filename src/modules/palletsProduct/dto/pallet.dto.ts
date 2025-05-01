export class BufferCellDto {
  id: number;
  code: string;
  bufferId: number;
  bufferName?: string;
}

export class MachineDto {
  id: number;
  name: string;
  status: string;
}

export class ProcessStepDto {
  id: number;
  name: string;
  sequence?: number;
}

export class OperationStatusDto {
  id: number;
  status: string;             // Общий статус (IN_PROGRESS, COMPLETED)
  completionStatus?: string;  // Статус выполнения (COMPLETED, IN_PROGRESS, PARTIALLY_COMPLETED)
  processStep?: ProcessStepDto; // Информация о текущем шаге процесса
  startedAt: Date;
  completedAt?: Date;
}

export class PalletDto {
  id: number;
  name: string;
  quantity: number;
  detailId: number;

  // Информация о ячейке буфера (если есть)
  bufferCell?: BufferCellDto | null;

  // Информация о станке (если есть)
  machine?: MachineDto | null;

  // Информация о текущей операции (если есть)
  currentOperation?: OperationStatusDto | null;
}

export class PalletsResponseDto {
  pallets: PalletDto[];
  total: number;
}