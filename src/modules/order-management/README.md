# Модуль управления заказами (Order Management)

Этот модуль предоставляет API для управления заказами производства. Он позволяет получать информацию о заказах, просматривать детали заказов и изменять их статусы.

## Основные возможности

### 1. Получение всех заказов
- **Endpoint**: `GET /order-management`
- **Описание**: Возвращает список всех заказов с базовой информацией
- **Ответ**: Массив объектов с информацией о заказах (ID, номер партии, название, статус, процент выполнения, количество упаковок и деталей)

### 2. Получение детальной информации о заказе
- **Endpoint**: `GET /order-management/:id`
- **Описание**: Возвращает полную информацию о заказе, включая все упаковки и детали
- **Параметры**: 
  - `id` - ID заказа
- **Ответ**: Объект с детальной информацией о заказе, упаковках и деталях

### 3. Изменение статуса заказа
- **Endpoint**: `PATCH /order-management/:id/status`
- **Описание**: Позволяет изменить статус заказа, включая установку статуса "разрешить к запуску"
- **Параметры**: 
  - `id` - ID заказа
- **Тело запроса**: 
  ```json
  {
    "status": "LAUNCH_PERMITTED"
  }
  ```
- **Ответ**: Информация об изменении статуса

## Статусы заказов

Модуль поддерживает следующие статусы заказов:
- `PRELIMINARY` - Предварительный
- `APPROVED` - Утверждено
- `LAUNCH_PERMITTED` - Разрешено к запуску
- `IN_PROGRESS` - В работе
- `COMPLETED` - Завершен

## Валидация переходов статусов

Система проверяет валидность переходов между статусами:
- `PRELIMINARY` → `APPROVED`
- `APPROVED` → `LAUNCH_PERMITTED` или `PRELIMINARY`
- `LAUNCH_PERMITTED` → `IN_PROGRESS` или `APPROVED`
- `IN_PROGRESS` → `COMPLETED`
- `COMPLETED` → (нельзя изменить)

## WebSocket события

Модуль отправляет события через WebSocket в комнату `order-management`:

### orderStatusChanged
Отправляется при изменении статуса заказа:
```json
{
  "orderId": 1,
  "previousStatus": "APPROVED",
  "newStatus": "LAUNCH_PERMITTED",
  "launchPermission": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Структура модуля

```
src/modules/order-management/
├── controllers/
│   └── order-management.controller.ts    # REST API контроллер
├── services/
│   └── order-management.service.ts       # Бизнес-логика
├── dto/
│   └── order-management.dto.ts           # DTO для валидации и документации
├── order-management.module.ts            # Модуль NestJS
└── README.md                             # Документация
```

## Зависимости

Мо��уль использует:
- `PrismaService` - для работы с базой данных
- `EventsService` - для отправки WebSocket событий
- `ConfigModule` - для конфигурации
- `SharedModule` - для общих сервисов
- `WebsocketModule` - для WebSocket функциональности

## Примеры использования

### Получение всех заказов
```bash
curl -X GET http://localhost:3000/order-management
```

### Получение деталей заказа
```bash
curl -X GET http://localhost:3000/order-management/1
```

### Изменение статуса заказа на "разрешить к запуску"
```bash
curl -X PATCH http://localhost:3000/order-management/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "LAUNCH_PERMITTED"}'
```

## Swagger документация

Все endpoints документированы с помощью Swagger и доступны по адресу `/api` после запуска сервера.