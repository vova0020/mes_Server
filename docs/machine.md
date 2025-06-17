
# API Документация: Модуль Станки

## Базовая информация
> **Базовый URL:** `http://localhost:3000` (или ваш сервер)
**Base URL:** `/machines`  
**Модуль:** Settings  
**Контроллер:** MachinesController  
**Сервис:** MachinesService

## WebSocket соединения

### Подключение к комнате "machines"
```javascript
// Подключение к WebSocket
const socket = io('ws://your-server-url');

// Присоединение к комнате станков
socket.emit('joinMachinesRoom');
```

### WebSocket события
| Событие | Описание | Данные |
|---------|----------|--------|
| `machineCreated` | Создан новый станок | `{ machine: MachineResponse, message: string }` |
| `machineUpdated` | Обновлен станок | `{ machine: MachineResponse, message: string }` |
| `machineDeleted` | Удален станок | `{ machineId: number, message: string }` |
| `machineStageAdded` | Добавлена связь с этапом | `{ machineId: number, stageId: number, result: object, message: string }` |
| `machineStageRemoved` | Удалена связь с этапом | `{ machineId: number, stageId: number, message: string }` |
| `machineSubstageAdded` | Добавлена связь с подэтапом | `{ machineId: number, substageId: number, result: object, message: string }` |
| `machineSubstageRemoved` | Удалена связь с подэтапом | `{ machineId: number, substageId: number, message: string }` |

---

## Типы данных

### MachineStatus
```typescript
enum MachineStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE", 
  MAINTENANCE = "MAINTENANCE"
}
```

### CreateMachineDto
```typescript
{
  machineName: string;        // Название станка (обязательное)
  status: MachineStatus;      // Статус станка (обязательное)
  recommendedLoad: number;    // Рекомендуемая нагрузка (положительное число)
  loadUnit: string;           // Единица измерения нагрузки (обязательное)
  isTaskChangeable: boolean;  // Возможность изменения задач (обязательное)
}
```

### UpdateMachineDto
```typescript
{
  machineName?: string;        // Название станка (опционально)
  status?: MachineStatus;      // Статус станка (опционально)
  recommendedLoad?: number;    // Рекомендуемая нагрузка (опционально)
  loadUnit?: string;           // Единица измерения нагрузки (опционально)
  isTaskChangeable?: boolean;  // Возможность изменения задач (опционально)
}
```

### MachineResponse
```typescript
{
  machineId: number;
  machineName: string;
  status: MachineStatus;
  recommendedLoad: number;
  loadUnit: string;
  isTaskChangeable: boolean;
  machinesStages?: MachineStageResponse[];
  machineSubstages?: MachineSubstageResponse[];
}
```

### MachineStageDto
```typescript
{
  stageId: number;  // ID этапа (положительное целое число)
}
```

### MachineSubstageDto
```typescript
{
  substageId: number;  // ID подэтапа (положительное целое число)
}
```

---

## Эндпоинты

### 1. Получить все станки
**GET** `/machines`

#### Описание
Получение списка всех станков с их связями с этапами и подэтапами.

#### Параметры запроса
Нет

#### Пример запроса
```http
GET /machines
```

#### Ответ
**Код:** 200 OK
```json
[
  {
    "machineId": 1,
    "machineName": "Станок токарный №1",
    "status": "ACTIVE",
    "recommendedLoad": 85.5,
    "loadUnit": "кг",
    "isTaskChangeable": true,
    "machinesStages": [
      {
        "machineStageId": 1,
        "machineId": 1,
        "stageId": 1,
        "stage": {
          "stageId": 1,
          "stageName": "Обточка",
          "description": "Токарная обработка"
        }
      }
    ],
    "machineSubstages": [
      {
        "machineSubstageId": 1,
        "machineId": 1,
        "substageId": 1,
        "substage": {
          "substageId": 1,
          "substageName": "Черновая обточка",
          "description": "Предварительная обработка",
          "stage": {
            "stageId": 1,
            "stageName": "Обточка"
          }
        }
      }
    ]
  }
]
```

### 2. НОВЫЙ: Получить этапы с подэтапами для выпадающих списков
**GET** `/machines/available/stages-with-substages`

#### Описание
Получение всех этапов со связанными подэтапами для использования в выпадающих списках.

#### Пример запроса
```http
GET /machines/available/stages-with-substages
```

#### Ответ
**Код:** 200 OK
```json
[
  {
    "stageId": 1,
    "stageName": "Обточка",
    "description": "Токарная обработка",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "substages": [
      {
        "substageId": 1,
        "substageName": "Черновая обточка",
        "description": "Предварительная обработка",
        "allowance": 0.5
      },
      {
        "substageId": 2,
        "substageName": "Чистовая обточка", 
        "description": "Финишная обработка",
        "allowance": 0.1
      }
    ]
  }
]
```

### 3. НОВЫЙ: Получить подэтапы сгруппированные по этапам
**GET** `/machines/available/substages-grouped`

#### Описание
Получение всех подэтапов с информацией о родительских этапах (альтернативный формат).

#### Пример запроса
```http
GET /machines/available/substages-grouped
```

#### Ответ
**Код:** 200 OK
```json
[
  {
    "substageId": 1,
    "substageName": "Черновая обточка",
    "description": "Предварительная обработка",
    "allowance": 0.5,
    "parentStage": {
      "stageId": 1,
      "stageName": "Обточка"
    }
  },
  {
    "substageId": 2,
    "substageName": "Чистовая обточка",
    "description": "Финишная обработка", 
    "allowance": 0.1,
    "parentStage": {
      "stageId": 1,
      "stageName": "Обточка"
    }
  }
]
```

### 4. НОВЫЙ: Получить статистику этапов и подэтапов
**GET** `/machines/statistics/stages`

#### Описание
Получение статистики по количеству этапов, подэтапов, станков и их связей.

#### Пример запроса
```http
GET /machines/statistics/stages
```

#### Ответ
**Код:** 200 OK
```json
{
  "stages": 15,
  "substages": 47,
  "machines": 8,
  "machineStageConnections": 12,
  "machineSubstageConnections": 23
}
```

### 5. Получить доступные этапы
**GET** `/machines/available/stages`

#### Описание
Получение всех доступных этапов для привязки к станкам.

#### Пример запроса
```http
GET /machines/available/stages
```

#### Ответ
**Код:** 200 OK
```json
[
  {
    "stageId": 1,
    "stageName": "Обточка",
    "description": "Токарная обработка",
    "productionStagesLevel2": [
      {
        "substageId": 1,
        "substageName": "Черновая обточка",
        "description": "Предварительная обработка"
      }
    ]
  }
]
```

### 6. Получить доступные подэтапы для этапа
**GET** `/machines/available/substages/:stageId`

#### Описание
Получение всех доступных подэтапов для конкретного этапа.

#### Параметры URL
- `stageId` (number) - ID этапа

#### Пример запроса
```http
GET /machines/available/substages/1
```

#### Ответ
**Код:** 200 OK
```json
[
  {
    "substageId": 1,
    "substageName": "Черновая обточка",
    "description": "Предварительная обработка",
    "stage": {
      "stageId": 1,
      "stageName": "Обточка"
    }
  }
]
```

### 7. Получить станок по ID
**GET** `/machines/:id`

#### Описание
Получение конкретного станка по его ID со всеми связями.

#### Параметры URL
- `id` (number) - ID станка

#### Пример запроса
```http
GET /machines/1
```

#### Ответ
**Код:** 200 OK
```json
{
  "machineId": 1,
  "machineName": "Станок токарный №1",
  "status": "ACTIVE",
  "recommendedLoad": 85.5,
  "loadUnit": "кг",
  "isTaskChangeable": true,
  "machinesStages": [...],
  "machineSubstages": [...]
}
```

**Код:** 404 Not Found
```json
{
  "message": "Станок не найден",
  "statusCode": 404
}
```

### 8. Создать новый станок
**POST** `/machines`

#### Описание
Создание нового станка.

#### Тело запроса
```json
{
  "machineName": "Станок фрезерный №2",
  "status": "ACTIVE",
  "recommendedLoad": 95.0,
  "loadUnit": "кг",
  "isTaskChangeable": false
}
```

#### Пример запроса
```http
POST /machines
Content-Type: application/json

{
  "machineName": "Станок фрезерный №2",
  "status": "ACTIVE", 
  "recommendedLoad": 95.0,
  "loadUnit": "кг",
  "isTaskChangeable": false
}
```

#### Ответ
**Код:** 201 Created
```json
{
  "machineId": 2,
  "machineName": "Станок фрезерный №2",
  "status": "ACTIVE",
  "recommendedLoad": 95.0,
  "loadUnit": "кг",
  "isTaskChangeable": false,
  "machinesStages": [],
  "machineSubstages": []
}
```

**WebSocket событие:** `machineCreated`

### 9. Обновить станок
**PUT** `/machines/:id`

#### Описание
Обновление существующего станка.

#### Параметры URL
- `id` (number) - ID станка

#### Тело запроса
```json
{
  "machineName": "Станок токарный №1 (обновленный)",
  "status": "MAINTENANCE",
  "recommendedLoad": 90.0
}
```

#### Пример запроса
```http
PUT /machines/1
Content-Type: application/json

{
  "machineName": "Станок токарный №1 (обновленный)",
  "status": "MAINTENANCE",
  "recommendedLoad": 90.0
}
```

#### Ответ
**Код:** 200 OK
```json
{
  "machineId": 1,
  "machineName": "Станок токарный №1 (обновленный)",
  "status": "MAINTENANCE",
  "recommendedLoad": 90.0,
  "loadUnit": "кг",
  "isTaskChangeable": true,
  "machinesStages": [...],
  "machineSubstages": [...]
}
```

**Код:** 404 Not Found
```json
{
  "message": "Станок не найден",
  "statusCode": 404
}
```

**WebSocket событие:** `machineUpdated`

### 10. Удалить станок
**DELETE** `/machines/:id`

#### Описание
Удаление станка. При удалении автоматически удаляются все связи с этапами и подэтапами.

#### Параметры URL
- `id` (number) - ID станка

#### Пример запроса
```http
DELETE /machines/1
```

#### Ответ
**Код:** 200 OK
```json
{
  "message": "Станок успешно удален"
}
```

**Код:** 404 Not Found
```json
{
  "message": "Станок не найден",
  "statusCode": 404
}
```

**WebSocket событие:** `machineDeleted`

### 11. Добавить связь с этапом
**POST** `/machines/:id/stages`

#### Описание
Добавление связи между станком и этапом 1-го уровня.

#### Параметры URL
- `id` (number) - ID станка

#### Тело запроса
```json
{
  "stageId": 1
}
```

#### Пример запроса
```http
POST /machines/1/stages
Content-Type: application/json

{
  "stageId": 1
}
```

#### Ответ
**Код:** 201 Created
```json
{
  "machineStageId": 1,
  "machineId": 1,
  "stageId": 1,
  "machine": {
    "machineId": 1,
    "machineName": "Станок токарный №1"
  },
  "stage": {
    "stageId": 1,
    "stageName": "Обточка",
    "description": "Токарная обработка"
  }
}
```

**Коды ошибок:**
- 400 Bad Request - "Станок не найден", "Этап не найден", "Связь уже существует"

**WebSocket событие:** `machineStageAdded`

### 12. Удалить связь с этапом
**DELETE** `/machines/:id/stages/:stageId`

#### Описание
Удаление связи между станком и этапом 1-го уровня. При удалении также удаляются все связи с подэтапами этого этапа.

#### Параметры URL
- `id` (number) - ID станка
- `stageId` (number) - ID этапа

#### Пример запроса
```http
DELETE /machines/1/stages/1
```

#### Ответ
**Код:** 200 OK
```json
{
  "message": "Связь с этапом успешно удалена"
}
```

**Коды ошибок:**
- 400 Bad Request - "Связь между станком и этапом не найдена"

**WebSocket событие:** `machineStageRemoved`

### 13. Добавить связь с подэтапом
**POST** `/machines/:id/substages`

#### Описание
Добавление связи между станком и подэтапом 2-го уровня. **ВАЖНО:** Станок должен быть предварительно связан с родительским этапом 1-го уровня.

#### Параметры URL
- `id` (number) - ID станка

#### Тело запроса
```json
{
  "substageId": 1
}
```

#### Пример запроса
```http
POST /machines/1/substages
Content-Type: application/json

{
  "substageId": 1
}
```

#### Ответ
**Код:** 201 Created
```json
{
  "machineSubstageId": 1,
  "machineId": 1,
  "substageId": 1,
  "machine": {
    "machineId": 1,
    "machineName": "Станок токарный №1"
  },
  "substage": {
    "substageId": 1,
    "substageName": "Черновая обточка",
    "description": "Предварительная обработка",
    "stage": {
      "stageId": 1,
      "stageName": "Обточка"
    }
  }
}
```

**Коды ошибок:**
- 400 Bad Request - "Станок не найден", "Подэтап не найден", "Связь уже существует"
- 400 Bad Request - "Нельзя привязать подэтап к станку. Станок должен быть сначала связан с этапом"

**WebSocket событие:** `machineSubstageAdded`

### 14. Удалить связь с подэтапом
**DELETE** `/machines/:id/substages/:substageId`

#### Описание
Удаление связи между станком и подэтапом 2-го уровня.

#### Параметры URL
- `id` (number) - ID станка
- `substageId` (number) - ID подэтапа

#### Пример запроса
```http
DELETE /machines/1/substages/1
```

#### Ответ
**Код:** 200 OK
```json
{
  "message": "Связь с подэтапом успешно удалена"
}
```

**Коды ошибок:**
- 400 Bad Request - "Связь между станком и подэтапом не найдена"

**WebSocket событие:** `machineSubstageRemoved`

### 15. Получить этапы и подэтапы станка
**GET** `/machines/:id/stages`

#### Описание
Получение всех этапов и подэтапов для конкретного станка с информацией о доступных и подключенных подэтапах.

#### Параметры URL
- `id` (number) - ID станка

#### Пример запроса
```http
GET /machines/1/stages
```

#### Ответ
**Код:** 200 OK
```json
{
  "machine": {
    "machineId": 1,
    "machineName": "Станок токарный №1"
  },
  "stages": [
    {
      "stageId": 1,
      "stageName": "Обточка",
      "availableSubstages": [
        {
          "substageId": 1,
          "substageName": "Черновая обточка",
          "description": "Предварительная обработка"
        },
        {
          "substageId": 2,
          "substageName": "Чистовая обточка",
          "description": "Финишная обработка"
        }
      ],
      "connectedSubstages": [
        {
          "substageId": 1,
          "substageName": "Черновая обточка",
          "description": "Предварительная обработка"
        }
      ]
    }
  ]
}
```

**Коды ошибок:**
- 500 Internal Server Error - "Станок не найден"

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | OK - Запрос выполнен успешно |
| 201 | Created - Ресурс создан успешно |
| 400 | Bad Request - Неверные параметры запроса |
| 404 | Not Found - Ресурс не найден |
| 500 | Internal Server Error - Внутренняя ошибка сервера |

## Валидация данных

### Правила валидации CreateMachineDto:
- `machineName`: строка, не пустая
- `status`: должен быть одним из значений MachineStatus
- `recommendedLoad`: число, положительное
- `loadUnit`: строка, не пустая
- `isTaskChangeable`: булево значение

### Правила валидации UpdateMachineDto:
- Все поля опциональные
- Применяются те же правила валидации, что и для CreateMachineDto

### Правила валидации MachineStageDto:
- `stageId`: целое число, положительное

### Правила валидации MachineSubstageDto:
- `substageId`: целое число, положительное

## Примеры использования

### Создание станка с последующим добавлением этапов
```javascript
// 1. Создать станок
const machine = await fetch('/machines', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    machineName: "Новый станок",
    status: "ACTIVE",
    recommendedLoad: 100,
    loadUnit: "кг",
    isTaskChangeable: true
  })
});

// 2. Добавить этап
await fetch(`/machines/${machine.machineId}/stages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stageId: 1 })
});

// 3. Добавить подэтап
await fetch(`/machines/${machine.machineId}/substages`, {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ substageId: 1 })
});
```

### Подключение к WebSocket для получения уведомлений
```javascript
const socket = io('ws://localhost:3000');

// Присоединиться к комнате станков
socket.emit('joinMachinesRoom');

// Слушать события
socket.on('machineCreated', (data) => {
  console.log('Создан новый станок:', data.machine);
});

socket.on('machineUpdated', (data) => {
  console.log('Обновлен станок:', data.machine);
});

socket.on('machineDeleted', (data) => {
  console.log('Удален станок с ID:', data.machineId);
});
```
</qodoArtifact>

Я создал подробную документацию по API модуля станков, которая включает:

## 📋 Содержание документации:

1. **Базовая информация** - URL, модуль, контроллер
2. **WebSocket соединения** - как подключиться и все события
3. **Типы данных** - все DTO и интерфейсы с примерами
4. **15 эндпоинтов** с полным описанием:
   - CRUD операции для станков
   - Управление связями с этапами и подэтапами  
   - Получение доступных этапов/подэтапов
   - Статистика
   - Новые эндпоинты для выпадающих списков

## 🔧 Каждый эндпоинт содержит:
- Описание функциональности
- HTTP метод и URL
- Параметры запроса/URL
- Примеры запросов и ответов
- Коды ошибок
- WebSocket события (где применимо)

## 🌐 WebSocket функциональность:
- Подключение к комнате `machines`
- 7 типов событий в реальном времени
- Примеры кода для подключения

## ✅ Дополнительно:
- Правила валидации данных
- Коды ошибок
- Примеры использования JavaScript
- Важные замечания (например, о необходимости связи с этапом перед добавлением подэтапа)

Документация готова к использованию разработчиками фронтенда и другими членами команды!