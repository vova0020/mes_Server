# API для фронтенда - Статистика заказов

## Базовый URL
```
http://localhost:3000
```

## Эндпоинты

### 1. Получить все заказы
**GET** `/order-statistics`

**Параметры:** Нет

**Ответ:**
```json
[
  {
    "orderId": 1,
    "batchNumber": "BATCH-2024-001",
    "orderName": "Заказ на производство мебели",
    "status": "IN_PROGRESS",
    "completionPercentage": 45.5,
    "productionProgress": 60,
    "packingProgress": 25,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "requiredDate": "2024-12-31T23:59:59.000Z"
  }
]
```

### 2. Получить детальную статистику заказа
**GET** `/order-statistics/:id`

**Параметры:**
- `id` (number) - ID заказа

**Пример запроса:**
```
GET /order-statistics/1
```

**Ответ:**
```json
{
  "orderId": 1,
  "batchNumber": "BATCH-2024-001",
  "orderName": "Заказ на производство мебели",
  "status": "IN_PROGRESS",
  "completionPercentage": 45.5,
  "packages": [
    {
      "packageId": 1,
      "packageCode": "PKG-001",
      "packageName": "Упаковка 1",
      "quantity": 10,
      "partCount": 5
    }
  ],
  "parts": [ 
    {
      "partId": 1,
      "partCode": "PART-001",
      "partName": "Деталь 1",
      "totalQuantity": 100,
      "packages": ["Упаковка 1", "Упаковка 2"],
      "stages": [
        {
          "routeStageId": 1,
          "stageName": "Распил",
          "sequenceNumber": 1,
          "completionPercentage": 100
        },
        {
          "routeStageId": 2,
          "stageName": "Сверление",
          "sequenceNumber": 2,
          "completionPercentage": 50
        }
      ],
      "pallets": [
        {
          "palletId": 1,
          "palletName": "Поддон-001",
          "quantity": 50,
          "stages": [
            {
              "routeStageId": 1,
              "stageName": "Распил",
              "sequenceNumber": 1,
              "status": "COMPLETED"
            },
            {
              "routeStageId": 2,
              "stageName": "Сверление",
              "sequenceNumber": 2,
              "status": "IN_PROGRESS"
            }
          ]
        },
        {
          "palletId": 2,
          "palletName": "Поддон-002",
          "quantity": 50,
          "stages": [
            {
              "routeStageId": 1,
              "stageName": "Распил",
              "sequenceNumber": 1,
              "status": "COMPLETED"
            },
            {
              "routeStageId": 2,
              "stageName": "Сверление",
              "sequenceNumber": 2,
              "status": "NOT_STARTED"
            }
          ]
        }
      ]
    }
  ]
}
```

## Описание данных

### Процент готовности этапов деталей
Процент готовности каждого этапа рассчитывается **индивидуально для каждой детали** на основе её поддонов:
- Берутся только поддоны конкретной детали
- Для каждого этапа маршрута этой детали считается количество завершенных деталей на поддонах
- Процент = (завершенные детали на поддонах / общее количество деталей на поддонах этой детали) * 100

Каждая деталь имеет свой маршрут и свои этапы обработки, поэтому процент считается отдельно для каждой.

### Общий прогресс заказа
Заказ имеет два отдельных показателя прогресса:

**productionProgress** - процент выполнения производственных этапов:
- Учитываются все этапы кроме финального (упаковка)
- Каждый этап имеет вес в зависимости от количества деталей на поддонах
- Формула: сумма(количество_на_поддонах * процент_этапа) / общее_количество_работы

**packingProgress** - процент выполнения упаковки:
- Количество упакованных упаковок / общее количество упаковок

### Статусы поддонов
- `NOT_STARTED` - Этап не начат
- `IN_PROGRESS` - Этап в работе
- `COMPLETED` - Этап завершен

## Статусы заказов
- `PRELIMINARY` - Предварительный
- `APPROVED` - Утверждено
- `LAUNCH_PERMITTED` - Разрешено к запуску
- `IN_PROGRESS` - В работе
- `COMPLETED` - Завершен
- `POSTPONED` - Отложен