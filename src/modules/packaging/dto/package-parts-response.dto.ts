export interface PackagePartDetailDto {
  partId: number;
  partCode: string;
  partName: string;
  status: string;
  totalQuantity: number;
  requiredQuantity: number;
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
  pallets?: {
    palletId: number;
    palletName: string;
  }[];
  routeProgress?: {
    routeStageId: number;
    stageName: string;
    status: string;
    completedAt?: Date | null;
  }[];
}

export interface PackagePartsInfoDto {
  packageId: number;
  packageCode: string;
  packageName: string;
  completionPercentage: number;
  order: {
    orderId: number;
    orderName: string;
    batchNumber: string;
  };
}

export interface PackagePartsResponseDto {
  packageInfo: PackagePartsInfoDto;
  partsCount: number;
  parts: PackagePartDetailDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}