# Удаление MachineOperationHistory для упаковки

## Описание изменения

Удалена логика создания записей `MachineOperationHistory` при завершении задач упаковки в методе [`markTaskAsCompleted()`](../src/modules/packaging/services/packing-task-management.service.ts:120).

## Причина

Для упаковочных операций не требуется сохранять историю в `MachineOperationHistory`, так как:
1. Упаковка - это финальный этап, не связанный с маршрутами деталей
2. Информация об операторах упаковки должна храниться отдельно через junction table `PackingTaskOperator`
3. Создание записей `MachineOperationHistory` для упаковки было искусственным (использовались первые попавшиеся поддон/деталь/этап для соблюдения FK)

## Удаленный код

Из метода `markTaskAsCompleted()` удален блок кода (строки 226-277):

```typescript
// Логируем операцию упаковки для всех активных операторов на станке
if (updatedTask.machineId) {
  // Находим всех активных операторов, привязанных к станку
  const activeOperators = await tx.operatorMachineBinding.findMany({
    where: {
      machineId: updatedTask.machineId,
      isActive: true,
      unboundAt: null,
    },
    select: {
      userId: true,
    },
  });

  const completedAt = new Date();
  const duration = Math.floor(
    (completedAt.getTime() - updatedTask.assignedAt.getTime()) / 1000,
  );

  // Если есть привязанные операторы, создаем запись для каждого
  if (activeOperators.length > 0) {
    // Для упаковки создаем записи без привязки к поддону/детали/этапу
    // Используем первый поддон и деталь из упаковки для соблюдения FK
    const firstPallet = await tx.pallet.findFirst({
      where: { isActive: true },
      select: { palletId: true, partId: true, part: { select: { routeId: true } } },
    });
    
    if (firstPallet) {
      const firstRouteStage = await tx.routeStage.findFirst({
        where: { routeId: firstPallet.part.routeId },
        select: { routeStageId: true },
      });

      if (firstRouteStage) {
        await tx.machineOperationHistory.createMany({
          data: activeOperators.map((operator) => ({
            machineId: updatedTask.machineId,
            palletId: firstPallet.palletId,
            partId: firstPallet.partId,
            routeStageId: firstRouteStage.routeStageId,
            quantityProcessed: completedQty,
            startedAt: updatedTask.assignedAt,
            completedAt: completedAt,
            operatorId: operator.userId,
            duration: duration,
          })),
        });
      }
    }
  }
}
```

## Затронутые файлы

- [`src/modules/packaging/services/packing-task-management.service.ts`](../src/modules/packaging/services/packing-task-management.service.ts:120) - удален блок создания `MachineOperationHistory`

## Следующие шаги

Для полной реализации учета операторов упаковки необходимо:

1. **Создать junction table `PackingTaskOperator`** (см. [`PACKING_TASK_OPERATORS_SOLUTION.md`](./PACKING_TASK_OPERATORS_SOLUTION.md))
   - Добавить модель в `schema.prisma`
   - Создать миграцию

2. **Обновить метод `markTaskAsCompleted()`**
   - Добавить создание записей `PackingTaskOperator` для всех активных операторов
   - Сохранять первого оператора в `PackingTask.assignedTo` для обратной совместимости

3. **Обновить статистику**
   - Изменить запросы в [`statistics.service.ts`](../src/modules/statistics/services/statistics.service.ts:1444) для использования `PackingTaskOperator` вместо `assignedTo`

## Влияние на статистику

После этого изменения:
- ✅ Статистика по `stageId=9` (упаковка) продолжает работать через `PackingTask`
- ✅ Фильтрация по `operatorId` для упаковки работает через `PackingTask.assignedTo` (временно, до внедрения `PackingTaskOperator`)
- ❌ `MachineOperationHistory` больше не содержит записей об упаковке
- ⚠️ Для учета всех операторов упаковки требуется внедрение `PackingTaskOperator`

## Дата изменения

2026-09-17
