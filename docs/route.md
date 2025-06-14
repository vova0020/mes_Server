
# API Документация - Модуль маршрутов
> **Базовый URL:** `http://localhost:5000` (или ваш сервер)

## Базовый URL
```
/settings/routes
```

## Socket.IO Комната
```
routes
```

---

## 📋 Содержание
1. [CRUD операции для маршрутов](#crud-операции-для-маршрутов)
2. [CRUD операции для этапов маршрута](#crud-операции-для-этапов-маршрута)
3. [Управление последовательностью этапов](#управление-последовательностью-этапов)
4. [Вспомогательные методы](#вспомогательные-методы)
5. [Структуры данных](#структуры-данных)
6. [Socket.IO События](#socketio-события)

---

## CRUD операции для маршрутов

### 1. Получить все маршруты
```http
GET /settings/routes
```

**Ответ:**
```json
[
  {
    "routeId": 1,
    "routeName": "Маршрут производства детали A",
    "routeStages": [
      {
        "routeStageId": 1,
        "routeId": 1,
        "stageId": 1,
        "substageId": 2,
        "sequenceNumber": 1,
        "stage": {
          "stageId": 1,
          "stageName": "Обработка"
        },
        "substage": {
          "substageId": 2,
          "substageName": "Токарная обработка"
        }
      }
    ],
    "_count": {
      "parts": 5
    }
  }
]
```

### 2. Получить маршрут по ID
```http
GET /settings/routes/:id
```

**Параметры:**
- `id` (number) - ID маршрута

**Ответ:**
```json
{
  "routeId": 1,
  "routeName": "Маршрут производства детали A",
  "routeStages": [
    {
      "routeStageId": 1,
      "routeId": 1,
      "stageId": 1,
      "substageId": 2,
      "sequenceNumber": 1,
      "stage": {
        "stageId": 1,
        "stageName": "Обработка"
      },
      "substage": {
        "substageId": 2,
        "substageName": "Токарная обработка"
      }
    }
  ],
  "parts": [
    {
      "partId": 1,
      "partName": "Деталь A1",
      "partCode": "DET-A1"
    }
  ]
}
```

**Ошибки:**
- `404` - Маршрут не найден

### 3. Создать новый маршрут
```http
POST /settings/routes
```

**Тело запроса:**
```json
{
  "routeName": "Новый маршрут",
  "stages": [
    {
      "stageId": 1,
      "substageId": 2,
      "sequenceNumber": 1
    }
  ]
}
```

**Ответ:**
```json
{
  "routeId": 2,
  "routeName": "Новый маршрут",
  "routeStages": [...]
}
```

**Ошибки:**
- `400` - Некорректные данные

### 4. Обновить маршрут
```http
PUT /settings/routes/:id
```

**Параметры:**
- `id` (number) - ID маршрута

**Тело запроса:**
```json
{
  "routeName": "Обновленное название маршрута"
}
```

**Ответ:**
```json
{
  "routeId": 1,
  "routeName": "Обновленное название маршрута",
  "routeStages": [...]
}
```

**Ошибки:**
- `404` - Маршрут не найден

### 5. Удалить маршрут
```http
DELETE /settings/routes/:id
```

**Параметры:**
- `id` (number) - ID маршрута

**Ответ:**
```json
{
  "message": "Маршрут успешно удален"
}
```

**Ошибки:**
- `404` - Маршрут не найден
- `400` - Маршрут используется и не может быть удален

---

## CRUD операции для этапов маршрута

### 1. Получить этапы маршрута
```http
GET /settings/routes/:id/stages
```

**Параметры:**
- `id` (number) - ID маршрута

**Ответ:**
```json
[
  {
    "routeStageId": 1,
    "routeId": 1,
    "stageId": 1,
    "substageId": 2,
    "sequenceNumber": 1,
    "stage": {
      "stageId": 1,
      "stageName": "Обработка"
    },
    "substage": {
      "substageId": 2,
      "substageName": "Токарная обработка"
    }
  }
]
```

**Ошибки:**
- `404` - Маршрут не найден

### 2. Добавить этап к маршруту
```http
POST /settings/routes/:id/stages
```

**Параметры:**
- `id` (number) - ID маршрута

**Тело запроса:**
```json
{
  "stageId": 1,
  "substageId": 2,
  "sequenceNumber": 3
}
```

**Ответ:**
```json
{
  "routeStageId": 3,
  "routeId": 1,
  "stageId": 1,
  "substageId": 2,
  "sequenceNumber": 3,
  "stage": {
    "stageId": 1,
    "stageName": "Обработка"
  },
  "substage": {
    "substageId": 2,
    "substageName": "Токарная обработка"
  }
}
```

**Ошибки:**
- `404` - Маршрут не найден или этап не найден
- `400` - Некорректные данные

### 3. Обновить этап маршрута
```http
PUT /settings/routes/stages/:stageId
```

**Параметры:**
- `stageId` (number) - ID этапа маршрута

**Тело запроса:**
```json
{
  "stageId": 2,
  "substageId": 3,
  "sequenceNumber": 2
}
```

**Ответ:**
```json
{
  "routeStageId": 1,
  "routeId": 1,
  "stageId": 2,
  "substageId": 3,
  "sequenceNumber": 2,
  "stage": {
    "stageId": 2,
    "stageName": "Сборка"
  },
  "substage": {
    "substageId": 3,
    "substageName": "Финальная сборка"
  }
}
```

**Ошибки:**
- `404` - Этап не найден

### 4. Удалить этап маршрута
```http
DELETE /settings/routes/stages/:stageId
```

**Параметры:**
- `stageId` (number) - ID этапа маршрута

**Ответ:**
```json
{
  "message": "Этап маршрута успешно удален"
}
```

**Ошибки:**
- `404` - Этап не найден
- `400` - Этап используется и не может быть удален

---

## Управление последовательностью этапов

### 1. Изменить порядок этапов в маршруте
```http
PUT /settings/routes/:id/stages/reorder
```

**Параметры:**
- `id` (number) - ID маршрута

**Тело запроса:**
```json
{
  "stageIds": [3, 1, 2]
}
```

**Ответ:**
```json
[
  {
    "routeStageId": 3,
    "sequenceNumber": 1,
    "stage": {...}
  },
  {
    "routeStageId": 1,
    "sequenceNumber": 2,
    "stage": {...}
  },
  {
    "routeStageId": 2,
    "sequenceNumber": 3,
    "stage": {...}
  }
]
```

**Ошибки:**
- `404` - Маршрут не найден
- `400` - Некорректные данные

### 2. Переместить этап на новую позицию
```http
PUT /settings/routes/stages/:stageId/move
```

**Параметры:**
- `stageId` (number) - ID этапа маршрута

**Тело запроса:**
```json
{
  "newSequenceNumber": 2
}
```

**Ответ:**
```json
[
  {
    "routeStageId": 1,
    "sequenceNumber": 1,
    "stage": {...}
  },
  {
    "routeStageId": 3,
    "sequenceNumber": 2,
    "stage": {...}
  }
]
```

**Ошибки:**
- `404` - Этап не найден

---

## Вспомогательные методы

### 1. Получить доступные этапы уровня 1
```http
GET /settings/routes/available-stages/level1
```

**Ответ:**
```json
[
  {
    "stageId": 1,
    "stageName": "Обработка",
    "productionStagesLevel2": [
      {
        "substageId": 1,
        "substageName": "Токарная обработка",
        "stageId": 1
      }
    ]
  }
]
```

### 2. Получить доступные этапы уровня 2
```http
GET /settings/routes/available-stages/level2/:stageId
```

**Параметры:**
- `stageId` (number) - ID этапа уровня 1

**Ответ:**
```json
[
  {
    "substageId": 1,
    "substageName": "Токарная обработка",
    "stageId": 1
  },
  {
    "substageId": 2,
    "substageName": "Фрезерная обработка",
    "stageId": 1
  }
]
```

### 3. Скопировать маршрут
```http
POST /settings/routes/:id/copy
```

**Параметры:**
- `id` (number) - ID маршрута для копирования

**Тело запроса:**
```json
{
  "newRouteName": "Копия маршрута"
}
```

**Ответ:**
```json
{
  "routeId": 4,
  "routeName": "Копия маршрута",
  "routeStages": [...]
}
```

**Ошибки:**
- `404` - Маршрут не найден

---

## Структуры данных

### CreateRouteDto
```typescript
{
  routeName: string;              // Обязательное поле
  stages?: CreateRouteStageDto[]; // Опциональный массив этапов
}
```

### UpdateRouteDto
```typescript
{
  routeName: string; // Обязательное поле
}
```

### CreateRouteStageDto
```typescript
{
  stageId: number;          // Обязательное поле - ID этапа уровня 1
  substageId?: number;      // Опциональное поле - ID этапа уровня 2
  sequenceNumber?: number;  // Опциональное поле - номер последовательности
}
```

### UpdateRouteStageDto
```typescript
{
  stageId?: number;         // Опциональное поле - ID этапа уровня 1
  substageId?: number;      // Опциональное поле - ID этапа уровня 2
  sequenceNumber?: number;  // Опциональное поле - номер последовательности
}
```

### ReorderRouteStagesDto
```typescript
{
  stageIds: number[]; // Массив ID этапов в новом порядке
}
```

### MoveRouteStageDto
```typescript
{
  newSequenceNumber: number; // Новый номер последовательности
}
```

### CopyRouteDto
```typescript
{
  newRouteName: string; // Название для копии маршрута
}
```

---

## Socket.IO События

### Подключение к комнате
```javascript
// Подключение к комнате маршрутов
socket.emit('join-room', 'routes');
```

### События маршрутов

#### routeCreated
Срабатывает при создании нового маршрута
```javascript
socket.on('routeCreated', (data) => {
  console.log('Создан новый маршрут:', data);
  // data: { route: Route, timestamp: string }
});
```

#### routeUpdated
Срабатывает при обновлении маршрута
```javascript
socket.on('routeUpdated', (data) => {
  console.log('Маршрут обновлен:', data);
  // data: { route: Route, timestamp: string }
});
```

#### routeDeleted
Срабатывает при удалении маршрута
```javascript
socket.on('routeDeleted', (data) => {
  console.log('Маршрут удален:', data);
  // data: { routeId: number, routeName: string, timestamp: string }
});
```

#### routeCopied
Срабатывает при копировании маршрута
```javascript
socket.on('routeCopied', (data) => {
  console.log('Маршрут скопирован:', data);
  // data: { originalRoute: Route, copiedRoute: Route, timestamp: string }
});
```

### События этапов маршрута

#### routeStageCreated
Срабатывает при создании этапа маршрута
```javascript
socket.on('routeStageCreated', (data) => {
  console.log('Создан этап маршрута:', data);
  // data: { routeId: number, routeName: string, routeStage: RouteStage, timestamp: string }
});
```

#### routeStageUpdated
Срабатывает при обновлении этапа маршрута
```javascript
socket.on('routeStageUpdated', (data) => {
  console.log('Этап маршрута обновлен:', data);
  // data: { routeId: number, routeName: string, routeStage: RouteStage, timestamp: string }
});
```

#### routeStageDeleted
Срабатывает при удалении этапа маршрута
```javascript
socket.on('routeStageDeleted', (data) => {
  console.log('Этап маршрута удален:', data);
  // data: { 
  //   routeStageId: number, 
  //   routeId: number, 
  //   routeName: string, 
  //   stageName: string, 
  //   substageName?: string, 
  //   timestamp: string 
  // }
});
```

#### routeStagesReordered
Срабатывает при изменении порядка этапов
```javascript
socket.on('routeStagesReordered', (data) => {
  console.log('Порядок этапов изменен:', data);
  // data: { routeId: number, routeName: string, stages: RouteStage[], timestamp: string }
});
```

#### routeStageMoved
Срабатывает при перемещении этапа
```javascript
socket.on('routeStageMoved', (data) => {
  console.log('Этап перемещен:', data);
  // data: { 
  //   routeId: number, 
  //   routeName: string, 
  //   routeStageId: number, 
  //   oldSequenceNumber: number, 
  //   newSequenceNumber: number, 
  //   stages: RouteStage[], 
  //   timestamp: string 
  // }
});
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение запроса |
| 201 | Ресурс успешно создан |
| 400 | Некорректные данные в запросе |
| 404 | Ресурс не найден |
| 500 | Внутренняя ошибка сервера |

---

## Примечания

1. Все числовые ID должны быть положительными целыми числами
2. Поле `sequenceNumber` автоматически вычисляется, если не указано
3. При удалении маршрута проверяется его использование в других сущностях
4. Socket.IO события отправляются всем клиентам, подключенным к комнате 'routes'
5. Все временные метки в формате ISO string
