# Модуль аудита и аналитики

Автоматическое логирование всех событий в системе MES для аналитики и отслеживания истории.

## Структура

```
audit/
├── services/
│   └── audit.service.ts          # Основной сервис логирования
├── interfaces/
│   └── audit-context.interface.ts # Интерфейсы для данных
├── dto/                           # DTO для API (будущее)
├── audit.module.ts                # Глобальный модуль
├── README.md                      # Эта документация
└── INTEGRATION_EXAMPLE.md         # Примеры интеграции
```

## Возможности

### 1. Логирование событий станков
- Изменение статусов (ACTIVE ↔ INACTIVE ↔ MAINTENANCE ↔ BROKEN)
- История операций (что, когда, кто обрабатывал)
- Сброс счетчиков
- Перемещение заданий между станками

### 2. Логирование заказов
- Изменение статусов заказов
- История выполнения

### 3. Логирование деталей
- Изменение статусов деталей
- Прохождение по маршруту

### 4. Логирование поддонов
- Перемещения между буферами
- Перемещения на станки
- Назначение на упаковки

### 5. Логирование упаковок
- Изменение статусов упаковок

### 6. Логирование рекламаций
- Создание, подтверждение, решение

### 7. Статистика брака
- По станкам
- По типам деталей
- По этапам

### 8. Статистика операторов
- Производительность
- Качество работы
- Время работы

## Использование

### Базовое использование

```typescript
import { AuditService } from '../audit/services/audit.service';

@Injectable()
export class YourService {
  constructor(private auditService: AuditService) {}

  async yourMethod() {
    // Логирование события
    await this.auditService.logEvent(
      EventType.MACHINE_STATUS_CHANGED,
      'machine',
      machineId,
      userId,
      { status: 'ACTIVE' },
      { status: 'MAINTENANCE' },
    );
  }
}
```

### Специализированные методы

```typescript
// Изменение статуса станка
await this.auditService.logMachineStatusChange(
  machineId,
  oldStatus,
  newStatus,
  userId,
  'Плановое обслуживание',
);

// Завершение операции
await this.auditService.logMachineOperation({
  machineId: 1,
  palletId: 10,
  partId: 5,
  routeStageId: 3,
  quantityProcessed: 100,
  startedAt: new Date('2024-01-01 08:00'),
  completedAt: new Date('2024-01-01 10:00'),
  operatorId: 2,
});

// Перемещение поддона
await this.auditService.logPalletMovement({
  palletId: 10,
  fromCellId: 5,
  toCellId: 8,
  movementType: 'TO_BUFFER',
  quantity: 50,
  movedBy: userId,
});

// Логирование брака
await this.auditService.logDefect(
  machineId,
  partId,
  'Царапина',
  5,
  routeStageId,
);

// Обновление статистики оператора
await this.auditService.updateOperatorPerformance(
  operatorId,
  machineId,
  100, // обработано деталей
  2,   // брак
  120, // минут работы
);
```

## Получение данных для аналитики

### История станка

```typescript
const history = await prisma.machineStatusHistory.findMany({
  where: { machineId: 1 },
  orderBy: { createdAt: 'desc' },
  include: { user: true },
});
```

### Производительность станка

```typescript
const operations = await prisma.machineOperationHistory.findMany({
  where: {
    machineId: 1,
    completedAt: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31'),
    },
  },
});

const totalQuantity = operations.reduce(
  (sum, op) => sum + Number(op.quantityProcessed),
  0,
);
```

### Статистика брака

```typescript
const defects = await prisma.defectStatsByMachine.groupBy({
  by: ['machineId', 'defectType'],
  where: {
    detectedAt: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31'),
    },
  },
  _sum: { quantity: true },
});
```

### Производительность оператора

```typescript
const performance = await prisma.operatorPerformanceStats.findMany({
  where: {
    operatorId: 1,
    date: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31'),
    },
  },
  include: { machine: true },
});
```

## Следующие шаги

1. ✅ Создан модуль и сервис
2. ✅ Добавлен в app.module.ts
3. ⏳ Интегрировать в существующие сервисы
4. ⏳ Создать API endpoints для аналитики
5. ⏳ Создать дашборды для визуализации

## Примеры интеграции

См. файл `INTEGRATION_EXAMPLE.md` для подробных примеров интеграции в существующие сервисы.
