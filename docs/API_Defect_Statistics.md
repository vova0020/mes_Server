# API Документация: Статистика по отбракованным деталям

## Эндпоинт: GET /statistics/defects

Получение детальной информации по всем отбракованным деталям с возможностью фильтрации.

---

## URL
```
GET /statistics/defects
```

---

## Параметры запроса (Query Parameters)

Все параметры являются **опциональными**:

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|--------|
| `startDate` | string (ISO 8601) | Период с | `2024-01-01` |
| `endDate` | string (ISO 8601) | Период по (включительно, до 23:59:59) | `2024-12-31` |
| `orderId` | number | ID заказа | `123` |
| `materialId` | number | ID материала | `45` |
| `color` | string | Поиск по подстроке в названии материала (регистронезависимо) | `белый` |
| `workerId` | number | ID работника, обнаружившего брак | `7` |
| `stageId` | number | ID этапа производства (ProductionStageLevel1) | `5` |

---

## Примеры запросов

```http
GET /statistics/defects
GET /statistics/defects?startDate=2024-01-01&endDate=2024-12-31
GET /statistics/defects?orderId=123
GET /statistics/defects?materialId=45&workerId=7
GET /statistics/defects?stageId=5&startDate=2024-06-01&endDate=2024-06-30
GET /statistics/defects?orderId=123&stageId=5&startDate=2024-01-01&endDate=2024-12-31
```

---

## Структура ответа

Возвращается массив объектов `DefectDetail[]`.

```typescript
// Одно событие возврата детали в производство.
// Каждая запись = один вызов POST /master/return-parts.
interface DefectReturnEvent {
  movementId: number;              // ID записи в inventory_movements
  returnedAt: string;              // ISO дата/время возврата
  returnedQuantity: number;        // Количество возвращённых деталей

  // Этап маршрута (RouteStage.routeStageId) куда вернули
  returnToRouteStageId: number;
  // Название этапа производства (ProductionStageLevel1.stageName)
  returnToStageName: string | null;

  // Станок куда вернули (опционально)
  returnToMachineId: number | null;
  returnToMachineName: string | null;

  // Поддон на который вернули
  returnPalletId: number | null;
  returnPalletName: string | null;

  // Кто выполнил возврат (userId)
  returnedByUserId: number | null;
}

// Одна упаковка/заказ к которому привязана деталь
interface DefectPackageInfo {
  packageId: number;
  packageCode: string;             // Код упаковки
  packageName: string;             // Название упаковки
  orderId: number;
  orderBatchNumber: string;        // Номер производственной партии
  orderName: string;               // Название заказа
}

interface DefectDetail {
  // === Основная информация о рекламации ===
  reclamationId: number;           // ID рекламации
  partId: number;                  // ID детали
  partCode: string;                // Код детали
  partName: string;                // Название детали
  defectQuantity: number;          // Количество отбракованных деталей по данной рекламации
  totalReturnedQuantity: number;   // Суммарное количество возвращённых деталей (все события)
  defectTypes: string[];           // Типы брака (из справочника DefectType)
  detectedAt: string;              // ISO дата/время обнаружения брака
  processedAt: string | null;      // ISO дата/время обработки рекламации
  status: string;                  // Статус: "NEW" | "CONFIRMED" | "RESOLVED"
  qualityAction: string | null;    // Действие по качеству
  note: string | null;             // Примечание

  // === Место обнаружения брака ===
  stageId: number;                 // ID этапа производства (ProductionStageLevel1)
  stageName: string;               // Название этапа производства
  machineId: number | null;        // ID станка где обнаружен брак
  machineName: string | null;      // Название станка
  palletId: number | null;         // ID поддона с которого отбраковали
  palletName: string | null;       // Название поддона

  // === Все упаковки и заказы к которым привязана деталь ===
  // Может быть несколько если деталь входит в несколько упаковок.
  // Пустой массив [] если деталь не привязана ни к одной упаковке.
  packages: DefectPackageInfo[];

  // === Материал ===
  materialId: number | null;       // ID материала
  materialName: string | null;     // Название материала
  materialSku: string | null;      // Артикул материала

  // === Работники ===
  reportedById: number | null;     // ID работника, обнаружившего брак
  reportedByName: string | null;   // ФИО (firstName + lastName)
  confirmedById: number | null;    // ID работника, подтвердившего брак
  confirmedByName: string | null;  // ФИО

  // === Все события возврата детали в производство ===
  // Пустой массив [] если деталь ещё не возвращали.
  // Отсортированы по дате возврата (от старых к новым).
  // ВАЖНО: возвраты привязаны к детали (partId), а не к конкретной рекламации.
  returnEvents: DefectReturnEvent[];
}
```

---

## Пример ответа

```json
[
  {
    "reclamationId": 42,
    "partId": 156,
    "partCode": "DET-001",
    "partName": "Столешница 1200x600",
    "defectQuantity": 5,
    "totalReturnedQuantity": 3,
    "defectTypes": ["Царапина", "Скол кромки"],
    "detectedAt": "2024-06-15T10:30:00.000Z",
    "processedAt": "2024-06-15T14:20:00.000Z",
    "status": "RESOLVED",
    "qualityAction": "RETURN_TO_PRODUCTION",
    "note": "Обнаружены дефекты при упаковке",
    "stageId": 5,
    "stageName": "Кромкование",
    "machineId": 12,
    "machineName": "Кромкооблицовочный станок КС-01",
    "palletId": 234,
    "palletName": "PAL-234",
    "packages": [
      {
        "packageId": 456,
        "packageCode": "PKG-001",
        "packageName": "Упаковка №1",
        "orderId": 89,
        "orderBatchNumber": "BATCH-2024-001",
        "orderName": "Заказ №1234 - Кухня Модерн"
      },
      {
        "packageId": 460,
        "packageCode": "PKG-005",
        "packageName": "Упаковка №5",
        "orderId": 89,
        "orderBatchNumber": "BATCH-2024-001",
        "orderName": "Заказ №1234 - Кухня Модерн"
      }
    ],
    "materialId": 23,
    "materialName": "ЛДСП Белый глянец 16мм",
    "materialSku": "LDSP-WHT-16",
    "reportedById": 7,
    "reportedByName": "Иванов Иван",
    "confirmedById": 3,
    "confirmedByName": "Петров Петр",
    "returnEvents": [
      {
        "movementId": 101,
        "returnedAt": "2024-06-15T15:00:00.000Z",
        "returnedQuantity": 2,
        "returnToRouteStageId": 18,
        "returnToStageName": "Кромкование",
        "returnToMachineId": null,
        "returnToMachineName": null,
        "returnPalletId": 235,
        "returnPalletName": "PAL-235",
        "returnedByUserId": 3
      },
      {
        "movementId": 115,
        "returnedAt": "2024-06-16T09:00:00.000Z",
        "returnedQuantity": 1,
        "returnToRouteStageId": 18,
        "returnToStageName": "Кромкование",
        "returnToMachineId": 12,
        "returnToMachineName": "Кромкооблицовочный станок КС-01",
        "returnPalletId": 240,
        "returnPalletName": "PAL-240",
        "returnedByUserId": 3
      }
    ]
  },
  {
    "reclamationId": 43,
    "partId": 157,
    "partCode": "DET-002",
    "partName": "Боковина шкафа 800x400",
    "defectQuantity": 2,
    "totalReturnedQuantity": 0,
    "defectTypes": ["Неправильный размер"],
    "detectedAt": "2024-06-16T09:15:00.000Z",
    "processedAt": null,
    "status": "NEW",
    "qualityAction": null,
    "note": null,
    "stageId": 3,
    "stageName": "Раскрой",
    "machineId": 8,
    "machineName": "Форматно-раскроечный станок ФР-02",
    "palletId": 236,
    "palletName": "PAL-236",
    "packages": [
      {
        "packageId": 457,
        "packageCode": "PKG-002",
        "packageName": "Упаковка №2",
        "orderId": 90,
        "orderBatchNumber": "BATCH-2024-002",
        "orderName": "Заказ №1235 - Шкаф-купе"
      }
    ],
    "materialId": 24,
    "materialName": "ЛДСП Дуб сонома 18мм",
    "materialSku": "LDSP-OAK-18",
    "reportedById": 8,
    "reportedByName": "Сидоров Сидор",
    "confirmedById": null,
    "confirmedByName": null,
    "returnEvents": []
  }
]
```

---

## Коды ответов

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос, массив `DefectDetail[]` (может быть пустым `[]`) |
| 400 | Неверные параметры запроса |
| 500 | Внутренняя ошибка сервера |

---

## Важные примечания

### Логика возврата деталей

При вызове `POST /master/return-parts` в таблице `inventory_movements` создаётся запись:
- `reason = 'RETURN_FROM_RECLAMATION'`
- `deltaQuantity > 0` (положительное = возврат)
- `returnToStageId` = `RouteStage.routeStageId`
- `palletId` = поддон куда вернули детали

**`sourceReclamationId` при возврате не заполняется**, поэтому возвраты привязаны к детали (`partId`), а не к конкретной рекламации.

### Поле `packages`

Массив всех упаковок и заказов, к которым привязана деталь через таблицу `production_package_parts`. Если деталь входит в несколько упаковок — все они будут в массиве. Пустой массив если деталь не привязана ни к одной упаковке.

### Поле `totalReturnedQuantity`

Сумма `returnedQuantity` по всем событиям `returnEvents`. Позволяет сравнить сколько отбраковали (`defectQuantity`) и сколько уже вернули.

### Сортировка

- Рекламации: от новых к старым (по `detectedAt`)
- `returnEvents`: от старых к новым (по `returnedAt`)

---

## TypeScript-интерфейсы для фронтенда

```typescript
interface DefectReturnEvent {
  movementId: number;
  returnedAt: string;
  returnedQuantity: number;
  returnToRouteStageId: number;
  returnToStageName: string | null;
  returnToMachineId: number | null;
  returnToMachineName: string | null;
  returnPalletId: number | null;
  returnPalletName: string | null;
  returnedByUserId: number | null;
}

interface DefectPackageInfo {
  packageId: number;
  packageCode: string;
  packageName: string;
  orderId: number;
  orderBatchNumber: string;
  orderName: string;
}

interface DefectDetail {
  reclamationId: number;
  partId: number;
  partCode: string;
  partName: string;
  defectQuantity: number;
  totalReturnedQuantity: number;
  defectTypes: string[];
  detectedAt: string;
  processedAt: string | null;
  status: string;
  qualityAction: string | null;
  note: string | null;
  stageId: number;
  stageName: string;
  machineId: number | null;
  machineName: string | null;
  palletId: number | null;
  palletName: string | null;
  packages: DefectPackageInfo[];
  materialId: number | null;
  materialName: string | null;
  materialSku: string | null;
  reportedById: number | null;
  reportedByName: string | null;
  confirmedById: number | null;
  confirmedByName: string | null;
  returnEvents: DefectReturnEvent[];
}

interface DefectFilters {
  startDate?: string;   // 'YYYY-MM-DD'
  endDate?: string;     // 'YYYY-MM-DD'
  orderId?: number;
  materialId?: number;
  color?: string;
  workerId?: number;
  stageId?: number;
}

async function getDefectStatistics(filters: DefectFilters): Promise<DefectDetail[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await fetch(`/statistics/defects?${params.toString()}`);
  if (!response.ok) throw new Error('Ошибка при получении статистики по браку');
  return response.json() as Promise<DefectDetail[]>;
}

// Пример использования
const defects = await getDefectStatistics({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

const totalDefects = defects.reduce((s, d) => s + d.defectQuantity, 0);
const totalReturned = defects.reduce((s, d) => s + d.totalReturnedQuantity, 0);
const notReturned = defects.filter(d => d.returnEvents.length === 0);

console.log(`Всего отбраковано: ${totalDefects} шт.`);
console.log(`Возвращено в производство: ${totalReturned} шт.`);
console.log(`Рекламаций без возврата: ${notReturned.length}`);
```
