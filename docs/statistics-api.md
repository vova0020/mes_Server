# API статистики — документация для фронтенда

Базовый URL: `/statistics`

---

## 1. Учёт выпуска продукции по рабочим местам

### `GET /statistics/machine-production`

Возвращает детальный журнал всех завершённых операций на станках.  
Каждая запись — одна операция обработки поддона на станке.

**Query-параметры:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `startDate` | `string` (ISO дата, `YYYY-MM-DD`) | Нет | Начало периода |
| `endDate` | `string` (ISO дата, `YYYY-MM-DD`) | Нет | Конец периода (включительно, до 23:59:59) |
| `machineId` | `number` | Нет | Фильтр по конкретному станку. Если не указан — данные по всем станкам |

**Примеры запросов:**

```
GET /statistics/machine-production
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31
GET /statistics/machine-production?machineId=3
GET /statistics/machine-production?startDate=2024-01-01&endDate=2024-01-31&machineId=3
```

**Пример ответа:**
```json
[
  {
    "operationId": 101,
    "machineId": 1,
    "machineName": "Станок раскроя №1",
    "machineLoadUnit": "м²",
    "partId": 55,
    "partCode": "P-001",
    "partName": "Боковая стенка",
    "partSize": "600x400",
    "materialId": 3,
    "materialName": "ДСП 16мм Белый",
    "materialSku": "DSP-16-W",
    "palletId": 12,
    "palletName": "Поддон-012",
    "routeStageId": 7,
    "stageId": 2,
    "stageName": "Раскрой",
    "quantityProcessed": 48,
    "startedAt": "2024-01-15T08:30:00.000Z",
    "completedAt": "2024-01-15T09:15:00.000Z",
    "durationSeconds": 2700,
    "operatorId": 5,
    "operatorName": "Иван Петров",
    "packages": [
      {
        "packageId": 10,
        "packageCode": "PKG-010",
        "packageName": "Шкаф купе 2-дверный",
        "orderId": 3,
        "orderBatchNumber": "B-2024-001",
        "orderName": "Заказ мебели для офиса"
      }
    ]
  }
]
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `operationId` | `number` | Уникальный ID операции |
| `machineId` | `number` | ID станка |
| `machineName` | `string` | Название станка |
| `machineLoadUnit` | `string` | Единица измерения станка (шт, м², м³, м, м кромки) |
| `partId` | `number` | ID детали |
| `partCode` | `string` | Код детали |
| `partName` | `string` | Название детали |
| `partSize` | `string` | Размер детали |
| `materialId` | `number \| null` | ID материала |
| `materialName` | `string \| null` | Название материала |
| `materialSku` | `string \| null` | Артикул материала |
| `palletId` | `number` | ID поддона |
| `palletName` | `string` | Название поддона |
| `routeStageId` | `number` | ID этапа маршрута |
| `stageId` | `number` | ID этапа производства (уровень 1) |
| `stageName` | `string` | Название этапа производства |
| `quantityProcessed` | `number` | Количество обработанных деталей |
| `startedAt` | `string` (ISO datetime) | Время начала операции |
| `completedAt` | `string` (ISO datetime) | Время завершения операции |
| `durationSeconds` | `number` | Длительность операции в секундах |
| `operatorId` | `number \| null` | ID оператора |
| `operatorName` | `string \| null` | ФИО оператора |
| `packages` | `array` | Упаковки и заказы, к которым относится деталь |
| `packages[].packageId` | `number` | ID упаковки |
| `packages[].packageCode` | `string` | Код упаковки |
| `packages[].packageName` | `string` | Название упаковки |
| `packages[].orderId` | `number` | ID заказа |
| `packages[].orderBatchNumber` | `string` | Номер партии заказа |
| `packages[].orderName` | `string` | Название заказа |

---

## 2. Данные для фильтров (отбраковка и учёт выпуска)

### `GET /statistics/filter-options`

Возвращает все справочные данные для заполнения фильтров.  
Включает список станков — используйте его для фильтра «Рабочее место» на странице учёта выпуска.  
Рекомендуется вызывать один раз при загрузке страницы.

**Query-параметры:** нет

**Пример ответа:**
```json
{
  "orders": [
    { "orderId": 3, "batchNumber": "B-2024-001", "orderName": "Заказ мебели для офиса" }
  ],
  "materials": [
    { "materialId": 3, "materialName": "ДСП 16мм Белый", "article": "DSP-16-W" }
  ],
  "machines": [
    { "machineId": 1, "machineName": "Станок раскроя №1" }
  ],
  "stages": [
    { "stageId": 2, "stageName": "Раскрой" }
  ]
}
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `orders` | `array` | Список заказов (сортировка: новые первые) |
| `orders[].orderId` | `number` | ID заказа |
| `orders[].batchNumber` | `string` | Номер партии |
| `orders[].orderName` | `string` | Название заказа |
| `materials` | `array` | Список материалов (сортировка: по алфавиту) |
| `materials[].materialId` | `number` | ID материала |
| `materials[].materialName` | `string` | Название материала |
| `materials[].article` | `string` | Артикул материала |
| `machines` | `array` | Список станков (сортировка: по алфавиту) |
| `machines[].machineId` | `number` | ID станка |
| `machines[].machineName` | `string` | Название станка |
| `stages` | `array` | Список этапов производства (сортировка: по алфавиту) |
| `stages[].stageId` | `number` | ID этапа |
| `stages[].stageName` | `string` | Название этапа |

---

## 3. Статистика отбракованных деталей

### `GET /statistics/defects`

Возвращает детальный список рекламаций (отбракованных деталей) с фильтрами.

**Query-параметры:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `startDate` | `string` (ISO дата) | Нет | Начало периода |
| `endDate` | `string` (ISO дата) | Нет | Конец периода |
| `orderId` | `number` | Нет | Фильтр по заказу |
| `materialId` | `number` | Нет | Фильтр по материалу |
| `stageId` | `number` | Нет | Фильтр по этапу производства |
| `workerId` | `number` | Нет | Фильтр по работнику |
| `color` | `string` | Нет | Фильтр по цвету (поиск в названии материала) |

---

## Сводная таблица эндпоинтов

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/statistics/filter-options` | Данные для всех фильтров (заказы, материалы, **станки**, этапы) |
| `GET` | `/statistics/machine-production` | Учёт выпуска продукции по рабочим местам |
| `GET` | `/statistics/defects` | Статистика отбракованных деталей |
| `GET` | `/statistics/production-lines` | Список производственных линий |
| `GET` | `/statistics/production-line` | Статистика по линии (по этапам) |
| `GET` | `/statistics/stage` | Статистика по этапу (по станкам) |

---

## Типичный сценарий использования — страница «Учёт выпуска»

```typescript
// 1. При загрузке страницы — получаем данные для фильтров (включая список станков)
const filterOptions = await fetch('/statistics/filter-options').then(r => r.json());
// filterOptions.machines → для выпадающего списка "Рабочее место"

// 2. По умолчанию — загружаем данные за текущий месяц по всем станкам
const today = new Date();
const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString().split('T')[0]; // "2024-01-01"
const endDate = today.toISOString().split('T')[0]; // "2024-01-31"

const production = await fetch(
  `/statistics/machine-production?startDate=${startDate}&endDate=${endDate}`
).then(r => r.json());

// 3. При выборе конкретного станка — перезапрашиваем с фильтром
const filtered = await fetch(
  `/statistics/machine-production?startDate=${startDate}&endDate=${endDate}&machineId=3`
).then(r => r.json());
```

---

## Типичный сценарий использования — страница «Отбраковка»

```typescript
// 1. При загрузке страницы — получаем все данные для фильтров одним запросом
const filterOptions = await fetch('/statistics/filter-options').then(r => r.json());
// filterOptions.orders    → для выпадающего списка "Заказ"
// filterOptions.materials → для выпадающего списка "Материал"
// filterOptions.machines  → для выпадающего списка "Станок"
// filterOptions.stages    → для выпадающего списка "Этап"

// 2. Загружаем статистику брака с фильтрами
const defects = await fetch(
  '/statistics/defects?startDate=2024-01-01&endDate=2024-01-31&stageId=2'
).then(r => r.json());
```
