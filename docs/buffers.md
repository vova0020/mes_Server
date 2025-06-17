
# API Буферов - Документация для фронтенда
> **Базовый URL:** `http://localhost:5000` (или ваш сервер)
## Оглавление
1. [Базовая информация](#базовая-информация)
2. [Типы данных](#типы-данных)
3. [REST API эндпоинты](#rest-api-эндпоинты)
4. [WebSocket события](#websocket-события)
5. [Примеры использования](#примеры-использования)

## Базовая информация

### Базовый URL
```
/api/buffers
```

### Заголовки
```
Content-Type: application/json
Accept: application/json
```

## Типы данных

### Enum: CellStatus
```typescript
enum CellStatus {
  AVAILABLE = 'AVAILABLE',  // Доступна
  OCCUPIED = 'OCCUPIED',    // Занята
  RESERVED = 'RESERVED'     // Зарезервирована
}
```

### Интерфейсы ответов

#### BufferResponse
```typescript
interface BufferResponse {
  bufferId: number;
  bufferName: string;
  description: string | null;
  location: string;
  cellsCount: number;
  stagesCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

#### BufferDetailResponse
```typescript
interface BufferDetailResponse extends BufferResponse {
  bufferCells: BufferCellResponse[];
  bufferStages: BufferStageResponse[];
}
```

#### BufferCellResponse
```typescript
interface BufferCellResponse {
  cellId: number;
  bufferId: number;
  cellCode: string;
  status: CellStatus;
  capacity: number;
  currentLoad: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### BufferStageResponse
```typescript
interface BufferStageResponse {
  bufferStageId: number;
  bufferId: number;
  stageId: number;
  stage: {
    stageId: number;
    stageName: string;
    description: string | null;
  };
}
```

### DTOs для запросов

#### CreateBufferDto
```typescript
interface CreateBufferDto {
  bufferName: string;           // Обязательно, макс 100 символов
  description?: string;         // Опционально, макс 500 символов
  location: string;            // Обязательно, макс 200 символов
  cells?: CreateBufferCellDto[]; // Опционально
  stageIds?: number[];         // Опционально
}
```

#### CreateBufferCellDto
```typescript
interface CreateBufferCellDto {
  cellCode: string;            // Обязательно, макс 20 символов
  status?: CellStatus;         // Опционально, по умолчанию AVAILABLE
  capacity: number;            // Обязательно, >= 0
  currentLoad?: number;        // Опционально, >= 0, по умолчанию 0
}
```

## REST API эндпоинты

### 1. Управление буферами

#### Получить все буферы
```http
GET /api/buffers
```

**Ответ:**
```typescript
BufferResponse[]
```

**Пример ответа:**
```json
[
  {
    "bufferId": 1,
    "bufferName": "Буфер линии 1",
    "description": "Основной буфер",
    "location": "Цех 1, участок А",
    "cellsCount": 12,
    "stagesCount": 3
  }
]
```

---

#### Получить буфер по ID
```http
GET /api/buffers/{id}
```

**Параметры:**
- `id` (number) - ID буфера

**Ответ:**
```typescript
BufferDetailResponse
```

**Коды статусов:**
- `200` - Успешно
- `404` - Буфер не найден

---

#### Создать буфер
```http
POST /api/buffers
```

**Тело запроса:**
```typescript
CreateBufferDto
```

**Пример запроса:**
```json
{
  "bufferName": "Новый буфер",
  "description": "Описание буфера",
  "location": "Цех 2",
  "cells": [
    {
      "cellCode": "A01",
      "capacity": 100,
      "status": "AVAILABLE"
    }
  ],
  "stageIds": [1, 2, 3]
}
```

**Ответ:**
```typescript
BufferDetailResponse
```

**Коды статусов:**
- `201` - Создано
- `400` - Некорректные данные

---

#### Обновить буфер
```http
PUT /api/buffers/{id}
```

**Параметры:**
- `id` (number) - ID буфера

**Тело запроса:**
```typescript
UpdateBufferDto
```

**Ответ:**
```typescript
BufferDetailResponse
```

**Коды статусов:**
- `200` - Обновлено
- `404` - Буфер не найден
- `400` - Некорректные данные

---

#### Удалить буфер
```http
DELETE /api/buffers/{id}
```

**Параметры:**
- `id` (number) - ID буфера

**Ответ:**
```json
{ "message": "Буфер успешно удален" }
```

**Коды статусов:**
- `200` - Удалено
- `404` - Буфер не найден
- `400` - Буфер используется и не может быть удален

---

#### Скопировать буфер
```http
POST /api/buffers/{id}/copy
```

**Параметры:**
- `id` (number) - ID исходного буфера

**Тело запроса:**
```typescript
interface CopyBufferDto {
  newBufferName: string;
  newLocation?: string;
  copyCells?: boolean;     // по умолчанию true
  copyStages?: boolean;    // по умолчанию true
}
```

**Ответ:**
```typescript
BufferDetailResponse
```

---

#### Получить статистику буферов
```http
GET /api/buffers/statistics
```

**Ответ:**
```typescript
interface BuffersStatistics {
  buffers: number;
  bufferCells: number;
  bufferStageConnections: number;
  occupiedCells: number;
  reservedCells: number;
  availableCells: number;
  pickerTasks: number;
}
```

### 2. Управление ячейками буфера

#### Получить ячейки буфера
```http
GET /api/buffers/{id}/cells
```

**Ответ:**
```typescript
BufferCellResponse[]
```

---

#### Создать ячейку буфера
```http
POST /api/buffers/{id}/cells
```

**Тело запроса:**
```typescript
CreateBufferCellDto
```

**Ответ:**
```typescript
BufferCellResponse
```

---

#### Обновить ячейку буфера
```http
PUT /api/buffers/cells/{cellId}
```

**Параметры:**
- `cellId` (number) - ID ячейки

**Тело запроса:**
```typescript
UpdateBufferCellDto
```

**Ответ:**
```typescript
BufferCellResponse
```

---

#### Удалить ячейку буфера
```http
DELETE /api/buffers/cells/{cellId}
```

**Ответ:**
```json
{ "message": "Ячейка буфера успешно удалена" }
```

---

#### Получить статистику ячеек буфера
```http
GET /api/buffers/{id}/cells/statistics
```

**Ответ:**
```typescript
interface BufferCellsStatistics {
  bufferId: number;
  bufferName: string;
  totalCells: number;
  availableCells: number;
  occupiedCells: number;
  reservedCells: number;
  totalCapacity: number;
  totalCurrentLoad: number;
  utilizationPercentage: number;
}
```

### 3. Управление связями с этапами

#### Получить связи буфера с этапами
```http
GET /api/buffers/{id}/stages
```

**Ответ:**
```typescript
BufferStageResponse[]
```

---

#### Добавить связь с этапом
```http
POST /api/buffers/{id}/stages
```

**Тело запроса:**
```typescript
interface CreateBufferStageDto {
  stageId: number;
}
```

**Ответ:**
```typescript
BufferStageResponse
```

---

#### Обновить связи с этапами
```http
PUT /api/buffers/{id}/stages
```

**Тело запроса:**
```typescript
interface UpdateBufferStagesDto {
  stageIds: number[];
}
```

**Ответ:**
```typescript
BufferStageResponse[]
```

---

#### Удалить связь с этапом
```http
DELETE /api/buffers/stages/{bufferStageId}
```

**Ответ:**
```json
{ "message": "Связь буфера с этапом успешно удалена" }
```

### 4. Дополнительные эндпоинты

#### Получить доступные этапы
```http
GET /api/buffers/stages/available
```

**Ответ:**
```typescript
interface AvailableStage {
  stageId: number;
  stageName: string;
  description: string | null;
  _count: {
    bufferStages: number;
  };
}[]
```

---

#### Получить этапы с информацией о буферах
```http
GET /api/buffers/stages/with-buffers
```

**Ответ:**
```typescript
interface StagesWithBuffersResponse {
  stageId: number;
  stageName: string;
  description: string | null;
  buffersCount: number;
  buffers: {
    bufferId: number;
    bufferName: string;
    location: string;
  }[];
}[]
```

## WebSocket события

### Подключение к комнате
Для получения событий буферов подключитесь к комнате `'buffers'`:

```typescript
socket.join('buffers');
```

### События буферов

#### bufferCreated
Событие создания нового буфера.

```typescript
socket.on('bufferCreated', (data) => {
  // data: {
  //   buffer: BufferDetailResponse;
  //   timestamp: string;
  // }
});
```

#### bufferUpdated
Событие обновления буфера.

```typescript
socket.on('bufferUpdated', (data) => {
  // data: {
  //   buffer: BufferDetailResponse;
  //   changes: {
  //     name: boolean;
  //     location: boolean;
  //   };
  //   timestamp: string;
  // }
});
```

#### bufferDeleted
Событие удаления буфера.

```typescript
socket.on('bufferDeleted', (data) => {
  // data: {
  //   bufferId: number;
  //   bufferName: string;
  //   timestamp: string;
  // }
});
```

#### bufferCopied
Событие копирования буфера.

```typescript
socket.on('bufferCopied', (data) => {
  // data: {
  //   originalBuffer: BufferDetailResponse;
  //   copiedBuffer: BufferDetailResponse;
  //   copyOptions: {
  //     copyCells: boolean;
  //     copyStages: boolean;
  //   };
  //   timestamp: string;
  // }
});
```

### События ячеек буфера

#### bufferCellCreated
Событие создания ячейки буфера.

```typescript
socket.on('bufferCellCreated', (data) => {
  // data: {
  //   bufferId: number;
  //   bufferName: string;
  //   bufferCell: BufferCellResponse;
  //   timestamp: string;
  // }
});
```

#### bufferCellUpdated
Событие обновления ячейки буфера.

```typescript
socket.on('bufferCellUpdated', (data) => {
  // data: {
  //   bufferId: number;
  //   bufferName: string;
  //   bufferCell: BufferCellResponse;
  //   changes: {
  //     cellCode: boolean;
  //     status: boolean;
  //   };
  //   timestamp: string;
  // }
});
```

#### bufferCellDeleted
Событие удаления ячейки буфера.

```typescript
socket.on('bufferCellDeleted', (data) => {
  // data: {
  //   cellId: number;
  //   bufferId: number;
  //   bufferName: string;
  //   cellCode: string;
  //   timestamp: string;
  // }
});
```

### События связей с этапами

#### bufferStageCreated
Событие создания связи буфера с этапом.

```typescript
socket.on('bufferStageCreated', (data) => {
  // data: {
  //   bufferId: number;
  //   bufferName: string;
  //   bufferStage: BufferStageResponse;
  //   timestamp: string;
  // }
});
```

#### bufferStagesUpdated
Событие обновления связей буфера с этапами.

```typescript
socket.on('bufferStagesUpdated', (data) => {
  // data: {
  //   bufferId: number;
  //   bufferName: string;
  //   bufferStages: BufferStageResponse[];
  //   timestamp: string;
  // }
});
```

#### bufferStageDeleted
Событие удаления связи буфера с этапом.

```typescript
socket.on('bufferStageDeleted', (data) => {
  // data: {
  //   bufferStageId: number;
  //   bufferId: number;
  //   bufferName: string;
  //   stageId: number;
  //   stageName: string;
  //   timestamp: string;
  // }
});
```

## Примеры использования

### Создание буфера с ячейками и этапами

```javascript
// 1. Создать буфер
const createBuffer = async () => {
  const response = await fetch('/api/buffers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bufferName: 'Буфер производственной линии А',
      description: 'Основной буфер для хранения заготовок',
      location: 'Цех 1, участок А',
      cells: [
        {
          cellCode: 'A01',
          capacity: 100,
          status: 'AVAILABLE'
        },
        {
          cellCode: 'A02', 
          capacity: 150,
          status: 'AVAILABLE'
        }
      ],
      stageIds: [1, 2, 3]
    })
  });
  
  return await response.json();
};
```

### Обновление статуса ячейки

```javascript
// Обновить статус ячейки на занято
const updateCellStatus = async (cellId, status) => {
  const response = await fetch(`/api/buffers/cells/${cellId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: status
    })
  });
  
  return await response.json();
};
```

### Подписка на события WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000');

// Присоединиться к комнате буферов
socket.emit('joinRoom', 'buffers');

// Слушать события
socket.on('bufferCreated', (data) => {
  console.log('Создан новый буфер:', data.buffer);
  // Обновить список буферов в UI
});

socket.on('bufferCellUpdated', (data) => {
  console.log('Обновлена ячейка:', data.bufferCell);
  // Обновить статус ячейки в UI
});

socket.on('bufferDeleted', (data) => {
  console.log('Удален буфер:', data.bufferName);
  // Удалить буфер из UI
});
```

### Получение статистики

```javascript
// Получить общую статистику буферов
const getBuffersStatistics = async () => {
  const response = await fetch('/api/buffers/statistics');
  return await response.json();
};

// Получить статистику конкретного буфера
const getBufferCellsStatistics = async (bufferId) => {
  const response = await fetch(`/api/buffers/${bufferId}/cells/statistics`);
  return await response.json();
};
```

## Обработка ошибок

### Коды статусов HTTP
- `200` - Успешная операция
- `201` - Ресурс создан
- `400` - Некорректные данные запроса
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

### Структура ошибки
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

### Пример обработки ошибок

```javascript
const createBuffer = async (bufferData) => {
  try {
    const response = await fetch('/api/buffers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bufferData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании буфера:', error.message);
    throw error;
  }
};
```

## Валидация данных

### Правила валидации

#### Буферы
- `bufferName`: строка, максимум 100 символов, обязательно
- `description`: строка, максимум 500 символов, опционально
- `location`: строка, максимум 200 символов, обязательно

#### Ячейки
- `cellCode`: строка, максимум 20 символов, обязательно, уникально в рамках буфера
- `capacity`: число, >= 0, обязательно
- `currentLoad`: число, >= 0, опционально
- `status`: enum CellStatus, опционально

#### Этапы
- `stageId`: число, должен существовать в системе

### Пример валидации на фронтенде

```javascript
const validateBufferData = (data) => {
  const errors = [];
  
  if (!data.bufferName || data.bufferName.length > 100) {
    errors.push('Название буфера обязательно и не должно превышать 100 символов');
  }
  
  if (!data.location || data.location.length > 200) {
    errors.push('Местоположение обязательно и не должно превышать 200 символов');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('Описание не должно превышать 500 символов');
  }
  
  return errors;
};
```
