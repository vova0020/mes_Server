# Исправления для метода getMachineProduction

## Проблемы

1. **Фильтрация по stageId для упаковки не работает** - когда указан `stageId=9` (упаковка), код пытается искать в `MachineOperationHistory` вместо `PackingTask`
2. **Отсутствует фильтрация по operatorId** - не реализована для обоих типов станков
3. **Комбинация stageId + operatorId не обрабатывается** - особенно для упаковки

## Решение

### 1. Добавить определение финального этапа

```typescript
// Определяем, является ли запрошенный этап финальным (упаковка)
let isFinalStage = false;
let finalStageId: number | null = null;
if (dto.stageId) {
  const stage = await this.prisma.productionStageLevel1.findUnique({
    where: { stageId: dto.stageId },
  });
  isFinalStage = stage?.finalStage ?? false;
  if (isFinalStage) {
    finalStageId = dto.stageId;
  }
  console.log(`Stage ${dto.stageId} is final:`, isFinalStage);
}
```

### 2. Добавить фильтрацию по оператору для PackingTask

В блоке где `isFinalMachine === true`:

```typescript
const packingWhere: any = {
  machineId: dto.machineId,
  completedQuantity: { gt: 0 },
  completedAt: Object.keys(dateWhere).length > 0 ? dateWhere : undefined,
};

// Добавляем фильтр по оператору
if (dto.operatorId) {
  packingWhere.assignedTo = dto.operatorId;
}

const packingTasks = await this.prisma.packingTask.findMany({
  where: packingWhere,
  // ... остальное
});
```

### 3. Добавить фильтрацию по оператору для MachineOperationHistory

В блоке где `isFinalMachine === false`:

```typescript
// Добавляем фильтр по оператору
if (dto.operatorId) {
  whereCondition.operatorId = dto.operatorId;
}
```

### 4. Исправить логику для случая без указания станка

Изменить получение списка финальных станков:

```typescript
const finalStageMachines = await this.prisma.machineStage.findMany({
  where: {
    stage: {
      finalStage: true,
      ...(finalStageId && { stageId: finalStageId }),
    },
  },
  select: {
    machineId: true,
    stageId: true,
  },
});
```

Добавить условную логику запросов:

```typescript
// Определяем, нужно ли запрашивать данные из PackingTask
const shouldQueryPackingTasks =
  isFinalStage || // Если указан финальный этап
  isFinalMachine || // Если указан финальный станок
  (!dto.stageId && !dto.machineId); // Если не указаны фильтры

// Определяем, нужно ли запрашивать данные из MachineOperationHistory
const shouldQueryOperationHistory =
  !isFinalStage || // Если этап не финальный
  (!dto.stageId && !dto.machineId); // Если не указаны фильтры

// 1. ЗАПРОС К MachineOperationHistory (только если нужно)
if (shouldQueryOperationHistory && !isFinalMachine) {
  // ... запрос с фильтрами
}

// 2. ЗАПРОС К PackingTask (только если нужно)
if (shouldQueryPackingTasks && finalMachineIds.length > 0) {
  // ... запрос с фильтрами
}
```

### 5. Добавить фильтры для PackingTask при запросе всех станков

```typescript
const packingWhere: any = {
  completedQuantity: { gt: 0 },
  completedAt: Object.keys(dateWhere).length > 0 ? dateWhere : undefined,
};

// Фильтр по станку
if (dto.machineId && isFinalMachine) {
  packingWhere.machineId = dto.machineId;
} else if (isFinalStage || !dto.machineId) {
  packingWhere.machineId = { in: finalMachineIds };
}

// Фильтр по оператору
if (dto.operatorId) {
  packingWhere.assignedTo = dto.operatorId;
}

// Фильтр по этапу
if (finalStageId) {
  packingWhere.machine = {
    machinesStages: {
      some: {
        stageId: finalStageId,
      },
    },
  },
};
}
```

### 6. Исправить получение stageId для PackingTask

Добавить в include для PackingTask:

```typescript
machine: {
  select: {
    machineId: true,
    machineName: true,
    loadUnit: true,
    machinesStages: {
      where: {
        stage: {
          finalStage: true,
        },
      },
      include: {
        stage: {
          select: {
            stageId: true,
            stageName: true,
          },
        },
      },
    },
  },
},
```

И использовать в маппинге:

```typescript
const machineStage = task.machine.machinesStages[0];
const stageId = machineStage?.stageId || 0;
const stageName = machineStage?.stage?.stageName || 'Упаковка';
```

### 7. Удалить старую фильтрацию по stageId на уровне приложения

Удалить этот блок:

```typescript
// Применяем фильтр по этапу (stageId) на уровне приложения для финальных станков
if (dto.stageId && result.length > 0) {
  result = result.filter((record) => record.stageId === dto.stageId);
}
```

Теперь фильтрация происходит на уровне базы данных.

## Тестовые сценарии

1. `?stageId=9` - должен вернуть только данные из PackingTask
2. `?operatorId=36` - должен вернуть данные оператора из обеих таблиц
3. `?stageId=9&operatorId=36` - должен вернуть данные оператора только по упаковке
4. `?machineId=X` где X - финальный станок - должен работать с PackingTask
5. `?machineId=Y` где Y - обычный станок - должен работать с MachineOperationHistory
