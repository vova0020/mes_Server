/**
 * Типы комнат WebSocket
 */
export enum WebSocketRooms {
  // Основные комнаты
  PALLETS = 'pallets',

  // Комнаты настроек (src/modules/settings/services/)
  SETTINGS_MACHINES = 'settings-machines',
  SETTINGS_MATERIALS = 'settings-materials',
  SETTINGS_MATERIAL_GROUPS = 'settings-materialGroups',
  SETTINGS_BUFFERS = 'settings-buffers',
  SETTINGS_BUFFER_CELLS = 'settings-bufferCells',
  SETTINGS_BUFFER_STAGES = 'settings-bufferStages',
  SETTINGS_ROUTES = 'settings-routes',
  SETTINGS_PRODUCTION_LINES = 'settings-production-lines',
  SETTINGS_PRODUCTION_STAGES = 'settings-production-stages',
  SETTINGS_USER = 'settings-user',

  // Комнаты производственных модулей
  PRODUCT_MACHINES = 'product-machines',
  
}

/**
 * Типы событий для каждой комнаты
 */
export interface RoomEvents {
  // События буферов настроек (src/modules/settings/services/buffers)
  [WebSocketRooms.SETTINGS_BUFFERS]: {
    bufferCreated: {
      buffer: any;
      timestamp: string;
    };
    bufferUpdated: {
      buffer: any;
      changes: Record<string, boolean>;
      timestamp: string;
    };
    bufferDeleted: {
      bufferId: number;
      bufferName: string;
      timestamp: string;
    };
    bufferCopied: {
      originalBuffer: any;
      copiedBuffer: any;
      copyOptions: Record<string, boolean>;
      timestamp: string;
    };
    bufferCellCreated: {
      bufferId: number;
      bufferName: string;
      bufferCell: any;
      timestamp: string;
    };
    bufferCellUpdated: {
      bufferId: number;
      bufferName: string;
      bufferCell: any;
      changes: Record<string, boolean>;
      timestamp: string;
    };
    bufferCellDeleted: {
      cellId: number;
      bufferId: number;
      bufferName: string;
      cellCode: string;
      timestamp: string;
    };
    bufferStageCreated: {
      bufferId: number;
      bufferName: string;
      bufferStage: any;
      timestamp: string;
    };
    bufferStageDeleted: {
      bufferStageId: number;
      bufferId: number;
      bufferName: string;
      stageId: number;
      stageName: string;
      timestamp: string;
    };
    bufferStagesUpdated: {
      bufferId: number;
      bufferName: string;
      bufferStages: any[];
      timestamp: string;
    };
  };
  // События машин
  [WebSocketRooms.SETTINGS_MACHINES]: {
    machineCreated: {
      machine: any;
      timestamp: string;
    };
    machineUpdated: {
      machine: any;
      timestamp: string;
    };
    machineDeleted: {
      machine: any;
      timestamp: string;
    };
    machineStatusChanged: {
      machine: any;
      timestamp: string;
    };
    machineStarted: {
      machine: any;
      timestamp: string;
    };
    machineStopped: {
      machine: any;
      timestamp: string;
    };
    machineError: {
      machine: any;
      error: string;
      timestamp: string;
    };
    machineStageAdded: {
      machineId: number;
      stageId: number;
      result: any;
      timestamp: string;
    };
    machineStageRemoved: {
      machineId: number;
      stageId: number;
      timestamp: string;
    };
    machineSubstageAdded: {
      machineId: number;
      substageId: number;
      result: any;
      timestamp: string;
    };
    machineSubstageRemoved: {
      machineId: number;
      substageId: number;
      timestamp: string;
    };
  };

  // События материалов
  [WebSocketRooms.SETTINGS_MATERIALS]: {
    materialCreated: {
      material: any;
      timestamp: string;
    };
    materialUpdated: {
      material: any;
      timestamp: string;
    };
    materialDeleted: {
      materialId: number;
      materialName: string;
      timestamp: string;
    };
    materialStockChanged: {
      materialId: number;
      materialName: string;
      oldStock: number;
      newStock: number;
      timestamp: string;
    };
    materialLinkedToGroup: {
      groupId: number;
      materialId: number;
      groupName: string;
      materialName: string;
      timestamp: string;
    };
    materialUnlinkedFromGroup: {
      groupId: number;
      materialId: number;
      groupName?: string;
      materialName?: string;
      timestamp: string;
    };
  };

  // События групп материалов
  [WebSocketRooms.SETTINGS_MATERIAL_GROUPS]: {
    materialGroupCreated: {
      group: any;
      timestamp: string;
    };
    materialGroupUpdated: {
      group: any;
      timestamp: string;
    };
    materialGroupDeleted: {
      groupId: number;
      groupName: string;
      timestamp: string;
    };
    materialLinkedToGroup: {
      groupId: number;
      materialId: number;
      groupName: string;
      materialName: string;
      timestamp: string;
    };
    materialUnlinkedFromGroup: {
      groupId: number;
      materialId: number;
      groupName?: string;
      materialName?: string;
      timestamp: string;
    };
  };

  // События производственных линий
  [WebSocketRooms.SETTINGS_PRODUCTION_LINES]: {
    lineCreated: {
      line: any;
      timestamp: string;
    };
    lineUpdated: {
      line: any;
      timestamp: string;
    };
    lineDeleted: {
      lineId: number;
      lineName: string;
      timestamp: string;
    };
    stageLinkedToLine: {
      lineId: number;
      stageId: number;
      lineName: string;
      stageName: string;
      timestamp: string;
    };
    stageUnlinkedFromLine: {
      lineId: number;
      stageId: number;
      lineName: string;
      stageName: string;
      timestamp: string;
    };
    materialLinkedToLine: {
      lineId: number;
      materialId: number;
      lineName: string;
      materialName: string;
      timestamp: string;
    };
    materialUnlinkedFromLine: {
      lineId: number;
      materialId: number;
      lineName?: string;
      materialName?: string;
      timestamp: string;
    };
    lineMaterialsUpdated: {
      lineId: number;
      lineName: string;
      materials: any[];
      timestamp: string;
    };
    lineStagesUpdated: {
      lineId: number;
      lineName: string;
      stages: any[];
      timestamp: string;
    };
  };

  // События производственных этапов
  [WebSocketRooms.SETTINGS_PRODUCTION_STAGES]: {
    stageLevel1Created: {
      stage: any;
      timestamp: string;
    };
    stageLevel1Updated: {
      stage: any;
      timestamp: string;
    };
    stageLevel1Deleted: {
      stageId: number;
      stageName: string;
      timestamp: string;
    };
    stageLevel2Created: {
      substage: any;
      timestamp: string;
    };
    stageLevel2Updated: {
      substage: any;
      timestamp: string;
    };
    stageLevel2Deleted: {
      substageId: number;
      substageName: string;
      timestamp: string;
    };
    substageLinkedToStage: {
      substageId: number;
      stageId: number;
      substageName: string;
      stageName: string;
      timestamp: string;
    };
    stageLevel2Rebound: {
      substage: any;
      timestamp: string;
    };
  };

  // События маршрутов
  [WebSocketRooms.SETTINGS_ROUTES]: {
    routeCreated: {
      route: any;
      timestamp: string;
    };
    routeUpdated: {
      route: any;
      timestamp: string;
    };
    routeDeleted: {
      routeId: number;
      routeName: string;
      timestamp: string;
    };
    routeCopied: {
      originalRoute: any;
      copiedRoute: any;
      timestamp: string;
    };
    routeStageCreated: {
      routeId: number;
      routeName: string;
      routeStage: any;
      timestamp: string;
    };
    routeStageUpdated: {
      routeId: number;
      routeName: string;
      routeStage: any;
      timestamp: string;
    };
    routeStageDeleted: {
      routeStageId: number;
      routeId: number;
      routeName: string;
      stageName: string;
      substageName?: string;
      timestamp: string;
    };
    routeStagesReordered: {
      routeId: number;
      routeName: string;
      stages: any[];
      timestamp: string;
    };
    routeStageMoved: {
      routeId: number;
      routeName: string;
      routeStageId: number;
      oldSequenceNumber: number;
      newSequenceNumber: number;
      stages: any[];
      timestamp: string;
    };
  };

  // События пользователей (src/modules/settings/services/users)
  [WebSocketRooms.SETTINGS_USER]: {
    userCreated: {
      user: any;
      timestamp: string;
    };
    userUpdated: {
      user: any;
      changes: Record<string, boolean>;
      timestamp: string;
    };
    userDeleted: {
      userId: number;
      userName: string;
      timestamp: string;
    };
    userRoleAssigned: {
      userId: number;
      role: string;
      roleType: 'global' | 'contextual';
      contextType?: string;
      contextId?: number;
      contextName?: string;
      timestamp: string;
    };
    userRoleRemoved: {
      userId: number;
      role: string;
      roleType: 'global' | 'contextual';
      contextType?: string;
      contextId?: number;
      contextName?: string;
      timestamp: string;
    };
    userRoleBindingCreated: {
      userId: number;
      bindingId: number;
      role: string;
      contextType: string;
      contextId: number;
      contextName: string;
      timestamp: string;
    };
    userRoleBindingRemoved: {
      userId: number;
      bindingId: number;
      role: string;
      contextType: string;
      contextId: number;
      contextName: string;
      timestamp: string;
    };
    pickerCreated: {
      picker: any;
      timestamp: string;
    };
    pickerUpdated: {
      picker: any;
      changes: Record<string, boolean>;
      timestamp: string;
    };
    pickerDeleted: {
      pickerId: number;
      pickerName: string;
      timestamp: string;
    };
  };

  // События производственных станков (src/modules/machins/services/)
  [WebSocketRooms.PRODUCT_MACHINES]: {
    machineStatusUpdated: {
      machine: {
        id: number;
        name: string;
        status: string;
        recommendedLoad?: number;
        noShiftAssignment?: boolean;
        segmentId?: number | null;
        segmentName?: string | null;
      };
      timestamp: string;
    };
  };

  // События паллет
  [WebSocketRooms.PALLETS]: {
    palletCreated: any;
    palletUpdated: any;
    palletDeleted: any;
    palletMoved: any;
  };
}

/**
 * Базовый тип для всех событий
 */
export type BaseEventPayload = {
  timestamp: string;
  [key: string]: any;
};

/**
 * Тип для подписки на комнату
 */
export type RoomSubscription = {
  room: WebSocketRooms;
  clientId: string;
  joinedAt: Date;
};