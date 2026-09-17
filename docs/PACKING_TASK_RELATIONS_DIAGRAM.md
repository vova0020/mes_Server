# Схема связей PackingTask и PackingTaskOperator

## Диаграмма связей

```
┌─────────────────────────────────────────────────────────────────┐
│                         PackingTask                              │
│  (таблица: packing_tasks)                                       │
├─────────────────────────────────────────────────────────────────┤
│  taskId (PK)                                                     │
│  packageId (FK → Package)                                        │
│  machineId (FK → Machine)                                        │
│  assignedTo (FK → User) - основной ответственный                │
│  status                                                          │
│  assignedAt                                                      │
│  completedAt                                                     │
│  assignedQuantity                                                │
│  completedQuantity                                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 1:N (один ко многим)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PackingTaskOperator                            │
│  (таблица: packing_task_operators)                              │
│  Junction Table для связи many-to-many                          │
├─────────────────────────────────────────────────────────────────┤
│  id (PK)                                                         │
│  taskId (FK → PackingTask) ◄─────────────────────┐             │
│  userId (FK → User)                               │             │
│  operatorNumber                                   │             │
│  assignedAt                                       │             │
│                                                   │             │
│  UNIQUE INDEX: (taskId, userId)                  │             │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                                    │
                                                    │
                                                    │
┌───────────────────────────────────────────────────┼─────────────┐
│                         User                      │             │
│  (таблица: users)                                 │             │
├───────────────────────────────────────────────────┼─────────────┤
│  userId (PK) ◄────────────────────────────────────┘             │
│  login                                                           │
│  password                                                        │
│  ...                                                             │
│                                                                  │
│  Связи:                                                          │
│  - packingTasks (1:N) - задачи где основной ответственный       │
│  - packingTaskAssignments (1:N) - все задачи где участвовал     │
└──────────────────────────────────────────────────────────────────┘
```

## Prisma Schema

### PackingTask (строки 1060-1095)

```prisma
model PackingTask {
  taskId      Int               @id @default(autoincrement()) @map("task_id")
  packageId   Int               @map("package_id")
  machineId   Int               @map("machine_id")
  assignedTo  Int?              @map("assigned_to")
  // ... другие поля
  
  // Связи:
  package      Package @relation("AssignedPackage", fields: [packageId], references: [packageId], onDelete: Cascade)
  machine      Machine @relation(fields: [machineId], references: [machineId])
  assignedUser User?   @relation("AssignedUser", fields: [assignedTo], references: [userId])
  
  // ⭐ НОВАЯ СВЯЗЬ - список всех операторов задачи
  operators    PackingTaskOperator[]  // 1:N связь
  
  @@map("packing_tasks")
}
```

### PackingTaskOperator (строки 1098-1121)

```prisma
model PackingTaskOperator {
  id             Int      @id @default(autoincrement())
  taskId         Int      @map("task_id")
  userId         Int      @map("user_id")
  operatorNumber Int      @map("operator_number")
  assignedAt     DateTime @default(now()) @map("assigned_at")

  // Связи:
  // ⭐ Обратная связь к задаче
  task     PackingTask @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  
  // ⭐ Связь с оператором
  operator User        @relation("PackingTaskOperators", fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([taskId, userId])  // Один оператор не может быть дважды на одной задаче
  @@index([taskId])           // Быстрый поиск операторов задачи
  @@index([userId])           // Быстрый поиск задач оператора
  @@map("packing_task_operators")
}
```

### User (строки 23-69)

```prisma
model User {
  userId    Int      @id @default(autoincrement()) @map("user_id")
  login     String   @unique
  // ... другие поля
  
  // Связи:
  // Старая связь - задачи где пользователь основной ответственный
  packingTasks          PackingTask[] @relation("AssignedUser")
  
  // ⭐ НОВАЯ СВЯЗЬ - все задачи где пользователь участвовал как оператор
  packingTaskAssignments PackingTaskOperator[] @relation("PackingTaskOperators")
  
  @@map("users")
}
```

## Как работают связи

### 1. От PackingTask к операторам

```typescript
// Получить задачу со всеми операторами
const task = await prisma.packingTask.findUnique({
  where: { taskId: 123 },
  include: {
    operators: {  // ⭐ Используем связь operators
      include: {
        operator: {  // Получаем данные оператора
          include: {
            userDetail: true,
          },
        },
      },
      orderBy: {
        operatorNumber: 'asc',  // Сортируем по порядковому номеру
      },
    },
  },
});

// Результат:
// task.operators[0].operator.userDetail.firstName - имя первого оператора
// task.operators[1].operator.userDetail.firstName - имя второго оператора
```

### 2. От User к задачам упаковки

```typescript
// Получить все задачи где пользователь участвовал
const user = await prisma.user.findUnique({
  where: { userId: 36 },
  include: {
    packingTaskAssignments: {  // ⭐ Используем связь packingTaskAssignments
      include: {
        task: {  // Получаем данные задачи
          include: {
            package: true,
            machine: true,
          },
        },
      },
    },
  },
});

// Результат:
// user.packingTaskAssignments[0].task - первая задача
// user.packingTaskAssignments[0].operatorNumber - каким по счету был оператор
```

### 3. Фильтрация в статистике

```typescript
// Найти все задачи где участвовал оператор 36
const tasks = await prisma.packingTask.findMany({
  where: {
    operators: {  // ⭐ Фильтруем через связь operators
      some: {     // some = хотя бы один оператор должен соответствовать
        userId: 36,
      },
    },
  },
  include: {
    operators: {
      include: {
        operator: {
          include: {
            userDetail: true,
          },
        },
      },
    },
  },
});
```

## Foreign Keys в базе данных

### В таблице packing_task_operators:

1. **task_id → packing_tasks.task_id**
   - Constraint: `packing_task_operators_task_id_fkey`
   - ON DELETE CASCADE - при удалении задачи удаляются все записи операторов
   - ON UPDATE CASCADE - при изменении task_id обновляются все ссылки

2. **user_id → users.user_id**
   - Constraint: `packing_task_operators_user_id_fkey`
   - ON DELETE CASCADE - при удалении пользователя удаляются все его записи
   - ON UPDATE CASCADE - при изменении user_id обновляются все ссылки

## Индексы для производительности

1. **PRIMARY KEY (id)** - уникальный идентификатор записи
2. **UNIQUE INDEX (task_id, user_id)** - предотвращает дубликаты (один оператор не может быть дважды на одной задаче)
3. **INDEX (task_id)** - быстрый поиск всех операторов задачи
4. **INDEX (user_id)** - быстрый поиск всех задач оператора

## Пример данных

### Таблица packing_tasks
| task_id | package_id | machine_id | assigned_to | status    |
|---------|------------|------------|-------------|-----------|
| 100     | 50         | 5          | 36          | COMPLETED |
| 101     | 51         | 5          | 42          | COMPLETED |

### Таблица packing_task_operators
| id  | task_id | user_id | operator_number | assigned_at         |
|-----|---------|---------|-----------------|---------------------|
| 1   | 100     | 36      | 1               | 2026-09-17 10:00:00 |
| 2   | 100     | 42      | 2               | 2026-09-17 10:00:00 |
| 3   | 101     | 42      | 1               | 2026-09-17 11:00:00 |
| 4   | 101     | 55      | 2               | 2026-09-17 11:00:00 |

**Интерпретация:**
- Задача 100: операторы 36 (первый) и 42 (второй)
- Задача 101: операторы 42 (первый) и 55 (второй)
- Оператор 36: участвовал в задаче 100
- Оператор 42: участвовал в задачах 100 и 101
- Оператор 55: участвовал в задаче 101

## Преимущества такой структуры

✅ **Гибкость** - можно добавить любое количество операторов к задаче
✅ **Порядок** - operatorNumber показывает последовательность
✅ **Производительность** - индексы обеспечивают быстрый поиск
✅ **Целостность** - CASCADE DELETE автоматически очищает связи
✅ **Уникальность** - UNIQUE INDEX предотвращает дубликаты
✅ **Обратная совместимость** - assignedTo сохранен для старого кода
