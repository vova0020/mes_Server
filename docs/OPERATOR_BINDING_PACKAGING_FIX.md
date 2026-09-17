# Исправление привязки операторов при обновлении статуса упаковки

## Проблема

При использовании эндпоинта `PUT /packing-task-management/:taskId/status` операторы не привязывались к выполненной работе, хотя при использовании эндпоинта `PUT /packing-task-management/:taskId/complete` привязка работала корректно.

## Причина

В методе [`updateTaskStatus`](src/modules/packaging/services/packing-task-management.service.ts:443) отсутствовал вызов `auditService.logMachineOperation()`, который отвечает за автоматическое создание записей в истории операций для всех операторов, привязанных к станку.

## Решение

Добавлено логирование операций в метод `updateTaskStatus` (строки 649-676):

```typescript
// Логируем операцию упаковки для всех активных операторов на станке
// Логируем только если было выполнено какое-то количество работы
let quantityToLog = 0;
if (dto.completedQuantity !== undefined && dto.completedQuantity > 0) {
  quantityToLog = dto.completedQuantity;
} else if (
  dto.status === PackingTaskStatus.COMPLETED &&
  existingTask.status !== PackingTaskStatus.COMPLETED &&
  dto.completedQuantity === undefined
) {
  // Если статус меняется на COMPLETED без указания количества, логируем остаток
  quantityToLog =
    existingTask.assignedQuantity.toNumber() -
    existingTask.completedQuantity.toNumber();
}

if (quantityToLog > 0) {
  await this.auditService.logMachineOperation({
    machineId: updatedTask.machineId,
    palletId: 0, // Для упаковки поддон не используется, передаем 0
    partId: 0, // Для упаковки partId не используется, передаем 0
    routeStageId: 0, // Для упаковки нет routeStageId, передаем 0
    quantityProcessed: quantityToLog,
    startedAt: updatedTask.assignedAt,
    completedAt: new Date(),
    operatorId: undefined, // Не передаем, чтобы audit service сам нашел операторов
  });
}
```

## Как это работает

1. При обновлении статуса задачи упаковки система проверяет, было ли выполнено какое-то количество работы
2. Если `completedQuantity` указано в запросе, логируется это количество
3. Если статус меняется на `COMPLETED` без указания количества, логируется остаток работы
4. `AuditService.logMachineOperation()` автоматически находит всех операторов, привязанных к станку через таблицу `OperatorMachineBinding`
5. Для каждого оператора создается запись в `MachineOperationHistory`

## Затронутые эндпоинты

### `PUT /packing-task-management/:taskId/status`

**Теперь работает корректно с привязкой операторов**

**Request Body:**
```json
{
  "status": "COMPLETED",
  "completedQuantity": 5
}
```

**Что происходит:**
- Обновляется статус задачи
- Вычитаются детали из запасов
- **Создаются записи в истории операций для всех операторов на станке**
- Обновляется статус упаковки и заказа

## Примеры использования

### Частичное выполнение работы

```bash
PUT /packing-task-management/461/status
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "completedQuantity": 3
}
```

**Результат:** Операторы получат запись о выполнении 3 упаковок

### Полное завершение задачи

```bash
PUT /packing-task-management/461/status
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

**Результат:** Операторы получат запись о выполнении всего остатка работы

### Завершение с указанием количества

```bash
PUT /packing-task-management/461/status
Content-Type: application/json

{
  "status": "COMPLETED",
  "completedQuantity": 10
}
```

**Результат:** Операторы получат запись о выполнении 10 упаковок

## Проверка привязки операторов

### 1. Привязать оператора к станку упаковки

```bash
POST /settings/operators/bind
Content-Type: application/json

{
  "userId": 12,
  "machineCode": "PACK-01"
}
```

### 2. Выполнить работу на станке

```bash
PUT /packing-task-management/461/status
Content-Type: application/json

{
  "status": "COMPLETED",
  "completedQuantity": 5
}
```

### 3. Проверить историю операций оператора

```sql
SELECT * FROM "MachineOperationHistory"
WHERE "operatorId" = 12
  AND "machineId" = 5
ORDER BY "completedAt" DESC;
```

## Связанные файлы

- [`src/modules/packaging/services/packing-task-management.service.ts`](src/modules/packaging/services/packing-task-management.service.ts:649-676) - добавлено логирование операций
- [`src/modules/audit/services/audit.service.ts`](src/modules/audit/services/audit.service.ts:102) - метод автоматического поиска операторов
- [`docs/OPERATOR_BINDING_PACKAGING.md`](docs/OPERATOR_BINDING_PACKAGING.md) - общая документация по привязке операторов к упаковке

## Дата исправления

16 сентября 2026 г.
