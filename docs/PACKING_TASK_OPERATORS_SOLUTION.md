# Решение проблемы с несколькими операторами на упаковке

## Проблема
В таблице `PackingTask` поле `assignedTo` может хранить только одного оператора, но на станке упаковки может работать несколько операторов одновременно.

## Решение
Создать промежуточную таблицу `PackingTaskOperator` для связи многие-ко-многим между заданиями упаковки и операторами.

## Изменения в схеме БД

### 1. Новая таблица PackingTaskOperator

```prisma
model PackingTaskOperator {
  id              Int      @id @default(autoincrement())
  taskId          Int      @map("task_id")
  userId          Int      @map("user_id")
  operatorNumber  Int      @map("operator_number") // Номер оператора на станке (1, 2, 3...)
  assignedAt      DateTime @default(now()) @map("assigned_at")
  
  // Связи
  task     PackingTask @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  operator User        @relation("PackingTaskOperators", fields: [userId], references: [userId])
  
  @@unique([taskId, userId])
  @@map("packing_task_operators")
}
```

### 2. Обновление модели PackingTask

```prisma
model PackingTask {
  // ... существующие поля ...
  
  // Новая связь
  operators PackingTaskOperator[]
  
  // assignedTo оставляем для обратной совместимости (основной ответственный)
  assignedTo  Int?  @map("assigned_to")
}
```

### 3. Обновление модели User

```prisma
model User {
  // ... существующие поля ...
  
  // Новая связь
  packingTaskAssignments PackingTaskOperator[] @relation("PackingTaskOperators")
}
```

## Изменения в коде

### 1. При завершении задания упаковки

В методе `markTaskAsCompleted` и `updateTaskStatus`:

```typescript
// Находим всех активных операторов на станке
const activeOperators = await tx.operatorMachineBinding.findMany({
  where: {
    machineId: updatedTask.machineId,
    isActive: true,
    unboundAt: null,
  },
  select: {
    userId: true,
    operatorNumber: true,
  },
});

// Создаем записи в PackingTaskOperator для всех операторов
if (activeOperators.length > 0) {
  await tx.packingTaskOperator.createMany({
    data: activeOperators.map((operator) => ({
      taskId: taskId,
      userId: operator.userId,
      operatorNumber: operator.operatorNumber,
    })),
    skipDuplicates: true, // Пропускаем если уже есть
  });
}

// Сохраняем первого оператора в assignedTo для обратной совместимости
if (activeOperators.length > 0 && !updatedTask.assignedTo) {
  await tx.packingTask.update({
    where: { taskId },
    data: {
      assignedTo: activeOperators[0].userId,
    },
  });
}
```

### 2. В статистике

Изменить запросы чтобы использовать связь через `PackingTaskOperator`:

```typescript
// Вместо:
packingWhere.assignedTo = dto.operatorId;

// Использовать:
packingWhere.operators = {
  some: {
    userId: dto.operatorId,
  },
};
```

## Преимущества решения

1. ✅ Сохраняются все операторы, работавшие над заданием
2. ✅ Можно отслеживать номер оператора на станке
3. ✅ Обратная совместимость через `assignedTo`
4. ✅ Точная статистика по каждому оператору
5. ✅ История работы операторов

## Миграция данных

Для существующих записей можно создать записи в `PackingTaskOperator` на основе `assignedTo`:

```sql
INSERT INTO packing_task_operators (task_id, user_id, operator_number, assigned_at)
SELECT task_id, assigned_to, 1, assigned_at
FROM packing_tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;
```
