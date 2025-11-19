# Интеграция модуля Audit в palletsProduct

## Обзор
Модуль audit интегрирован во все сервисы palletsProduct для логирования всех действий с поддонами.

## Интегрированные события

### PalletsMasterService
- **PALLET_ASSIGNED_TO_MACHINE** - назначение поддона на станок
- **PALLET_MOVED_TO_BUFFER** - перемещение поддона в буфер  
- **OPERATION_STATUS_CHANGED** - изменение статуса операции
- **PALLET_CREATED** - создание нового поддона
- **DEFECT_LOGGED** - отбраковка деталей
- **RECLAMATION_CREATED** - создание рекламации

### PalletMachineService
- **PALLET_PROCESSING_STARTED** - начало обработки поддона
- **MACHINE_OPERATION_COMPLETED** - завершение операции на станке
- **DEFECT_LOGGED** - отбраковка деталей на станке
- **RECLAMATION_CREATED** - создание рекламации

### PalletMachineNoSmenService  
- **PALLET_TAKEN_TO_WORK** - взятие поддона в работу
- **MACHINE_OPERATION_COMPLETED** - завершение обработки
- **PALLET_CREATED** - создание поддона
- **DEFECT_LOGGED** - отбраковка деталей
- **RECLAMATION_CREATED** - создание рекламации

## Типы логируемых данных

### Операции с поддонами
```typescript
await this.auditService.logEvent(
  'PALLET_ASSIGNED_TO_MACHINE',
  'pallet', 
  palletId,
  operatorId,
  null,
  { machineId, stageId },
  { assignmentId }
);
```

### Движения поддонов
```typescript
await this.auditService.logPalletMovement({
  palletId,
  fromCellId,
  toCellId, 
  movementType: 'TO_BUFFER',
  quantity: Number(pallet.quantity),
});
```

### Операции на станках
```typescript
await this.auditService.logMachineOperation({
  machineId,
  palletId,
  partId,
  routeStageId,
  quantityProcessed,
  startedAt,
  completedAt,
  operatorId,
});
```

### Отбраковка и рекламации
```typescript
await this.auditService.logDefect(
  machineId,
  partId,
  'MACHINE_DEFECT',
  quantity,
  routeStageId
);

await this.auditService.logReclamationAction(
  reclamationId,
  'CREATED',
  reportedById,
  undefined,
  'NEW',
  description
);
```

## Преимущества интеграции
- Полная трассируемость всех операций с поддонами
- Автоматическое логирование без дополнительного кода в контроллерах
- Единообразный формат логов для всех сервисов
- Возможность анализа производительности и выявления проблем