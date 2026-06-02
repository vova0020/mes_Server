# API статистики заказов индивидуального производства

## Описание
API для получения статистики по заказам индивидуального производства. Аналог `/order-statistics` для серийного производства.

**Базовый URL:** `/custom-order-statistics`

---

## Эндпоинты

### 1. Получить список всех заказов со статистикой

**GET** `/custom-order-statistics`

#### Описание
Возвращает список всех заказов индивидуального производства с базовой статистикой.

#### Пример ответа
```json
[
  {
    "customOrderId": 1,
    "orderNumber": "ИП-2024-001 - Заказ на кухню",
    "orderName": "Заказ на кухню",
    "status": "LAUNCH_PERMITTED",
    "completionPercentage": 0,
    "productionProgress": 0,
    "packingProgress": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "requiredDate": "2024-02-01T00:00:00.000Z"
  }
]
```

#### Поля ответа
- `customOrderId` - ID заказа
- `orderNumber` - Номер заказа с названием
- `orderName` - Название заказа
- `status` - Статус заказа (`PRELIMINARY`, `APPROVED`, `LAUNCH_PERMITTED`, `IN_PROGRESS`, `COMPLETED`, `POSTPONED`)
- `completionPercentage` - Общий процент выполнения
- `productionProgress` - Процент выполнения производства (TODO: пока 0)
- `packingProgress` - Процент выполнения упаковки (TODO: пока 0)
- `createdAt` - Дата создания заказа
- `requiredDate` - Требуемая дата выполнения

---

### 2. Получить детальную статистику по заказу

**GET** `/custom-order-statistics/:id`

#### Параметры
- `id` (number, обязательный) - ID заказа индивидуального производства

#### Описание
Возвращает детальную информацию о заказе, включая статистику по деталям, поддонам и этапам производства.

#### Пример ответа
```json
{
  "customOrderId": 1,
  "orderNumber": "ИП-2024-001",
  "orderName": "Заказ на кухню",
  "status": "IN_PROGRESS",
  "completionPercentage": 0,
  "productionProgress": 0,
  "packingProgress": 0,
  "parts": [
    {
      "customPartId": 10,
      "partCode": "КУХ-001",
      "partName": "Столешница",
      "totalQuantity": 5,
      "pallets": [
        {
          "palletId": 100,
          "palletName": "Поддон-001",
          "quantity": 2,
          "stages": [
            {
              "routeStageId": 50,
              "stageName": "Распиловка",
              "sequenceNumber": 1,
              "status": "COMPLETED"
            },
            {
              "routeStageId": 51,
              "stageName": "Кромкование",
              "sequenceNumber": 2,
              "status": "IN_PROGRESS"
            }
          ]
        }
      ],
      "stages": [
        {
          "routeStageId": 50,
          "stageName": "Распиловка",
          "sequenceNumber": 1,
          "completionPercentage": 0,
          "finalStage": false
        },
        {
          "routeStageId": 51,
          "stageName": "Кромкование",
          "sequenceNumber": 2,
          "completionPercentage": 0,
          "finalStage": false
        }
      ],
      "totalDefected": 0,
      "totalReturned": 0
    }
  ]
}
```

#### Поля ответа

**Основная информация:**
- `customOrderId` - ID заказа
- `orderNumber` - Номер заказа
- `orderName` - Название заказа
- `status` - Статус заказа
- `completionPercentage` - Общий процент выполнения
- `productionProgress` - Процент выполнения производства (TODO: пока 0)
- `packingProgress` - Процент выполнения упаковки (TODO: пока 0)

**Детали (parts):**
- `customPartId` - ID детали
- `partCode` - Код детали
- `partName` - Название детали
- `totalQuantity` - Общее количество деталей
- `totalDefected` - Количество отбракованных деталей (TODO: пока 0)
- `totalReturned` - Количество возвращенных деталей (TODO: пока 0)

**Поддоны (pallets):**
- `palletId` - ID поддона
- `palletName` - Название поддона
- `quantity` - Количество деталей на поддоне
- `stages` - Статусы этапов для этого поддона

**Этапы (stages):**
- `routeStageId` - ID этапа маршрута
- `stageName` - Название этапа
- `sequenceNumber` - Порядковый номер этапа
- `completionPercentage` - Процент выполнения этапа (TODO: пока 0)
- `finalStage` - Является ли этап финальным (упаковка)
- `status` - Статус этапа (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)

---

### 3. Принудительно завершить заказ

**PATCH** `/custom-order-statistics/:id/force-complete`

#### Параметры
- `id` (number, обязательный) - ID заказа индивидуального производства

#### Описание
Принудительно переводит заказ в статус `COMPLETED` независимо от фактического прогресса выполнения.

#### Пример ответа
```json
{
  "customOrderId": 1,
  "status": "COMPLETED",
  "completedAt": "2024-01-20T15:45:00.000Z"
}
```

#### Коды ответов
- `200 OK` - Заказ успешно завершен
- `404 Not Found` - Заказ с указанным ID не найден

---

## Примечания

### TODO: Расчет статистики
В текущей версии следующие поля возвращают нулевые значения и требуют реализации расчета:
- `productionProgress` - процент выполнения производства
- `packingProgress` - процент выполнения упаковки
- `completionPercentage` в этапах - процент выполнения каждого этапа
- `totalDefected` - количество отбракованных деталей
- `totalReturned` - количество возвращенных деталей

### WebSocket уведомления
При принудительном завершении заказа отправляются WebSocket уведомления в комнаты:
- `room:masterceh`
- `room:machines`
- `room:machinesnosmen`
- `room:technologist`
- `room:director`

Событие: `custom-order:event` с данными `{ status: 'updated', orderId: <id> }`

---

## Использование на фронтенде

```typescript
// Получить список всех заказов
const orders = await fetch('/custom-order-statistics');

// Получить детальную статистику по заказу
const orderDetails = await fetch('/custom-order-statistics/1');

// Принудительно завершить заказ
const result = await fetch('/custom-order-statistics/1/force-complete', {
  method: 'PATCH'
});
```

---

## Отличия от серийного производства

| Серийное производство | Индивидуальное производство |
|----------------------|----------------------------|
| `/order-statistics` | `/custom-order-statistics` |
| `Order` | `CustomOrder` |
| `Package` | Нет упаковок (детали напрямую) |
| `Part` + `Pallet` | `CustomOrderPart` + `CustomPallet` |
| `ProductionPackagePart` | `CustomPalletPart` |
| `PalletStageProgress` | `CustomPalletPartStageProgress` |
