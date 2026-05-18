# API фильтров для учёта выпуска продукции по станкам

## Эндпоинт
`GET /statistics/machine-production`

## Описание
Получение данных учёта выпуска продукции по рабочим местам (станкам) с поддержкой гибких фильтров.

## Параметры запроса

Все параметры опциональны и могут комбинироваться:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `startDate` | string (ISO date) | Начало периода (например, `2024-01-01`) |
| `endDate` | string (ISO date) | Конец периода (например, `2024-01-31`) |
| `machineId` | number | ID конкретного станка |
| `stageId` | number | ID этапа производства |
| `orderId` | number | ID заказа |

## Примеры запросов

### 1. Только период
Получить все операции за январь 2024:
```
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31
```

### 2. Период + станок
Получить операции конкретного станка за период:
```
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31&machineId=45
```

### 3. Все фильтры
Получить операции конкретного станка, этапа и заказа за период:
```
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31&orderId=10&machineId=45&stageId=3
```

### 4. Только заказ
Получить все операции по конкретному заказу:
```
GET /statistics/machine-production?orderId=10
```

### 5. Станок + этап
Получить операции конкретного станка на определённом этапе:
```
GET /statistics/machine-production?machineId=45&stageId=3
```

### 6. Период + этап
Получить все операции на этапе за период:
```
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31&stageId=3
```

### 7. Период + заказ
Получить операции по заказу за период:
```
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31&orderId=10
```

## Логика фильтрации

### Фильтр по этапу (`stageId`)
- Для обычных станков: фильтрация выполняется на уровне базы данных через `MachineOperationHistory.routeStage.stageId`
- Для финальных станков (упаковка): фильтрация выполняется на уровне приложения после получения данных из `PackingTask`

### Фильтр по заказу (`orderId`)
- Фильтрация выполняется на уровне приложения
- Проверяется наличие заказа в массиве `packages` каждой операции
- Операция включается в результат, если хотя бы одна упаковка относится к указанному заказу

### Фильтр по станку (`machineId`)
- Фильтрация выполняется на уровне базы данных
- Автоматически определяется тип станка (обычный или финальный)
- Для финальных станков данные берутся из `PackingTask`
- Для обычных станков данные берутся из `MachineOperationHistory`

### Фильтр по периоду (`startDate`, `endDate`)
- Фильтрация выполняется на уровне базы данных
- Для обычных станков используется поле `completedAt`
- Для финальных станков используется поле `completedAt` (если есть) или `assignedAt`
- Время окончания периода автоматически устанавливается на 23:59:59.999

## Формат ответа

```typescript
interface MachineProductionRecord {
  operationId: number;
  machineId: number;
  machineName: string;
  machineLoadUnit: string;
  partId: number;
  partCode: string;
  partName: string;
  partSize: string;
  materialId: number | null;
  materialName: string | null;
  materialSku: string | null;
  palletId: number;
  palletName: string;
  routeStageId: number;
  stageId: number;
  stageName: string;
  quantityProcessed: number;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  operatorId: number | null;
  operatorName: string | null;
  packages: Array<{
    packageId: number;
    packageCode: string;
    packageName: string;
    orderId: number;
    orderBatchNumber: string;
    orderName: string;
  }>;
}
```

## Примечания

1. **Комбинирование фильтров**: Все фильтры можно комбинировать в любых сочетаниях
2. **Производительность**: Фильтры по `machineId`, `stageId` и периоду применяются на уровне БД для оптимальной производительности
3. **Фильтр по заказу**: Применяется на уровне приложения, так как связь с заказами реализована через массив упаковок
4. **Сортировка**: Результаты всегда сортируются по дате завершения операции (от новых к старым)
5. **Пустой результат**: Если ни одна операция не соответствует фильтрам, возвращается пустой массив `[]`

## Примеры использования в клиентском коде

### JavaScript/TypeScript
```typescript
const queryParams = new URLSearchParams();
if (params.startDate) queryParams.append('startDate', params.startDate);
if (params.endDate) queryParams.append('endDate', params.endDate);
if (params.machineId) queryParams.append('machineId', params.machineId.toString());
if (params.stageId) queryParams.append('stageId', params.stageId.toString());
if (params.orderId) queryParams.append('orderId', params.orderId.toString());

const response = await fetch(`/statistics/machine-production?${queryParams}`);
const data = await response.json();
```

### Axios
```typescript
const response = await axios.get('/statistics/machine-production', {
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    machineId: 45,
    stageId: 3,
    orderId: 10
  }
});
```
