# Привязка операторов к станкам упаковки

## Описание

Реализована функциональность автоматического сохранения информации об операторах при выполнении работ на станках упаковки. Система автоматически находит всех операторов, привязанных к станку упаковки, и создает записи об их работе в истории операций.

## Как это работает

При завершении задания упаковки система:
1. Вызывает [`AuditService.logMachineOperation()`](src/modules/audit/services/audit.service.ts:102)
2. Audit service автоматически находит всех активных операторов, привязанных к станку (через таблицу [`OperatorMachineBinding`](prisma/schema.prisma:818))
3. Создает запись в [`MachineOperationHistory`](prisma/schema.prisma:1) для каждого оператора

## Изменения

### 1. Сервис упаковки

**Файл:** [`src/modules/packaging/services/packing-task-management.service.ts`](src/modules/packaging/services/packing-task-management.service.ts:1)

#### Добавлен импорт AuditService
```typescript
import { AuditService } from '../../audit/services/audit.service';
```

#### Добавлен AuditService в конструктор
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly socketService: SocketService,
  private readonly auditService: AuditService,  // ДОБАВЛЕНО
) {}
```

#### Метод `markTaskAsCompleted`
При завершении задания теперь логируется операция для всех операторов:

```typescript
// Логируем операцию упаковки для всех активных операторов на станке
await this.auditService.logMachineOperation({
  machineId: updatedTask.machineId,
  palletId: 0, // Для упаковки поддон не используется
  partId: 0, // Для упаковки partId не используется
  routeStageId: 0, // Для упаковки нет routeStageId
  quantityProcessed: completedQty,
  startedAt: updatedTask.assignedAt,
  completedAt: new Date(),
  operatorId: undefined, // Не передаем, чтобы audit service сам нашел операторов
});
```

### 2. Audit Service (без изменений)

**Файл:** [`src/modules/audit/services/audit.service.ts`](src/modules/audit/services/audit.service.ts:102)

Метод `logMachineOperation` уже содержит логику автоматического поиска операторов:

```typescript
// Получаем всех активных операторов, привязанных к станку
const activeOperators = await this.prisma.operatorMachineBinding.findMany({
  where: {
    machineId: data.machineId,
    isActive: true,
    unboundAt: null,
  },
  select: {
    userId: true,
  },
});

// Если есть привязанные операторы, создаем запись для каждого
if (activeOperators.length > 0) {
  await this.prisma.machineOperationHistory.createMany({
    data: activeOperators.map((operator) => ({
      machineId: data.machineId,
      palletId: data.palletId,
      partId: data.partId,
      routeStageId: data.routeStageId,
      quantityProcessed: data.quantityProcessed,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      operatorId: operator.userId,
      duration,
    })),
  });
}
```

## Таблицы базы данных

### OperatorMachineBinding
Таблица привязок операторов к станкам (используется для всех станков, включая упаковку):

```prisma
model OperatorMachineBinding {
  bindingId      Int       @id @default(autoincrement())
  userId         Int
  machineId      Int
  operatorNumber Int
  boundAt        DateTime  @default(now())
  unboundAt      DateTime?
  isActive       Boolean   @default(true)
  
  user    User    @relation(fields: [userId], references: [userId])
  machine Machine @relation(fields: [machineId], references: [machineId])
}
```

### MachineOperationHistory
Таблица истории операций на станках (создается автоматически для каждого оператора):

```prisma
model MachineOperationHistory {
  operationId       Int      @id @default(autoincrement())
  machineId         Int
  palletId          Int?
  partId            Int?
  routeStageId      Int?
  quantityProcessed Int
  startedAt         DateTime
  completedAt       DateTime
  operatorId        Int?
  duration          Int?
}
```

## Использование API

### Начало работы на упаковке

**Endpoint:** `PUT /packing-task-management/:taskId/start`

**Request Body:**
```json
{
  "machineId": 5
}
```

**Примечание:** Операторы должны быть предварительно привязаны к станку через API привязки операторов.

### Завершение работы на упаковке

**Endpoint:** `PUT /packing-task-management/:taskId/complete`

**Request Body:**
```json
{
  "machineId": 5,
  "completedQuantity": 10
}
```

**Что происходит при завершении:**
1. Система находит всех операторов, привязанных к станку `machineId`
2. Для каждого оператора создается запись в `MachineOperationHistory`
3. Записи содержат информацию о количестве упакованных изделий и времени работы

## Управление привязками операторов

Операторы привязываются к станкам упаковки через существующий API:

### Привязать оператора к станку
**Endpoint:** `POST /settings/operators/bind`

**Request Body:**
```json
{
  "userId": 12,
  "machineCode": "PACK-01"
}
```

### Отвязать оператора от станка
**Endpoint:** `POST /settings/operators/unbind`

**Request Body:**
```json
{
  "userId": 12,
  "machineId": 5
}
```

### Получить привязки станка
**Endpoint:** `GET /settings/operators/machine/:machineId/bindings`

## Преимущества

1. **Автоматическое отслеживание** - система сама находит всех операторов на станке
2. **Статистика по операторам** - возможность анализировать производительность каждого оператора
3. **Единообразие** - упаковка работает так же, как и обычные производственные станки
4. **Гибкость** - на одном станке может работать несколько операторов одновременно
5. **История операций** - полная история работы каждого оператора на каждом станке

## Связанные файлы

- `src/modules/packaging/dto/packing-task-management.dto.ts` - DTO с новыми полями
- `src/modules/packaging/services/packing-task-management.service.ts` - логика привязки операторов
- `src/modules/packaging/controllers/packing-task-management.controller.ts` - контроллер (без изменений)
- `prisma/schema.prisma` - схема таблицы `OperatorMachineBinding`
- `src/modules/settings/services/operators/operator-binding.service.ts` - сервис для ручного управления привязками

## Примечания

- Привязки операторов используют ту же таблицу, что и обычные производственные станки
- При начале работы на новом станке старая привязка автоматически закрывается
- Если оператор уже привязан к станку, повторная привязка не создается
- Номер оператора на станке назначается автоматически (следующий свободный)
