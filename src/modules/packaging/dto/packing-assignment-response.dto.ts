import { PackingTaskStatus, PackageStatus } from '@prisma/client';

// Информация о пользователе в ответе
export interface AssignedUserInfo {
  userId: number;
  login: string;
  firstName?: string;
  lastName?: string;
}

// Информация о станке в ответе
export interface MachineInfo {
  machineId: number;
  machineName: string;
  status: string;
}

// Информация об упаковочном пакете в ответе
export interface PackageInfo {
  packageId: number;
  packageName: string;
  status: string;
}

// Информация о заказе в ответе
export interface OrderInfo {
  orderId: number;
  batchNumber: string;
  orderName: string;
  completionPercentage: number;
  isCompleted: boolean;
  launchPermission: boolean;
}

// Полная информация об упаковочной единице заказа
export interface ProductionPackageInfo {
  packageId: number;
  packageCode: string;
  packageName: string;
  completionPercentage: number;
  quantity: number;
  order: OrderInfo;
}

// Основной DTO для ответа с информацией о задании упаковки
export interface PackingAssignmentResponseDto {
  taskId: number;
  packageId: number;
  machineId: number;
  assignedTo?: number;
  status: PackingTaskStatus;
  priority: number;
  assignedAt: Date;
  completedAt?: Date;
  assignedQuantity: number;
  completedQuantity: number;
  
  // Связанные данные
  package: PackageInfo;
  machine: MachineInfo;
  assignedUser?: AssignedUserInfo;
  
  // Данные о заказе и упаковочной единице (если есть связь)
  productionPackage?: ProductionPackageInfo;
}

// DTO для ответа со списком заданий и пагинацией
export interface PackingAssignmentListResponseDto {
  assignments: PackingAssignmentResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Расширенный DTO для задания с данными о частичной обработке
export interface PackingAssignmentWithProgressDto extends PackingAssignmentResponseDto {
  remainingQuantity: number;
}

// DTO для ответа с заданиями по станку и сводкой
export interface MachineAssignmentsResponseDto {
  assignments: PackingAssignmentWithProgressDto[];
  summary: {
    totalAssigned: number;
    totalCompleted: number;
    totalRemaining: number;
    tasksCount: number;
  };
}