export interface PartInfoDto {
  partId: number;
  partCode: string;
  partName: string;
  status: string;
  totalQuantity: number;
  isSubassembly: boolean;
  readyForMainFlow: boolean;
  size: string;
  material: {
    materialId: number;
    materialName: string;
    article: string;
    unit: string;
  };
  route: {
    routeId: number;
    routeName: string;
  };
}

export interface BufferCellInfoDto {
  cellId: number;
  cellCode: string;
  status: string;
  capacity: number;
  currentLoad: number;
  buffer: {
    bufferId: number;
    bufferName: string;
    location: string;
  };
}

export interface PalletDetailDto {
  palletId: number;
  palletName: string;
  quantity: number;
  status: string;
  assignedToPackage: boolean;
  currentCell?: BufferCellInfoDto;
  placedAt?: Date;
  machineAssignments: {
    assignmentId: number;
    machineId: number;
    machineName: string;
    assignedAt: Date;
    completedAt?: Date | null;
  }[];
  stageProgress: {
    routeStageId: number;
    stageName: string;
    status: string;
    completedAt?: Date | null;
  }[];
}

export interface PartPalletsResponseDto {
  partInfo: PartInfoDto;
  palletsCount: number;
  pallets: PalletDetailDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}