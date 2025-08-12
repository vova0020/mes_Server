# API Документация: Управление заказами - Новые методы

## Новый статус заказа

Добавлен статус `POSTPONED` (Отложен) в enum `OrderStatus`:

```typescript
enum OrderStatus {
  PRELIMINARY = 'PRELIMINARY',
  APPROVED = 'APPROVED', 
  LAUNCH_PERMITTED = 'LAUNCH_PERMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED'  // ← Новый статус
}
```

## Новые API методы

### 1. Отложить заказ

**Endpoint:** `PATCH /order-management/:id/postpone`

**Описание:** Переводит заказ в статус "отложен"

**Параметры:**
- `id` (path) - ID заказа

**Ограничения:** 
- Можно отложить только заказы со статусом `PRELIMINARY` или `APPROVED`

**Ответ:**
```typescript
{
  orderId: number;
  previousStatus: OrderStatus;
  newStatus: 'POSTPONED';
  launchPermission: false;
  updatedAt: string;
}
```

**Пример запроса:**
```javascript
const response = await fetch('/order-management/123/postpone', {
  method: 'PATCH'
});
```

### 2. Удалить заказ

**Endpoint:** `DELETE /order-management/:id`

**Описание:** Удаляет заказ, если детали не прошли этапы производства

**Параметры:**
- `id` (path) - ID заказа

**Ограничения:**
- Нельзя удалить, если детали имеют статус `COMPLETED` или `IN_PROGRESS` в прогрессе маршрута

**Ответ:**
```typescript
{
  message: string;
}
```

**Пример запроса:**
```javascript
const response = await fetch('/order-management/123', {
  method: 'DELETE'
});
```

## Обновленные переходы статусов

| Текущий статус | Доступные переходы |
|---|---|
| `PRELIMINARY` | `APPROVED`, `POSTPONED` |
| `APPROVED` | `LAUNCH_PERMITTED`, `PRELIMINARY`, `POSTPONED` |
| `LAUNCH_PERMITTED` | `IN_PROGRESS`, `APPROVED` |
| `IN_PROGRESS` | `COMPLETED` |
| `COMPLETED` | - |
| `POSTPONED` | `PRELIMINARY`, `APPROVED` |

## WebSocket события

### orderStatusChanged
Отправляется при изменении статуса (включая отложение):
```typescript
{
  orderId: number;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  launchPermission: boolean;
  timestamp: string;
}
```

### orderDeleted
Отправляется при удалении заказа:
```typescript
{
  orderId: number;
  timestamp: string;
}
```

## Коды ошибок

- `404` - Заказ не найден
- `400` - Недопустимая операция (нельзя отложить/удалить заказ с текущим статусом)