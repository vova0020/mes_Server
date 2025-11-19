export interface AuditContext {
  userId?: number;
  metadata?: Record<string, any>;
}

export interface StatusChangeData {
  entityType: string;
  entityId: number;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  context?: AuditContext;
}

export interface OperationData {
  machineId: number;
  palletId: number;
  partId: number;
  routeStageId: number;
  quantityProcessed: number;
  startedAt: Date;
  completedAt: Date;
  operatorId?: number;
}

export interface MovementData {
  palletId: number;
  fromCellId?: number;
  toCellId?: number;
  machineId?: number;
  movementType: string;
  quantity: number;
  movedBy?: number;
}
