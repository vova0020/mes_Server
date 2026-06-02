# API для получения деталей индивидуального производства

## Содержание
1. [Получение деталей заказа](#получение-деталей-заказа)
2. [Получение деталей поддона](#получение-деталей-поддона)

---

## Получение деталей заказа

## Получение деталей заказа с фильтрацией по этапу

### Эндпоинт
```
GET /custom-orders/:orderId/details
```

### Описание
Получает список деталей для указанного заказа индивидуального производства. Поддерживает опциональную фильтрацию по этапу производства.

### Параметры

#### Path параметры
- `orderId` (number, обязательный) - ID заказа индивидуального производства

#### Query параметры
- `stageId` (number, опциональный) - ID этапа производства для фильтрации деталей

### Логика фильтрации

Если параметр `stageId` **не указан**:
- Возвращаются **все детали** заказа

Если параметр `stageId` **указан**:
- Возвращаются **только те детали**, в маршруте которых присутствует указанный этап
- Детали, в маршруте которых нет этого этапа, будут исключены из результата

### Примеры запросов

#### Получить все детали заказа
```http
GET /custom-orders/123/details
```

#### Получить детали для конкретного этапа (например, распиловка)
```http
GET /custom-orders/123/details?stageId=5
```

### Пример ответа

```json
{
  "orderId": 123,
  "orderNumber": "ИП-2024-001",
  "orderName": "Заказ на кухню",
  "totalParts": 15,
  "parts": [
    {
      "customPartId": 456,
      "customOrderId": 123,
      "partCode": "КУХ-001",
      "partName": "Столешница",
      "materialName": "ЛДСП Egger",
      "materialSku": "U999 ST9",
      "thickness": 18,
      "thicknessWithEdging": 18,
      "quantity": 2,
      "distributedQuantity": 2,
      "undistributedQuantity": 0,
      "blankLength": 3050,
      "blankWidth": 600,
      "finishedLength": 3000,
      "finishedWidth": 600,
      "groove": null,
      "edgingSkuL1": "ABS 2mm",
      "edgingNameL1": "Кромка белая",
      "edgingSkuL2": "ABS 2mm",
      "edgingNameL2": "Кромка белая",
      "edgingSkuW1": null,
      "edgingNameW1": null,
      "edgingSkuW2": null,
      "edgingNameW2": null,
      "plasticFace": null,
      "plasticFaceSku": null,
      "plasticBack": null,
      "plasticBackSku": null,
      "additionalMaterial": null,
      "pf": false,
      "pfSku": null,
      "sbPart": false,
      "pfSb": false,
      "sbPartSku": null,
      "conveyorPosition": "A1",
      "routeId": 10,
      "status": "PENDING",
      "route": {
        "routeId": 10,
        "routeName": "Стандартный маршрут ЛДСП",
        "routeStages": [
          {
            "routeStageId": 100,
            "sequenceNumber": 1,
            "stage": {
              "stageId": 5,
              "stageName": "Распиловка"
            },
            "substage": null
          },
          {
            "routeStageId": 101,
            "sequenceNumber": 2,
            "stage": {
              "stageId": 6,
              "stageName": "Кромкование"
            },
            "substage": null
          }
        ]
      },
      "pallets": [
        {
          "customPalletId": 789,
          "palletName": "Поддон-001",
          "isActive": true,
          "quantityOnPallet": 2
        }
      ]
    }
  ]
}
```

### Коды ответов

- `200 OK` - Успешное получение деталей
- `404 Not Found` - Заказ с указанным ID не найден

### Примечания

1. **Фильтрация по этапу** проверяет наличие этапа в маршруте детали через таблицу `route_stages`
2. Если для указанного `stageId` не найдено ни одной детали, вернется пустой массив `parts: []`
3. Поле `totalParts` показывает количество деталей **после фильтрации**
4. Информация о маршруте включает **все этапы** детали, даже если применена фильтрация по конкретному этапу

### Использование на фронтенде

```typescript
// Получить все детали заказа
const allDetails = await fetch(`/custom-orders/${orderId}/details`);

// Получить детали только для этапа "Распиловка" (stageId = 5)
const sawingDetails = await fetch(`/custom-orders/${orderId}/details?stageId=5`);

// Получить детали только для этапа "Кромкование" (stageId = 6)
const edgingDetails = await fetch(`/custom-orders/${orderId}/details?stageId=6`);
```

### Связь с другими API

Этот эндпоинт используется совместно с:
- `GET /custom/machines/:machineId/assignments` - для получения заданий на станке
- `POST /custom/machines/assignments` - для создания задания на станок (требует `stageId`)
- `GET /settings/stages` - для получения списка доступных этапов производства

---

## Получение деталей поддона

### Эндпоинт
```
GET /custom-pallets/:id/parts
```

### Описание
Получает список деталей для указанного поддона индивидуального производства. Поддерживает опциональную фильтрацию по этапу производства.

### Параметры

#### Path параметры
- `id` (number, обязательный) - ID поддона индивидуального производства

#### Query параметры
- `stageId` (number, опциональный) - ID этапа производства для фильтрации деталей

### Логика фильтрации

Если параметр `stageId` **не указан**:
- Возвращаются **все детали** поддона

Если параметр `stageId` **указан**:
- Возвращаются **только те детали**, в маршруте которых присутствует указанный этап
- Детали, в маршруте которых нет этого этапа, будут исключены из результата
- Для каждой детали добавляются поля `stageStatus`, `stageCompletedQuantity` и `stageReadyQuantity`

### Примеры запросов

#### Получить все детали поддона
```http
GET /custom-pallets/789/parts
```

#### Получить детали для конкретного этапа (например, кромкование)
```http
GET /custom-pallets/789/parts?stageId=6
```

### Пример ответа (с фильтрацией по этапу)

```json
{
  "customPalletId": 789,
  "palletName": "Поддон-001",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "totalParts": 3,
  "stageId": 6,
  "parts": [
    {
      "customPartId": 456,
      "customOrderId": 123,
      "partCode": "КУХ-001",
      "partName": "Столешница",
      "materialName": "ЛДСП Egger",
      "materialSku": "U999 ST9",
      "thickness": 18,
      "thicknessWithEdging": 18,
      "totalQuantity": 5,
      "quantityOnPallet": 2,
      "blankLength": 3050,
      "blankWidth": 600,
      "finishedLength": 3000,
      "finishedWidth": 600,
      "groove": null,
      "edgingSkuL1": "ABS 2mm",
      "edgingNameL1": "Кромка белая",
      "edgingSkuL2": "ABS 2mm",
      "edgingNameL2": "Кромка белая",
      "edgingSkuW1": null,
      "edgingNameW1": null,
      "edgingSkuW2": null,
      "edgingNameW2": null,
      "plasticFace": null,
      "plasticFaceSku": null,
      "plasticBack": null,
      "plasticBackSku": null,
      "additionalMaterial": null,
      "pf": false,
      "pfSku": null,
      "sbPart": false,
      "pfSb": false,
      "sbPartSku": null,
      "conveyorPosition": "A1",
      "routeId": 10,
      "status": "PENDING",
      "stageStatus": "PENDING",
      "stageCompletedQuantity": 0,
      "stageReadyQuantity": 2,
      "route": {
        "routeId": 10,
        "routeName": "Стандартный маршрут ЛДСП",
        "routeStages": [
          {
            "routeStageId": 100,
            "sequenceNumber": 1,
            "stage": {
              "stageId": 5,
              "stageName": "Распиловка"
            },
            "substage": null
          },
          {
            "routeStageId": 101,
            "sequenceNumber": 2,
            "stage": {
              "stageId": 6,
              "stageName": "Кромкование"
            },
            "substage": null
          }
        ]
      }
    }
  ]
}
```

### Дополнительные поля при указании stageId

Когда указан `stageId`, для каждой детали добавляются следующие поля:

- `stageStatus` (string) - Статус детали на указанном этапе:
  - `"NOT_PROCESSED"` - Деталь еще не готова к обработке на этом этапе
  - `"PENDING"` - Деталь готова к обработке
  - `"IN_PROGRESS"` - Деталь в процессе обработки
  - `"COMPLETED"` - Обработка детали на этом этапе завершена

- `stageCompletedQuantity` (number) - Количество деталей, завершивших обработку на этом этапе

- `stageReadyQuantity` (number) - Количество деталей, готовых к обработке на этом этапе

### Коды ответов

- `200 OK` - Успешное получение деталей
- `404 Not Found` - Поддон с указанным ID не найден

### Примечания

1. **Фильтрация по этапу** проверяет наличие этапа в маршруте детали через таблицу `route_stages`
2. Если для указанного `stageId` не найдено ни одной детали, вернется пустой массив `parts: []`
3. Поле `totalParts` показывает количество деталей **после фильтрации**
4. Информация о маршруте включает **все этапы** детали, даже если применена фильтрация по конкретному этапу
5. Статусы `stageStatus`, `stageCompletedQuantity` и `stageReadyQuantity` рассчитываются на основе прогресса обработки (`custom_pallet_part_stage_progress`)

### Использование на фронтенде

```typescript
// Получить все детали поддона
const allParts = await fetch(`/custom-pallets/${palletId}/parts`);

// Получить детали только для этапа "Распиловка" (stageId = 5)
const sawingParts = await fetch(`/custom-pallets/${palletId}/parts?stageId=5`);

// Получить детали только для этапа "Кромкование" (stageId = 6)
const edgingParts = await fetch(`/custom-pallets/${palletId}/parts?stageId=6`);
```

### Связь с другими API

Этот эндпоинт используется совместно с:
- `GET /custom-orders/:orderId/pallets` - для получения списка поддонов заказа
- `GET /custom/machines/:machineId/assignments` - для получения заданий на станке
- `POST /custom/machines/assignments` - для создания задания на станок (требует `stageId`)
