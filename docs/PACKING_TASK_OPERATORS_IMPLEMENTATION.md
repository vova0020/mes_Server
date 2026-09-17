# Реализация PackingTaskOperator - Учет нескольких операторов на упаковке

## Обзор

Реализована полная поддержка учета нескольких операторов, работающих на одной упаковочной станции. Создана junction table `PackingTaskOperator` для связи задач упаковки с операторами (many-to-many).

## Дата реализации

2026-09-17

## Выполненные изменения

### 1. Схема базы данных

#### Добавлена модель `PackingTaskOperator` в [`schema.prisma`](../prisma/schema.prisma:1093)

```prisma
model PackingTaskOperator {
  id             Int      @id @default(autoincrement())
  taskId         Int      @map("task_id")
  userId         Int      @map("user_id")
  operatorNumber Int      @map("operator_number")
  assignedAt     DateTime @default(now()) @map("assigned_at")

  task     PackingTask @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  operator User        @relation("PackingTaskOperators", fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([taskId, userId])
  @@index([taskId])
  @@index([userId])
  @@map("packing_task_operators")
}
```

**Поля:**
- `id` - уникальный идентификатор записи
- `taskId` - ссылка на задачу упаковки
- `userId` - ссылка на оператора
- `operatorNumber` - порядковый номер оператора (1, 2, 3...)
- `assignedAt` - время назначения оператора

**Индексы:**
- Уникальный индекс на `(taskId, userId)` - предотвращает дубликаты
- Индекс на `taskId` - для быстрого поиска операторов задачи
- Индекс на `userId` - для быстрого поиска задач оператора

#### Обновлена модель `PackingTask`

Добавлена связь с операторами:
```prisma
model PackingTask {
  // ... существующие поля
  operators    PackingTaskOperator[]
}
```

#### Обновлена модель `User`

Добавлена связь с задачами упаковки:
```prisma
model User {
  // ... существующие поля
  packingTaskAssignments PackingTaskOperator[] @relation("PackingTaskOperators")
}
```

### 2. Миграция базы данных

Создан SQL файл миграции: [`prisma/migrations/add_packing_task_operators.sql`](../prisma/migrations/add_packing_task_operators.sql)

```sql
CREATE TABLE IF NOT EXISTS "packing_task_operators" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "operator_number" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "packing_task_operators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "packing_task_operators_task_id_user_id_key" 
  ON "packing_task_operators"("task_id", "user_id");
CREATE INDEX "packing_task_operators_task_id_idx" 
  ON "packing_task_operators"("task_id");
CREATE INDEX "packing_task_operators_user_id_idx" 
  ON "packing_task_operators"("user_id");

ALTER TABLE "packing_task_operators" 
  ADD CONSTRAINT "packing_task_operators_task_id_fkey" 
  FOREIGN KEY ("task_id") REFERENCES "packing_tasks"("task_id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "packing_task_operators" 
  ADD CONSTRAINT "packing_task_operators_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

Миграция применена через скрипт [`apply-packing-operators-migration.js`](../apply-packing-operators-migration.js)

### 3. Обновление логики упаковки

#### Файл: [`src/modules/packaging/services/packing-task-management.service.ts`](../src/modules/packaging/services/packing-task-management.service.ts:120)

В методе `markTaskAsCompleted()` добавлен код для сохранения операторов (после строки 224):

```typescript
// Сохраняем информацию об операторах, работавших над задачей
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

  // Если есть привязанные операторы, создаем записи для каждого
  if (activeOperators.length > 0) {
    await tx.packingTaskOperator.createMany({
      data: activeOperators.map((operator, index) => ({
        taskId: updatedTask.taskId,
        userId: operator.userId,
        operatorNumber: index + 1,
        assignedAt: updatedTask.assignedAt,
      })),
      skipDuplicates: true, // Пропускаем дубликаты если оператор уже был добавлен
    });
  }
}
```

**Логика:**
1. Находим всех активных операторов через `OperatorMachineBinding`
2. Создаем запись `PackingTaskOperator` для каждого оператора
3. Присваиваем порядковый номер (1, 2, 3...)
4. Используем `skipDuplicates` для предотвращения ошибок при повторном выполнении

### 4. Обновление статистики

#### Файл: [`src/modules/statistics/services/statistics.service.ts`](../src/modules/statistics/services/statistics.service.ts:1444)

**Изменение 1: Фильтрация по оператору (строка 1505)**

Было:
```typescript
if (dto.operatorId) {
  packingWhere.assignedTo = dto.operatorId;
}
```

Стало:
```typescript
if (dto.operatorId) {
  packingWhere.operators = {
    some: {
      userId: dto.operatorId,
    },
  };
}
```

**Изменение 2: Включение операторов в запрос (строка 1510)**

Добавлено в `include`:
```typescript
operators: {
  include: {
    operator: {
      include: {
        userDetail: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    },
  },
},
```

**Изменение 3: Аналогичные изменения для второго запроса (строка 1966)**

Применены те же изменения для запроса финальных станков.

#### Файл: [`src/modules/statistics/services/statistics-optimized.service.ts`](../src/modules/statistics/services/statistics-optimized.service.ts:499)

Применены аналогичные изменения:
- Фильтрация через `operators.some`
- Включение данных операторов в select

## Преимущества решения

### 1. Точный учет операторов
- Сохраняются все операторы, работавшие над задачей
- Порядковый номер показывает последовательность

### 2. Гибкая фильтрация
- Можно найти все задачи конкретного оператора
- Можно найти всех операторов конкретной задачи

### 3. Обратная совместимость
- Поле `PackingTask.assignedTo` сохранено для основного ответственного
- Старый код продолжит работать

### 4. Производительность
- Индексы обеспечивают быстрый поиск
- Уникальный индекс предотвращает дубликаты

## Использование

### Получение операторов задачи

```typescript
const task = await prisma.packingTask.findUnique({
  where: { taskId: 123 },
  include: {
    operators: {
      include: {
        operator: {
          include: {
            userDetail: true,
          },
        },
      },
      orderBy: {
        operatorNumber: 'asc',
      },
    },
  },
});

// task.operators[0] - первый оператор
// task.operators[1] - второй оператор
```

### Получение задач оператора

```typescript
const operatorTasks = await prisma.packingTaskOperator.findMany({
  where: {
    userId: 36,
  },
  include: {
    task: {
      include: {
        package: true,
        machine: true,
      },
    },
  },
});
```

### Статистика по оператору

```typescript
// GET /statistics/machine-production?operatorId=36&stageId=9
// Вернет все задачи упаковки, в которых участвовал оператор 36
```

## Связанные документы

- [`MACHINE_PRODUCTION_STATISTICS_FIX.md`](./MACHINE_PRODUCTION_STATISTICS_FIX.md) - Исправление статистики упаковки
- [`PACKAGING_MACHINE_OPERATION_HISTORY_REMOVAL.md`](./PACKAGING_MACHINE_OPERATION_HISTORY_REMOVAL.md) - Удаление MachineOperationHistory для упаковки
- [`PACKING_TASK_OPERATORS_SOLUTION.md`](./PACKING_TASK_OPERATORS_SOLUTION.md) - Первоначальное решение

## Миграция существующих данных

Для миграции существующих данных из `PackingTask.assignedTo` в `PackingTaskOperator`:

```sql
INSERT INTO packing_task_operators (task_id, user_id, operator_number, assigned_at)
SELECT 
  task_id,
  assigned_to,
  1, -- первый оператор
  assigned_at
FROM packing_tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;
```

## Тестирование

### Сценарий 1: Один оператор
1. Оператор привязывается к станку упаковки
2. Выполняет задачу
3. В `packing_task_operators` создается 1 запись

### Сценарий 2: Несколько операторов
1. Два оператора привязываются к станку упаковки
2. Выполняют задачу
3. В `packing_task_operators` создается 2 записи с `operatorNumber` 1 и 2

### Сценарий 3: Статистика
1. Запрос `GET /statistics/machine-production?operatorId=36&stageId=9`
2. Возвращает все задачи, где оператор 36 участвовал
3. Включая задачи, где он был не единственным оператором

## Производительность

- **Создание записей**: O(n) где n - количество операторов (обычно 1-3)
- **Поиск по оператору**: O(log n) благодаря индексу на `userId`
- **Поиск по задаче**: O(log n) благодаря индексу на `taskId`
- **Предотвращение дубликатов**: O(1) благодаря уникальному индексу

## Заключение

Реализация полностью решает проблему учета нескольких операторов на упаковочных станциях. Система теперь корректно:
- Сохраняет всех операторов задачи
- Фильтрует статистику по операторам
- Поддерживает обратную совместимость
- Обеспечивает высокую производительность
