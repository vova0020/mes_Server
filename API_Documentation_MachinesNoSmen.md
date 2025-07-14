# API Документация - Станки без сменного задания

## Базовый URL
```
/machines-no-smen
```

## Описание
API для работы со станками без сменного задания. Эти станки могут самостоятельно выбирать и назначать себе поддоны для обработки, аналогично функционалу мастера.

---

## 1. Получить доступные поддоны для станка

### Эндпоинт
```http
GET /machines-no-smen/available-pallets:{detailId}/{stageid}
```

### Описание
Получает список всех поддонов для указанной детали и этапа производства. Станок может выбрать любой из доступных поддонов для работы.

### Параметры URL
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `detailId` | number | Да | ID детали (partId) |
| `stageid` | number | Да | ID этапа производства (stageId) |

### Пример запроса
```http
GET /machines-no-smen/available-pallets:123/456
```

### Ответ
**Статус:** 200 OK

**Тип:** `PalletsResponseDto`

```json
{
  "pallets": [
    {
      "id": 1,
      "name": "Поддон-001",
      "quantity": 50,
      "detailId": 123,
      "bufferCell": {
        "id": 10,
        "code": "BUF-A-01",
        "bufferId": 5,
        "bufferName": "Буфер А"
      },
      "machine": null,
      "currentOperation": {
        "id": 100,
        "status": "NOT_PROCESSED",
        "startedAt": "2024-01-15T10:00:00Z",
        "processStep": {
          "id": 456,
          "name": "Фрезерование",
          "sequence": 1
        }
      }
    }
  ],
  "total": 1
}
```

### Возможные ошибки
- **404 Not Found** - Деталь или этап не найден
- **400 Bad Request** - Некорректные параметры
- **500 Internal Server Error** - Внутренняя ошибка сервера

---

## 2. Взять поддон в работу

### Эндпоинт
```http
POST /machines-no-smen/take-to-work
```

### Описание
Станок назначает себе выбранный поддон и создает сменное задание. Поддон переходит в статус "В работе".

### Тело запроса
**Тип:** `StartPalletProcessingDto`

```json
{
  "palletId": 1,
  "machineId": 5,
  "operatorId": 10
}
```

### Параметры тела запроса
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `palletId` | number | Да | ID поддона |
| `machineId` | number | Да | ID станка |
| `operatorId` | number | Нет | ID оператора (опционально) |

### Пример запроса
```http
POST /machines-no-smen/take-to-work
Content-Type: application/json

{
  "palletId": 1,
  "machineId": 5,
  "operatorId": 10
}
```

### Ответ
**Статус:** 200 OK

```json
{
  "message": "Поддон успешно взят в работу",
  "assignment": {
    "assignmentId": 200,
    "machineId": 5,
    "palletId": 1,
    "assignedAt": "2024-01-15T10:30:00Z",
    "machine": {
      "machineId": 5,
      "machineName": "Станок-005",
      "status": "ACTIVE"
    },
    "pallet": {
      "palletId": 1,
      "palletName": "Поддон-001",
      "partId": 123,
      "part": {
        "partId": 123,
        "partName": "Деталь-123"
      }
    }
  },
  "operation": {
    "id": 100,
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T10:30:00Z",
    "processStep": {
      "id": 456,
      "name": "Фрезерование"
    }
  }
}
```

### Возможные ошибки
- **404 Not Found** - Поддон или станок не найден
- **400 Bad Request** - Поддон уже занят, станок не готов к работе, или станок не может выполнять данный этап
- **500 Internal Server Error** - Внутренняя ошибка сервера

---

## 3. Завершить обработку поддона

### Эндпоинт
```http
POST /machines-no-smen/complete-processing
```

### Описание
Завершает обработку поддона на станке. Обновляет статус операции на "Завершено" и при необходимости создает следующий этап обработки.

### Тело запроса
**Тип:** `CompletePalletProcessingDto`

```json
{
  "palletId": 1,
  "machineId": 5,
  "operatorId": 10
}
```

### Параметры тела запроса
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `palletId` | number | Да | ID поддона |
| `machineId` | number | Да | ID станка |
| `operatorId` | number | Нет | ID оператора, завершающего обработку |

### Пример запроса
```http
POST /machines-no-smen/complete-processing
Content-Type: application/json

{
  "palletId": 1,
  "machineId": 5,
  "operatorId": 10
}
```

### Ответ
**Статус:** 200 OK

```json
{
  "message": "Обработка поддона завершена",
  "assignment": {
    "assignmentId": 200,
    "machineId": 5,
    "palletId": 1,
    "assignedAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T12:00:00Z",
    "machine": {
      "machineId": 5,
      "machineName": "Станок-005",
      "status": "ACTIVE"
    },
    "pallet": {
      "palletId": 1,
      "palletName": "Поддон-001",
      "partId": 123,
      "part": {
        "partId": 123,
        "partName": "Деталь-123"
      }
    }
  },
  "nextStage": "Установлен следующий этап: Сверление"
}
```

### Возможные ошибки
- **404 Not Found** - Активное назначение не найдено
- **400 Bad Request** - Не найден активный прогресс этапа
- **500 Internal Server Error** - Внутренняя ошибка сервера

---

## 4. Переместить поддон в буфер

### Эндпоинт
```http
POST /machines-no-smen/move-to-buffer
```

### Описание
Перемещает поддон в указанную ячейку буфера. Обновляет статус ячейки и освобождает предыдущее местоположение.

### Тело запроса
**Тип:** `MovePalletToBufferDto`

```json
{
  "palletId": 1,
  "bufferCellId": 15
}
```

### Параметры тела запроса
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `palletId` | number | Да | ID поддона |
| `bufferCellId` | number | Да | ID ячейки буфера |

### Пример запроса
```http
POST /machines-no-smen/move-to-buffer
Content-Type: application/json

{
  "palletId": 1,
  "bufferCellId": 15
}
```

### Ответ
**Ста��ус:** 200 OK

```json
{
  "message": "Поддон успешно перемещен в буфер",
  "pallet": {
    "palletId": 1,
    "palletName": "Поддон-001",
    "partId": 123,
    "quantity": 50
  }
}
```

### Возможные ошибки
- **404 Not Found** - Поддон или ячейка буфера не найдена
- **400 Bad Request** - Ячейка буфера недоступна или заполнена до максимальной вместимости
- **500 Internal Server Error** - Внутренняя ошибка сервера

---

## Типы данных

### PalletDto
```typescript
interface PalletDto {
  id: number;                    // ID поддона
  name: string;                  // Название поддона
  quantity: number;              // Количество деталей
  detailId: number;              // ID детали
  bufferCell: BufferCellDto | null;  // Информация о ячейке буфера
  machine: MachineDto | null;    // Информация о станке
  currentOperation: CurrentOperationDto | null;  // Текущая операция
}
```

### BufferCellDto
```typescript
interface BufferCellDto {
  id: number;                    // ID ячейки
  code: string;                  // Код ячейки
  bufferId: number;              // ID буфера
  bufferName?: string;           // Название буфера
}
```

### MachineDto
```typescript
interface MachineDto {
  id: number;                    // ID станка
  name: string;                  // Название станка
  status: string;                // Статус станка (ACTIVE, INACTIVE, etc.)
}
```

### CurrentOperationDto
```typescript
interface CurrentOperationDto {
  id: number;                    // ID операции
  status: TaskStatus;            // Статус операции
  startedAt: Date;               // Время начала
  completedAt?: Date;            // Время завершения (опционально)
  processStep: {
    id: number;                  // ID этапа
    name: string;                // Название этапа
    sequence: number;            // Порядковый номер
  };
}
```

### TaskStatus (enum)
```typescript
enum TaskStatus {
  NOT_PROCESSED = "NOT_PROCESSED",    // Не обработано
  PENDING = "PENDING",                // Ожидает
  IN_PROGRESS = "IN_PROGRESS",        // В работе
  COMPLETED = "COMPLETED"             // Завершено
}
```

---

## WebSocket События

API также отправляет WebSocket события для уведомления о изменениях:

### Событие: startWork
Отправляется при взятии поддона в работу.

**Канал:** `palets`

**Данные:**
```json
{
  "assignmentId": 200,
  "machineId": 5,
  "palletId": 1,
  "assignedAt": "2024-01-15T10:30:00Z",
  "machine": {
    "machineId": 5,
    "machineName": "Станок-005",
    "status": "ACTIVE"
  },
  "pallet": {
    "palletId": 1,
    "palletName": "Поддон-001",
    "partId": 123,
    "part": {
      "partId": 123,
      "partName": "Деталь-123"
    }
  }
}
```

---

## Примеры использования

### 1. Получение списка поддонов и взятие в работу
```javascript
// 1. Получаем доступные поддоны
const response = await fetch('/machines-no-smen/available-pallets:123/456');
const data = await response.json();

// 2. Выбираем первый доступный поддон
const pallet = data.pallets[0];

// 3. Берем поддон в работу
const takeToWorkResponse = await fetch('/machines-no-smen/take-to-work', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    palletId: pallet.id,
    machineId: 5,
    operatorId: 10
  })
});

const workResult = await takeToWorkResponse.json();
console.log('Поддон взят в работу:', workResult);
```

### 2. Завершение обработки и перемещение в буфер
```javascript
// 1. Завершаем обработку
const completeResponse = await fetch('/machines-no-smen/complete-processing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    palletId: 1,
    machineId: 5,
    operatorId: 10
  })
});

const completeResult = await completeResponse.json();

// 2. Перемещаем в буфер
const moveResponse = await fetch('/machines-no-smen/move-to-buffer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    palletId: 1,
    bufferCellId: 15
  })
});

const moveResult = await moveResponse.json();
console.log('Поддон перемещен в буфер:', moveResult);
```

---

## Особенности работы

1. **Автономность станков**: Станки без сменного задания могут самостоятельно выбирать поддоны для обработки без участия мастера.

2. **Проверка совместимости**: Система автоматически проверяет, может ли станок выполнять требуемый этап обработки.

3. **Управление буферами**: При перемещении поддонов автоматически обновляется статус ячеек буфера и их загрузка.

4. **Создание задач упаковки**: При завершении всех этапов обработки автоматически создаются задачи упаковки.

5. **WebSocket уведомления**: Все изменения статусов отправляются через WebSocket для обновления интерфейса в реальном времени.