# Модуль управления маршрутами (Route Management)

Этот модуль предназначен для управления маршрутами деталей в заказах производства.

## Функциональность

### 1. Получение всех доступных маршрутов
- **Эндпоинт**: `GET /route-management/routes`
- **Описание**: Возвращает список всех маршрутов с их этапами для выбора пользователем
- **Ответ**: Список всех доступных маршрутов с подробной информацией об этапах

### 2. Получение заказов для управления маршрутами
- **Эндпоинт**: `GET /route-management/orders`
- **Описание**: Возвращает список заказов со статусами "Предварительный" или "Утверждено"
- **Ответ**: Список заказов с базовой информацией и количеством деталей

### 3. Получение деталей заказа
- **Эндпоинт**: `GET /route-management/orders/:orderId/parts`
- **Описание**: Возвращает все детали указанного заказа с информацией о текущих маршрутах
- **Ответ**: 
  - Информация о заказе
  - Список деталей с текущими маршрутами
  - Список доступных маршрутов для назначения

### 4. Изменение маршрута детали
- **Эндпоинт**: `PATCH /route-management/parts/:partId/route`
- **Описание**: Обновляет маршрут указанной детали
- **Тело запроса**: `{ "routeId": number }`
- **Ответ**: Информация об изменении маршрута

## Ограничения

1. **Статус заказа**: Можно изменять маршруты только у деталей из заказов со статусами:
   - `PRELIMINARY` (Предварительный)
   - `APPROVED` (Утверждено)

2. **Валидация**: 
   - Деталь должна существовать
   - Новый маршрут должен существовать
   - Новый маршрут должен отличаться от текущего

## Логика работы

### При изменении маршрута детали:

1. **Проверки**:
   - Детали существует
   - Заказ имеет подходящий статус
   - Новый маршрут существует и отличается от текущего

2. **Обновление в транзакции**:
   - Обновляется `routeId` у детали
   - Удаляется старый прогресс по маршруту (`PartRouteProgress`)
   - Создается новый прогресс для всех этапов нового маршрута

3. **Уведомления**:
   - Отправляется WebSocket событие `partRouteUpdated`

## Структура данных

### OrderForRoutesResponseDto
```typescript
{
  orderId: number;
  batchNumber: string;
  orderName: string;
  status: 'PRELIMINARY' | 'APPROVED';
  requiredDate: string;
  createdAt: string;
  totalParts: number;
}
```

### PartForRouteManagementDto
```typescript
{
  partId: number;
  partCode: string;
  partName: string;
  totalQuantity: number;
  status: string;
  currentRoute: RouteInfoDto;
  size: string;
  materialName: string;
  packages: PackageInfo[];
}
```

### RouteInfoDto
```typescript
{
  routeId: number;
  routeName: string;
  stages: {
    routeStageId: number;
    stageName: string;
    substageName?: string;
    sequenceNumber: number;
  }[];
}
```

## WebSocket события

### partRouteUpdated
Отправляется при изменении маршрута детали:
```typescript
{
  orderId: number;
  batchNumber: string;
  partRouteUpdate: {
    partId: number;
    partCode: string;
    partName: string;
    previousRoute: RouteInfoDto;
    newRoute: RouteInfoDto;
    updatedAt: string;
  };
  timestamp: string;
}
```

## Примеры использования

### 1. Получить все доступные маршруты
```bash
GET /route-management/routes
```

### 2. Получить заказы для управления маршрутами
```bash
GET /route-management/orders
```

### 3. Получить детали заказа
```bash
GET /route-management/orders/1/parts
```

### 4. Изменить маршрут детали
```bash
PATCH /route-management/parts/5/route
Content-Type: application/json

{
  "routeId": 3
}
```