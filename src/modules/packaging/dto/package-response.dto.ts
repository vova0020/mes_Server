export interface PackagePartDto {
  partId: number;
  partCode: string;
  partName: string;
  quantity: number;
  status?: string;
  totalQuantity?: number;
  requiredQuantity?: number;
}

export interface PackageOrderDto {
  orderName: string;
  batchNumber: string;
  isCompleted?: boolean;
}

export interface PackageDto {
  id: number;
  orderId: number;
  packageCode: string;
  packageName: string;
  completionPercentage: number;
  order: PackageOrderDto;
  parts: PackagePartDto[];
}

export interface PackagesResponseDto {
  packages: PackageDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PackagesByOrderResponseDto {
  orderId: number;
  packagesCount: number;
  packages: PackageDto[];
}