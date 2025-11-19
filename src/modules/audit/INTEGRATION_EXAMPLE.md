# Пример интеграции системы аудита

## 1. Добавить AuditModule в app.module.ts

```typescript
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // ... другие модули
    AuditModule, // Добавить глобальный модуль аудита
  ],
})
export class AppModule {}
```

## 2. Пример интеграции в MachinMasterService

### Добавить AuditService в конструктор:

```typescript
import { AuditService } from '../../audit/services/audit.service';

constructor(
  private readonly prisma: PrismaService,
  private socketService: SocketService,
  private auditService: AuditService, // Добавить
) {}
```

### Логирование сброса счетчика станка:

```typescript
async resetMachineCounter(machineId: number): Promise<{ message: string }> {
  this.logger.log(`Сброс счетчика для станка с ID: ${machineId}`);

  try {
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Обновляем время сброса счетчика
    await this.prisma.machine.update({
      where: { machineId },
      data: {
        counterResetAt: new Date(),
        partiallyCompleted: 0,
      },
    });

    // ✅ ЛОГИРУЕМ СОБЫТИЕ
    await this.auditService.logEvent(
      EventType.MACHINE_COUNTER_RESET,
      'machine',
      machineId,
      null, // userId можно получить из контекста
      { counterResetAt: machine.counterResetAt },
      { counterResetAt: new Date() },
    );

    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine:event',
      { status: 'updated' },
    );

    this.logger.log(`Счетчик для станка с ID ${machineId} успешно сброшен`);
    return {
      message: `Счетчик для станка ${machine.machineName} успешно сброшен`,
    };
  } catch (error) {
    this.logger.error(
      `Ошибка при сбросе счетчика для станка с ID ${machineId}: ${(error as Error).message}`,
    );
    throw error;
  }
}
```

### Логирование перемещения задания:

```typescript
async moveTaskToMachine(moveTaskDto: MoveTaskDto): Promise<{ message: string }> {
  const { operationId, targetMachineId } = moveTaskDto;
  
  try {
    const assignment = await this.prisma.machineAssignment.findUnique({
      where: { assignmentId: operationId },
      include: {
        pallet: { include: { part: true } },
        machine: true, // Добавить для логирования
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Задание с ID ${operationId} не найдено`);
    }

    if (assignment.completedAt !== null) {
      throw new BadRequestException(
        `Нельзя перемещать завершенное задание с ID ${operationId}`,
      );
    }

    const targetMachine = await this.prisma.machine.findUnique({
      where: { machineId: targetMachineId },
    });
    
    if (!targetMachine) {
      throw new NotFoundException(`Станок с ID ${targetMachineId} не найден`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.machineAssignment.update({
        where: { assignmentId: operationId },
        data: { machineId: targetMachineId },
      });

      await tx.partMachineAssignment.deleteMany({
        where: {
          machineId: assignment.machineId,
          partId: assignment.pallet.part.partId,
        },
      });
      
      await tx.partMachineAssignment.upsert({
        where: {
          machine_part_unique: {
            machineId: targetMachineId,
            partId: assignment.pallet.part.partId,
          },
        },
        update: { assignedAt: new Date() },
        create: {
          machineId: targetMachineId,
          partId: assignment.pallet.part.partId,
          priority: 0,
          assignedAt: new Date(),
        },
      });
    });

    // ✅ ЛОГИРУЕМ СОБЫТИЕ
    await this.auditService.logEvent(
      EventType.MACHINE_TASK_MOVED,
      'machine_assignment',
      operationId,
      null, // userId
      { 
        machineId: assignment.machineId,
        machineName: assignment.machine.machineName 
      },
      { 
        machineId: targetMachineId,
        machineName: targetMachine.machineName 
      },
      { 
        palletId: assignment.palletId,
        partId: assignment.pallet.part.partId 
      },
    );

    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );

    return {
      message: `Задание успешно перемещено на станок ${targetMachine.machineName}`,
    };
  } catch (error) {
    this.logger.error(`Ошибка при перемещении задания: ${error.message}`);
    throw error;
  }
}
```

## 3. Пример логирования завершения операции

Когда оператор завершает обработку на станке:

```typescript
async completeOperation(
  assignmentId: number,
  operatorId?: number,
): Promise<void> {
  const assignment = await this.prisma.machineAssignment.findUnique({
    where: { assignmentId },
    include: {
      pallet: { include: { part: true } },
      machine: true,
    },
  });

  if (!assignment) {
    throw new NotFoundException('Задание не найдено');
  }

  const completedAt = new Date();

  await this.prisma.machineAssignment.update({
    where: { assignmentId },
    data: { completedAt },
  });

  // ✅ ЛОГИРУЕМ ОПЕРАЦИЮ
  await this.auditService.logMachineOperation({
    machineId: assignment.machineId,
    palletId: assignment.palletId,
    partId: assignment.pallet.part.partId,
    routeStageId: 1, // Получить из контекста
    quantityProcessed: assignment.pallet.quantity,
    startedAt: assignment.assignedAt,
    completedAt,
    operatorId,
  });

  // ✅ ОБНОВЛЯЕМ СТАТИСТИКУ ОПЕРАТОРА
  if (operatorId) {
    const duration = Math.floor(
      (completedAt.getTime() - assignment.assignedAt.getTime()) / 60000,
    ); // минуты

    await this.auditService.updateOperatorPerformance(
      operatorId,
      assignment.machineId,
      Number(assignment.pallet.quantity),
      0, // defectQuantity
      duration,
    );
  }
}
```

## 4. Пример логирования изменения статуса станка

```typescript
async updateMachineStatus(
  machineId: number,
  newStatus: MachineStatus,
  userId?: number,
  reason?: string,
): Promise<void> {
  const machine = await this.prisma.machine.findUnique({
    where: { machineId },
  });

  if (!machine) {
    throw new NotFoundException('Станок не найден');
  }

  const oldStatus = machine.status;

  await this.prisma.machine.update({
    where: { machineId },
    data: { status: newStatus },
  });

  // ✅ ЛОГИРУЕМ ИЗМЕНЕНИЕ СТАТУСА
  await this.auditService.logMachineStatusChange(
    machineId,
    oldStatus,
    newStatus,
    userId,
    reason,
  );
}
```

## 5. Пример логирования перемещения поддона

```typescript
async movePalletToMachine(
  palletId: number,
  fromCellId: number,
  machineId: number,
  userId?: number,
): Promise<void> {
  const pallet = await this.prisma.pallet.findUnique({
    where: { palletId },
  });

  if (!pallet) {
    throw new NotFoundException('Поддон не найден');
  }

  // Выполняем перемещение...

  // ✅ ЛОГИРУЕМ ПЕРЕМЕЩЕНИЕ
  await this.auditService.logPalletMovement({
    palletId,
    fromCellId,
    machineId,
    movementType: 'TO_MACHINE',
    quantity: pallet.quantity,
    movedBy: userId,
  });
}
```

## 6. Пример логирования изменения статуса заказа

```typescript
async updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  userId?: number,
  reason?: string,
): Promise<void> {
  const order = await this.prisma.order.findUnique({
    where: { orderId },
  });

  if (!order) {
    throw new NotFoundException('Заказ не найден');
  }

  const oldStatus = order.status;

  await this.prisma.order.update({
    where: { orderId },
    data: { status: newStatus },
  });

  // ✅ ЛОГИРУЕМ ИЗМЕНЕНИЕ СТАТУСА
  await this.auditService.logOrderStatusChange(
    orderId,
    oldStatus,
    newStatus,
    userId,
    reason,
  );
}
```

## 7. Пример логирования брака

```typescript
async reportDefect(
  machineId: number,
  partId: number,
  defectType: string,
  quantity: number,
  routeStageId?: number,
): Promise<void> {
  // Создаем рекламацию...

  // ✅ ЛОГИРУЕМ БРАК
  await this.auditService.logDefect(
    machineId,
    partId,
    defectType,
    quantity,
    routeStageId,
  );
}
```

## 8. Получение userId из контекста запроса

Создайте декоратор для получения текущего пользователя:

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Предполагается, что user установлен в JWT guard
  },
);
```

Использование в контроллере:

```typescript
@Post('machine/:machineId/reset-counter')
async resetMachineCounter(
  @Param('machineId', ParseIntPipe) machineId: number,
  @CurrentUser() user: any, // Получаем текущего пользователя
): Promise<{ message: string }> {
  return this.machinService.resetMachineCounter(machineId, user?.userId);
}
```

## Итого

После интеграции у вас будет:
- ✅ Полная история всех изменений
- ✅ Отслеживание действий пользователей
- ✅ Статистика производительности
- ✅ Статистика брака
- ✅ Аналитика по станкам и операторам
