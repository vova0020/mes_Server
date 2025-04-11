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

export class PalletDto {
  id: number;
  name: string;
  quantity: number;
  detailId: number;

  // Информация о ячейке буфера (если есть)
  bufferCell?: BufferCellDto | null;

  // Информация о станке (если есть)
  machine?: MachineDto | null;
}

export class PalletsResponseDto {
  pallets: PalletDto[];
  total: number;
}
