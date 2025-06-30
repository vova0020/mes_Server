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
  readyForPackaging?: number;
  assembled?: number;
  distributed?: number;
  packaged?: number;
  tasks?: {
    taskId: number;
    status: string;
    priority: number;
    assignedAt: Date;
    completedAt?: Date | null;
    machine: {
      machineId: number;
      machineName: string;
      status: string;
    };
    assignedUser?: {
      userId: number;
      login: string;
      userDetail?: {
        firstName: string;
        lastName: string;
      } | null;
    } | null;
  }[];
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