# Настройка системы аудита - Пошаговая инструкция

## ✅ Что уже сделано

1. ✅ Добавлены таблицы истории в `schema.prisma`
2. ✅ Создан модуль `AuditModule`
3. ✅ Создан сервис `AuditService` с методами логирования
4. ✅ Модуль добавлен в `app.module.ts`
5. ✅ Создана документация и примеры

## 📋 Что нужно сделать

### Шаг 1: Выполнить миграцию базы данных

```bash
cd c:\Users\prosk\Documents\GitHub\mes_Server
npx prisma migrate dev --name add_audit_system
npx prisma generate
```

### Шаг 2: Перезапустить сервер

```bash
npm run start:dev
```

### Шаг 3: Интегрировать логирование в существующие сервисы

#### 3.1. Добавить AuditService в конструкторы сервисов

Пример для `MachinMasterService`:

```typescript
import { AuditService } from '../../audit/services/audit.service';

constructor(
  private readonly prisma: PrismaService,
  private socketService: SocketService,
  private auditService: AuditService, // ← Добавить
) {}
```

#### 3.2. Добавить логирование в методы

**Пример 1: Сброс счетчика станка**

В методе `resetMachineCounter` добавить после обновления:

```typescript
// После this.prisma.machine.update(...)
await this.auditService.logEvent(
  EventType.MACHINE_COUNTER_RESET,
  'machine',
  machineId,
  null, // userId (получить из контекста)
  { counterResetAt: machine.counterResetAt },
  { counterResetAt: new Date() },
);
```

**Пример 2: Перемещение задания**

В методе `moveTaskToMachine` добавить после транзакции:

```typescript
// После this.prisma.$transaction(...)
await this.auditService.logEvent(
  EventType.MACHINE_TASK_MOVED,
  'machine_assignment',
  operationId,
  null, // userId
  { machineId: assignment.machineId },
  { machineId: targetMachineId },
  { palletId: assignment.palletId },
);
```

**Пример 3: Удаление задания**

В методе `deleteTaskById` добавить после транзакции:

```typescript
// После this.prisma.$transaction(...)
await this.auditService.logEvent(
  EventType.MACHINE_TASK_DELETED,
  'machine_assignment',
  operationId,
  null, // userId
  { 
    machineId: assignment.machineId,
    palletId: assignment.palletId 
  },
  null,
);
```

### Шаг 4: Получение userId из контекста

#### 4.1. Обновить контроллеры для передачи userId

```typescript
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Post('machine/:machineId/reset-counter')
async resetMachineCounter(
  @Param('machineId', ParseIntPipe) machineId: number,
  @CurrentUser() user: any, // ← Добавить
): Promise<{ message: string }> {
  return this.machinService.resetMachineCounter(machineId, user?.userId);
}
```

#### 4.2. Обновить сигнатуры методов сервисов

```typescript
async resetMachineCounter(
  machineId: number,
  userId?: number, // ← Добавить
): Promise<{ message: string }> {
  // ...
  await this.auditService.logEvent(
    EventType.MACHINE_COUNTER_RESET,
    'machine',
    machineId,
    userId, // ← Использовать
    // ...
  );
}
```

### Шаг 5: Создать API endpoints для аналитики (опционально)

Создать контроллер для получения аналитики:

```typescript
// src/modules/audit/controllers/analytics.controller.ts
@Controller('analytics')
export class AnalyticsController {
  constructor(private prisma: PrismaService) {}

  @Get('machine/:machineId/history')
  async getMachineHistory(@Param('machineId') machineId: number) {
    return this.prisma.machineStatusHistory.findMany({
      where: { machineId: +machineId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  @Get('machine/:machineId/operations')
  async getMachineOperations(
    @Param('machineId') machineId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.prisma.machineOperationHistory.findMany({
      where: {
        machineId: +machineId,
        completedAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      include: {
        part: true,
        operator: true,
      },
    });
  }

  @Get('defects/by-machine')
  async getDefectsByMachine(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.prisma.defectStatsByMachine.groupBy({
      by: ['machineId', 'defectType'],
      where: {
        detectedAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      _sum: { quantity: true },
    });
  }
}
```

## 📊 Примеры использования

### Получить историю станка

```typescript
GET /analytics/machine/1/history
```

### Получить операции станка за период

```typescript
GET /analytics/machine/1/operations?from=2024-01-01&to=2024-01-31
```

### Получить статистику брака

```typescript
GET /analytics/defects/by-machine?from=2024-01-01&to=2024-01-31
```

## 🎯 Приоритетные места для интеграции

1. **Станки** (MachinMasterService)
   - ✅ Сброс счетчика
   - ✅ Перемещение задания
   - ✅ Удаление задания
   - ⏳ Изменение статуса станка
   - ⏳ Завершение операции

2. **Заказы** (OrdersService)
   - ⏳ Создание заказа
   - ⏳ Изменение статуса
   - ⏳ Завершение заказа

3. **Поддоны** (PalletsService)
   - ⏳ Создание поддона
   - ⏳ Перемещение между буферами
   - ⏳ Назначение на станок

4. **Упаковки** (PackagingService)
   - ⏳ Изменение статуса
   - ⏳ Назначение задачи
   - ⏳ Завершение упаковки

5. **Рекламации** (ReclamationService)
   - ⏳ Создание рекламации
   - ⏳ Подтверждение
   - ⏳ Решение

## 📚 Документация

- `prisma/AUDIT_SYSTEM.md` - Описание таблиц и возможностей
- `src/modules/audit/README.md` - Документация модуля
- `src/modules/audit/INTEGRATION_EXAMPLE.md` - Примеры интеграции

## 🚀 Следующие шаги

1. Выполнить миграцию БД
2. Интегрировать в 2-3 ключевых места
3. Протестировать логирование
4. Создать API для аналитики
5. Постепенно добавлять в остальные сервисы
