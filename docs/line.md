
# Документация API для фронтенда - Модуль настроек

> **Репозиторий:** https://github.com/vova0020/mes_Server.git  
> **Ветка:** main  
> **Базовый URL:** `http://localhost:3000` (или ваш сервер)

## Содержание
1. [Производственные потоки (Production Lines)](#производственные-потоки)
2. [Технологические операции 1 уровня](#технологические-операции-1-уровня)
3. [Технологические операции 2 уровня](#технологические-операции-2-уровня)
4. [Группы материалов](#группы-материалов)
5. [Материалы](#материалы)
6. [WebSocket события](#websocket-события)

---

## Производственные потоки
**Базовый путь:** `/settings/production-lines`

### 1. Получить все потоки
```http
GET /settings/production-lines
```

**Ответ:**
```typescript
type ProductionLineResponse = {
  lineId: number;
  lineName: string;
  lineType: string;
  stagesCount: number;
  materialsCount: number;
}[]
```

### 2. Получить поток по ID
```http
GET /settings/production-lines/:id
```

**Ответ:**
```typescript
type ProductionLineDetailResponse = {
  lineId: number;
  lineName: string;
  lineType: string;
  stagesCount: number;
  materialsCount: number;
  stages?: {
    lineStageId: number;
    lineId: number;
    stageId: number;
    stageName: string;
  }[];
  materials?: {
    materialId: number;
    materialName: string;
    article: string;
    unit: string;
  }[];
}
```

### 3. Создать поток
```http
POST /settings/production-lines
```

**Тело запроса:**
```typescript
{
  lineName: string;           // Обязательно
  lineType: string;           // Обязательно
  materialIds?: number[];     // Опционально
  stageIds?: number[];        // Опционально
}
```

### 4. Обновить поток
```http
PATCH /settings/production-lines/:id
```

**Тело запроса:**
```typescript
{
  lineName?: string;
  lineType?: string;
  materialIds?: number[];
  stageIds?: number[];
}
```

### 5. Удалить поток
```http
DELETE /settings/production-lines/:id
```

### 6. Получить этапы в потоке
```http
GET /settings/production-lines/:id/stages
```

### 7. Обновить этапы потока
```http
PATCH /settings/production-lines/:id/stages
```

**Тело запроса:**
```typescript
{
  stageIds: number[];
}
```

### 8. Получить материалы в потоке
```http
GET /settings/production-lines/:id/materials
```

### 9. Обновить материалы потока
```http
PATCH /settings/production-lines/:id/materials
```

**Тело запроса:**
```typescript
{
  materialIds: number[];
}
```

### 10. Привязать этап к потоку
```http
POST /settings/production-lines/link-stage
```

**Тело запроса:**
```typescript
{
  lineId: number;
  stageId: number;
}
```

### 11. Отвязать этап от потока
```http
DELETE /settings/production-lines/line-stage/:lineStageId
```

### 12. Привязать материал к потоку
```http
POST /settings/production-lines/link-material
```

**Тело запроса:**
```typescript
{
  lineId: number;
  materialId: number;
}
```

### 13. Отвязать материал от потока
```http
DELETE /settings/production-lines/unlink-material
```

**Тело запроса:**
```typescript
{
  lineId: number;
  materialId: number;
}
```

---

## Технологические операции 1 уровня
**Базовый путь:** `/settings/production-stages-level1`

### 1. Получить все операции
```http
GET /settings/production-stages-level1
```

**Ответ:**
```typescript
type ProductionStageLevel1Response = {
  stageId: number;
  stageName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  substagesCount: number;
}[]
```

### 2. Получить операцию по ID
```http
GET /settings/production-stages-level1/:id
```

**Ответ:**
```typescript
type ProductionStageLevel1DetailResponse = {
  stageId: number;
  stageName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  substagesCount: number;
  substages?: {
    substageId: number;
    stageId: number;
    substageName: string;
    description?: string;
    allowance: number;
  }[];
}
```

### 3. Создать операцию
```http
POST /settings/production-stages-level1
```

**Тело запроса:**
```typescript
{
  stageName: string;        // Обязательно
  description?: string;     // Опционально
}
```

### 4. Обновить операцию
```http
PATCH /settings/production-stages-level1/:id
```

**Тело запроса:**
```typescript
{
  stageName?: string;
  description?: string;
}
```

### 5. Удалить операцию
```http
DELETE /settings/production-stages-level1/:id
```

---

## Технологические операции 2 уровня
**Базовый путь:** `/settings/production-stages-level2`

### 1. Получить все подэтапы
```http
GET /settings/production-stages-level2
```

**Query параметры:**
- `stageId` (опционально) - фильтр по ID операции 1 уровня

**Ответ:**
```typescript
type ProductionStageLevel2Response = {
  substageId: number;
  stageId: number;
  stageName: string;
  substageName: string;
  description?: string;
  allowance: number;
}[]
```

### 2. Получить подэтап по ID
```http
GET /settings/production-stages-level2/:id
```

### 3. Создать подэтап
```http
POST /settings/production-stages-level2
```

**Тело запроса:**
```typescript
{
  stageId: number;          // Обязательно
  substageName: string;     // Обязательно
  description?: string;     // Опционально
  allowance: number;        // Обязательно
}
```

### 4. Обновить подэтап
```http
PATCH /settings/production-stages-level2/:id
```

**Тело запроса:**
```typescript
{
  substageName?: string;
  description?: string;
  allowance?: number;
}
```

### 5. Удалить подэтап
```http
DELETE /settings/production-stages-level2/:id
```

### 6. Привязать подэтап к операции
```http
POST /settings/production-stages-level2/link
```

**Тело запроса:**
```typescript
{
  stageId: number;
  substageName: string;
  description?: string;
  allowance: number;
}
```

---

## Группы материалов
**Базовый путь:** `/settings/material-groups`

### 1. Получить все группы
```http
GET /settings/material-groups
```

**Ответ:**
```typescript
type MaterialGroupResponse = {
  groupId: number;
  groupName: string;
  materialsCount: number;
}[]
```

### 2. Получить группу по ID
```http
GET /settings/material-groups/:id
```

### 3. Создать группу
```http
POST /settings/material-groups
```

**Тело запроса:**
```typescript
{
  groupName: string;        // Обязательно
}
```

### 4. Обновить группу
```http
PATCH /settings/material-groups/:id
```

**Тело запроса:**
```typescript
{
  groupName?: string;
}
```

### 5. Удалить группу
```http
DELETE /settings/material-groups/:id
```

### 6. Получить материалы в группе
```http
GET /settings/material-groups/:id/materials
```

### 7. Привязать материал к группе
```http
POST /settings/material-groups/link
```

**Тело запроса:**
```typescript
{
  groupId: number;
  materialId: number;
}
```

### 8. Отвязать материал от группы
```http
POST /settings/material-groups/unlink
```

**Тело запроса:**
```typescript
{
  groupId: number;
  materialId: number;
}
```

---

## Материалы
**Базовый путь:** `/settings/materials`

### 1. Получить все материалы
```http
GET /settings/materials
```

**Query параметры:**
- `groupId` (опционально) - фильтр по ID группы

**Ответ:**
```typescript
type MaterialResponse = {
  materialId: number;
  materialName: string;
  article: string;
  unit: string;
  groups: {
    groupId: number;
    groupName: string;
  }[];
}[]
```

### 2. Получить материал по ID
```http
GET /settings/materials/:id
```

### 3. Создать материал
```http
POST /settings/materials
```

**Тело запроса:**
```typescript
{
  materialName: string;     // Обязательно
  article: string;          // Обязательно
  unit: string;             // Обязательно
  groupIds?: number[];      // Опционально
}
```

### 4. Обновить материал
```http
PATCH /settings/materials/:id
```

**Тело запроса:**
```typescript
{
  materialName?: string;
  article?: string;
  unit?: string;
  groupIds?: number[];
}
```

### 5. Удалить материал
```http
DELETE /settings/materials/:id
```

---

## WebSocket события

### Подключение к WebSocket
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Присоединиться к комнате для получения событий
socket.emit('join', 'production-lines');
socket.emit('join', 'productionStages');
socket.emit('join', 'materialGroups');
socket.emit('join', 'materials');
```

### События производственных потоков
**Комната:** `production-lines`

```javascript
// Создание потока
socket.on('lineCreated', (data) => {
  console.log('Новый поток создан:', data.line);
  console.log('Время:', data.timestamp);
});

// Обновление потока
socket.on('lineUpdated', (data) => {
  console.log('Поток обновлен:', data.line);
});

// Удаление потока
socket.on('lineDeleted', (data) => {
  console.log('Поток удален:', data.lineId, data.lineName);
});

// Привязка/отвязка этапа
socket.on('stageLinkedToLine', (data) => {
  console.log('Этап привязан к потоку:', data);
});

socket.on('stageUnlinkedFromLine', (data) => {
  console.log('Этап отвязан от потока:', data);
});

// Привязка/отвязка материала
socket.on('materialLinkedToLine', (data) => {
  console.log('Материал привязан к потоку:', data);
});

socket.on('materialUnlinkedFromLine', (data) => {
  console.log('Материал отвязан от потока:', data);
});

// Обновление списков
socket.on('lineMaterialsUpdated', (data) => {
  console.log('Материалы потока обновлены:', data);
});

socket.on('lineStagesUpdated', (data) => {
  console.log('Этапы потока обновлены:', data);
});
```

### События технологических операций
**Комната:** `productionStages`

```javascript
// Операции 1 уровня
socket.on('stageLevel1Created', (data) => {
  console.log('Операция 1 уровня создана:', data.stage);
});

socket.on('stageLevel1Updated', (data) => {
  console.log('Операция 1 уровня обновлена:', data.stage);
});

socket.on('stageLevel1Deleted', (data) => {
  console.log('Операция 1 уровня удалена:', data.stageId, data.stageName);
});

// Операции 2 уровня
socket.on('stageLevel2Created', (data) => {
  console.log('Подэтап создан:', data.substage);
});

socket.on('stageLevel2Updated', (data) => {
  console.log('Подэтап обновлен:', data.substage);
});

socket.on('stageLevel2Deleted', (data) => {
  console.log('Подэтап удален:', data.substageId, data.substageName);
});

socket.on('substageLinkedToStage', (data) => {
  console.log('Подэтап привязан к операции:', data);
});
```

### События групп материалов
**Комната:** `materialGroups`

```javascript
socket.on('materialGroupCreated', (data) => {
  console.log('Группа материалов создана:', data.group);
});

socket.on('materialGroupUpdated', (data) => {
  console.log('Группа материалов обновлена:', data.group);
});

socket.on('materialGroupDeleted', (data) => {
  console.log('Группа материалов удалена:', data.groupId, data.groupName);
});

socket.on('materialLinkedToGroup', (data) => {
  console.log('Материал привязан к группе:', data);
});

socket.on('materialUnlinkedFromGroup', (data) => {
  console.log('Материал отвязан от группы:', data);
});
```

### События материалов
**Комната:** `materials`

```javascript
socket.on('materialCreated', (data) => {
  console.log('Материал создан:', data.material);
});

socket.on('materialUpdated', (data) => {
  console.log('Материал обновлен:', data.material);
});

socket.on('materialDeleted', (data) => {
  console.log('Материал удален:', data.materialId, data.materialName);
});

// Также получает события привязки/отвязки к группам
socket.on('materialLinkedToGroup', (data) => {
  console.log('Материал привязан к группе:', data);
});

socket.on('materialUnlinkedFromGroup', (data) => {
  console.log('Материал отвязан от группы:', data);
});
```

---

## Обработка ошибок

Все эндпоинты могут возвращать следующие HTTP статусы:

- **200 OK** - Успешный запрос
- **201 Created** - Ресурс успешно создан
- **204 No Content** - Ресурс успешно удален
- **400 Bad Request** - Некорректные данные в запросе
- **404 Not Found** - Ресурс не найден
- **409 Conflict** - Конфликт (например, дублирование названия)

**Структура ошибки:**
```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
}
```

**Примеры ошибок:**
```json
{
  "statusCode": 409,
  "message": "Поток с таким названием уже существует",
  "error": "Conflict"
}

{
  "statusCode": 404,
  "message": "Поток с ID 123 не найден", 
  "error": "Not Found"
}
```
