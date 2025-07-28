# API Документация: Модуль Производственных Заказов

## Обзор

Модуль производственных заказов предназначен для управления заказами на производство в системе MES. Он позволяет создавать, редактировать, отслеживать и управлять производственными заказами с автоматическим созданием деталей на основе справочника упаковок.

**Базовый URL:** `/production-orders`

## Статусы заказов

```typescript
enum OrderStatus {
  PRELIMINARY = 'PRELIMINARY',      // Предварительный
  APPROVED = 'APPROVED',           // Утвержден
  LAUNCH_PERMITTED = 'LAUNCH_PERMITTED', // Разрешен к запуску
  IN_PROGRESS = 'IN_PROGRESS',     // В работе
  COMPLETED = 'COMPLETED'          // Завершен
}
```

### Переходы статусов
- `PRELIMINARY` → `APPROVED`
- `APPROVED` → `LAUNCH_PERMITTED` или `PRELIMINARY`
- `LAUNCH_PERMITTED` → `IN_PROGRESS` или `APPROVED`
- `IN_PROGRESS` → `COMPLETED`
- `COMPLETED` → (нельзя изменить)

## Типы данных

### CreateProductionOrderDto
```typescript
interface CreateProductionOrderDto {
  batchNumber: string;        // Номер производственной партии (обязательно)
  orderName: string;          // Название заказа (обязательно)
  requiredDate: string;       // Требуемая дата выполнения (ISO 8601)
  status?: OrderStatus;       // Статус заказа (по умолчанию PRELIMINARY)
  packages: CreatePackageDto[]; // Упаковки в заказе
}
```

### CreatePackageDto
```typescript
interface CreatePackageDto {
  packageDirectoryId: number; // ID упаковки из справочника
  quantity: number;           // Количество упаковок в заказе
}
```

### UpdateProductionOrderDto
```typescript
interface UpdateProductionOrderDto {
  batchNumber?: string;       // Номер производственной партии
  orderName?: string;         // Название заказа
  requiredDate?: string;      // Требуемая дата выполнения
  status?: OrderStatus;       // Статус заказа
  launchPermission?: boolean; // Разрешение запуска в производство
  isCompleted?: boolean;      // Флаг завершенности
  packages?: CreatePackageDto[]; // Упаковки в заказе (полностью заменит существующие)
}
```

### ProductionOrderResponseDto
```typescript
interface ProductionOrderResponseDto {
  orderId: number;                    // ID заказа
  batchNumber: string;                // Номер производственной партии
  orderName: string;                  // Название заказа
  completionPercentage: number;       // Процент выполнения заказа
  createdAt: string;                  // Дата создания (ISO 8601)
  completedAt?: string;               // Дата завершения (ISO 8601)
  requiredDate: string;               // Требуемая дата выполнения (ISO 8601)
  status: OrderStatus;                // Статус заказа
  launchPermission: boolean;          // Разрешение запуска в производство
  isCompleted: boolean;               // Флаг завершенности
  packages?: PackageResponseDto[];    // Упаковки в заказе
}
```

### PackageResponseDto
```typescript
interface PackageResponseDto {
  packageId: number;              // ID упаковки
  packageCode: string;            // Код упаковки
  packageName: string;            // Название упаковки
  completionPercentage: number;   // Процент готовности упаковки
  quantity: number;               // Количество упаковок в заказе
  details?: {                     // Детали в упаковке
    partId: number;               // ID детали
    partCode: string;             // Код детали
    partName: string;             // Название детали
    quantity: number;             // Общее количество деталей
  }[];
}
```

### PackageDirectoryResponseDto
```typescript
interface PackageDirectoryResponseDto {
  packageId: number;              // ID упаковки в справочнике
  packageCode: string;            // Код упаковки
  packageName: string;            // Название упаковки
  detailsCount: number;           // Количество деталей в упаковке
  details?: {                     // Детали в упаковке из справочника
    detailId: number;             // ID детали
    partSku: string;              // Артикул детали
    partName: string;             // Название детали
    quantity: number;             // Количество деталей в упаковке
  }[];
}
```

## API Endpoints

### 1. Создать заказ на производство

**POST** `/production-orders`

**Описание:** Создает новый заказ на производство с автоматическим созданием деталей из справочника упаковок.

**Тело запроса:**
```json
{
  "batchNumber": "BATCH-2024-001",
  "orderName": "Заказ на производство мебели",
  "requiredDate": "2024-12-31T23:59:59.000Z",
  "status": "PRELIMINARY",
  "packages": [
    {
      "packageDirectoryId": 1,
      "quantity": 5
    }
  ]
}
```

**Ответы:**
- `201 Created` - Заказ успешно создан
- `409 Conflict` - Заказ с таким номером партии уже существует
- `404 Not Found` - Одна или несколько указанных упаковок не найдены

**Пример ответа:**
```json
{
  "orderId": 1,
  "batchNumber": "BATCH-2024-001",
  "orderName": "Заказ на производство мебели",
  "completionPercentage": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": null,
  "requiredDate": "2024-12-31T23:59:59.000Z",
  "status": "PRELIMINARY",
  "launchPermission": false,
  "isCompleted": false,
  "packages": [
    {
      "packageId": 1,
      "packageCode": "PKG-001",
      "packageName": "Упаковка стульев",
      "completionPercentage": 0,
      "quantity": 5,
      "details": [
        {
          "partId": 1,
          "partCode": "PART-001",
          "partName": "Ножка стула",
          "quantity": 55
        }
      ]
    }
  ]
}
```

### 2. Получить все заказы

**GET** `/production-orders`

**Описание:** Возвращает список всех заказов на производство.

**Параметры запроса:**
- `status` (опционально) - Фильтр по статусу заказа

**Ответы:**
- `200 OK` - Список всех заказов

**Пример запроса:**
```
GET /production-orders?status=IN_PROGRESS
```

### 3. Полу��ить заказ по ID

**GET** `/production-orders/{id}`

**Описание:** Возвращает детальную информацию о зак��зе по его ID.

**Параметры пути:**
- `id` - ID заказа

**Ответы:**
- `200 OK` - Заказ найден
- `404 Not Found` - Заказ не найден

### 4. Обновить заказ

**PATCH** `/production-orders/{id}`

**Описание:** Обновляет информацию о заказе. Теперь поддерживает изменение упаковок.

**Параметры пути:**
- `id` - ID заказа

**Тело запроса (обычное обновление):**
```json
{
  "orderName": "Обновленный заказ на производство",
  "status": "APPROVED",
  "launchPermission": true
}
```

**Тело запроса (с изменением упаковок):**
```json
{
  "orderName": "Обновленный заказ на производство",
  "packages": [
    {
      "packageDirectoryId": 2,
      "quantity": 8
    },
    {
      "packageDirectoryId": 3,
      "quantity": 5
    }
  ]
}
```

**Ответы:**
- `200 OK` - Заказ успешно обновлен
- `404 Not Found` - Заказ не найден
- `409 Conflict` - Заказ с таким номером партии уже существует ил�� нельзя изменять упаковки заказа в работе

### 5. Изменить статус заказа

**PATCH** `/production-orders/{id}/status`

**Описание:** Изменяет статус заказа с валидацией переходов.

**Параметры пути:**
- `id` - ID заказа

**Тело запроса:**
```json
{
  "status": "APPROVED"
}
```

**Ответы:**
- `200 OK` - Статус заказа успешно изменен
- `404 Not Found` - Заказ не найден
- `400 Bad Request` - Недопустимый переход статуса

### 6. Удалить заказ

**DELETE** `/production-orders/{id}`

**Описание:** Удаляет заказ и все связанные с ним данные.

**Параметры пути:**
- `id` - ID заказа

**Ответы:**
- `204 No Content` - Заказ успешно удален
- `404 Not Found` - Заказ не найден
- `409 Conflict` - Нельзя удалить заказ, который находится в работе

### 7. Получить список упаковок из справочника

**GET** `/production-orders/package-directory`

**Описание:** Возвращает все доступные упаковки из справочника с их деталями для создания производственных заказов.

**Ответы:**
- `200 OK` - Список упаковок из справочника

**Пример ответа:**
```json
[
  {
    "packageId": 1,
    "packageCode": "PKG-001",
    "packageName": "Упаковка стульев",
    "detailsCount": 4,
    "details": [
      {
        "detailId": 1,
        "partSku": "PART-001",
        "partName": "Ножка стула",
        "quantity": 4
      },
      {
        "detailId": 2,
        "partSku": "PART-002", 
        "partName": "Сиденье стула",
        "quantity": 1
      }
    ]
  }
]
```

## WebSocket События

Модуль отправляет события через WebSocket в комнату `production-orders`:

### orderCreated
Отправляется при создании нового заказа.
```json
{
  "order": ProductionOrderResponseDto,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### orderUpdated
Отправляется при обновлении заказа.
```json
{
  "order": ProductionOrderResponseDto,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### orderStatusChanged
Отправляется при изменении статуса заказа.
```json
{
  "order": ProductionOrderResponseDto,
  "previousStatus": "PRELIMINARY",
  "newStatus": "APPROVED",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### orderDeleted
Отправляется при удалении заказа.
```json
{
  "orderId": 1,
  "batchNumber": "BATCH-2024-001",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Особенности работы

### Автоматическое создание деталей
При создании заказа система автоматически:
1. Проверяет существование упаковок в справочнике
2. Создает детали на основе справочника упаковок
3. Рассчитывает общее количество деталей: `количество_в_справочнике × количество_упаковок`
4. Связывает детали с упаковками

### Обновление упаковок в заказе
При обновлении заказа можно изменить состав упаковок:
- Ес��и поле `packages` указано, то **все существующие упаковки будут удалены** и заменены новыми
- Старые детали, связанные с удаленными упаковками, также будут удалены из базы данных
- Новые детали будут созданы автоматически на основе справочника упаковок
- Нельзя изменять упаковки у заказа со статусом `IN_PROGRESS`

### Валидация статусов
Система строго контролирует переходы между статусами заказов, не позволяя недопустимые изменения.

### Каскадное удаление
При удалении заказа автоматически удаляются:
- Все упаковки заказа
- Все детали, созданные для заказа
- Связи между упаковками и деталями

## Примеры использования

### Создание простого заказа
```javascript
const createOrder = async () => {
  const orderData = {
    batchNumber: "BATCH-2024-001",
    orderName: "Заказ на стулья",
    requiredDate: "2024-12-31T23:59:59.000Z",
    packages: [
      {
        packageDirectoryId: 1,
        quantity: 10
      }
    ]
  };

  const response = await fetch('/production-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData)
  });

  const order = await response.json();
  console.log('Создан заказ:', order);
};
```

### Получение списка упаковок для создания заказа
```javascript
const getPackageDirectory = async () => {
  const response = await fetch('/production-orders/package-directory');
  
  if (response.ok) {
    const packages = await response.json();
    console.log('Доступные упаковки:', packages);
    
    // Можно использовать для заполнения выпадающего списка при создании заказа
    packages.forEach(pkg => {
      console.log(`${pkg.packageCode} - ${pkg.packageName} (${pkg.detailsCount} деталей)`);
    });
    
    return packages;
  } else {
    console.error('Ошибка получения списка упаковок');
    return [];
  }
};

// Пример использования при создании формы заказа
const initOrderForm = async () => {
  const packages = await getPackageDirectory();
  
  // Заполняем выпадающий список упаковок
  const packageSelect = document.getElementById('packageSelect');
  packages.forEach(pkg => {
    const option = document.createElement('option');
    option.value = pkg.packageId;
    option.textContent = `${pkg.packageCode} - ${pkg.packageName}`;
    packageSelect.appendChild(option);
  });
};
```

### Обновление заказа с изменением упаковок
```javascript
const updateOrderWithPackages = async (orderId) => {
  const updateData = {
    orderName: "Обновленный заказ",
    packages: [
      {
        packageDirectoryId: 2,
        quantity: 8
      },
      {
        packageDirectoryId: 3,
        quantity: 5
      }
    ]
  };

  const response = await fetch(`/production-orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData)
  });

  if (response.ok) {
    const updatedOrder = await response.json();
    console.log('Заказ обновлен с новыми упаковками:', updatedOrder);
  } else {
    console.error('Ошибка обновления заказа');
  }
};
```

### Изменение статуса заказа
```javascript
const updateOrderStatus = async (orderId, newStatus) => {
  const response = await fetch(`/production-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus })
  });

  if (response.ok) {
    const updatedOrder = await response.json();
    console.log('Статус обновлен:', updatedOrder);
  } else {
    console.error('Ошибка обн��вления статуса');
  }
};
```

### Подключение к WebSocket событиям
```javascript
import { io } from 'socket.io-client';

const socket = io();

// Подключаемся к комнате производственных заказов
socket.emit('join', 'production-orders');

// Слушаем события
socket.on('orderCreated', (data) => {
  console.log('Создан новый заказ:', data.order);
  // Обновить список заказов в UI
});

socket.on('orderStatusChanged', (data) => {
  console.log(`Статус заказа изменен с ${data.previousStatus} на ${data.newStatus}`);
  // Обновить статус в UI
});
```

## Коды ошибок

- `400 Bad Request` - Некорректные данные запроса или недопустимый переход статуса
- `404 Not Found` - Заказ или упаковка не найдены
- `409 Conflict` - Конфликт данных (дублирование номера партии, попытка удаления/изменения заказа в работе)
- `500 Internal Server Error` - Внутренняя ошибка сервера

## Ограничения при изменении упаковок

- Заказы со статусом `IN_PROGRESS` нельзя изменять (упаковки)
- При изменении упаковок все связанные детали пересоздаются заново
- Процент выполнения упаковок сбрасывается на 0
- Изменение упаковок - это операция "все или ничего" (нельзя изменить только одну упаковку)