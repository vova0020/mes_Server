
# Документация API модуля станков без смен

## Базовый URL
```
/machines-no-shifts
```

## Доступные эндпоинты

### 1. Получение информации о станке

**Описание:** Возвращает подробную информацию о станке по его идентификатору.

**URL:** `GET /machines-no-shifts/{id}`

**Параметры запроса:**
- `id` (path) - ID станка (число)

**Пример запроса:**
```
GET /machines-no-shifts/1
```

**Ответ:**
```json
{
  "id": 1,
  "name": "Станок A1",
  "status": "ACTIVE", // Возможные значения: "ACTIVE", "INACTIVE", "MAINTENANCE", "BROKEN"
  "recommendedLoad": 100,
  "noShiftAssignment": false,
  "segmentId": 2,
  "segmentName": "Участок резки"
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Станок с указанным ID не найден

### 2. Изменение статуса станка

**Описание:** Изменяет статус станка на новый и возвращает обновленную информацию о станке.

**URL:** `PATCH /machines-no-shifts/status`

**Тело запроса:**
```json
{
  "machineId": 1,
  "status": "MAINTENANCE" // Возможные значения: "ACTIVE", "INACTIVE", "MAINTENANCE", "BROKEN"
}
```

**Пример запроса:**
```
PATCH /machines-no-shifts/status
Content-Type: application/json

{
  "machineId": 1,
  "status": "MAINTENANCE"
}
```

**Ответ:**
```json
{
  "id": 1,
  "name": "Станок A1",
  "status": "MAINTENANCE",
  "recommendedLoad": 100,
  "noShiftAssignment": false,
  "segmentId": 2,
  "segmentName": "Участок резки"
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно, статус станка обновлен
- `404 Not Found` - Станок с указанным ID не найден
- `400 Bad Request` - Некорректный формат данных (например, неверный статус)

### 3. Получение заказов для участка

**Описание:** Возвращает все заказы, которые требуют обработки на конкретном производственном участке.

**URL:** `GET /machines-no-shifts/segment/orders`

**Параметры запроса:**
- `segmentId` (query) - ID производственного участка (число)

**Пример запроса:**
```
GET /machines-no-shifts/segment/orders?segmentId=1
```

**Ответ:**
```json
{
  "orders": [
    {
      "id": 1,
      "runNumber": "RUN-2023-001",
      "name": "Комплект кухонной мебели",
      "progress": 45.5
    },
    // ... другие заказы
  ]
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Производственный участок с указанным ID не найден

### 4. Получение деталей для конкретного заказа и участка

**Описание:** Возвращает все детали для выбранного заказа, которые требуют обработки на конкретном производственном участке.

**URL:** `GET /machines-no-shifts/order/details`

**Параметры запроса:**
- `orderId` (query) - ID заказа (число)
- `segmentId` (query) - ID производственного участка (число)

**Пример запроса:**
```
GET /machines-no-shifts/order/details?orderId=1&segmentId=1
```

**Ответ:**
```json
{
  "details": [
    {
      "id": 1,
      "article": "ART-123",
      "name": "Столешница",
      "material": "Дуб",
      "size": "120x80x3",
      "totalNumber": 10,
      "isCompletedForSegment": false,
      "readyForProcessing": 5,
      "completed": 2
    },
    // ... другие детали
  ]
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Заказ или производственный участок с указанным ID не найден

### 5. Получение поддонов для детали

**Описание:** Возвращает все поддоны, связанные с конкретной деталью, включая информацию о маршруте обработки.

**URL:** `GET /machines-no-shifts/detail/pallets`

**Параметры запроса:**
- `detailId` (query) - ID детали (число)
- `segmentId` (query) - ID производственного участка (число)

**Пример запроса:**
```
GET /machines-no-shifts/detail/pallets?detailId=1&segmentId=1
```

**Ответ:**
```json
{
  "pallets": [
    {
      "id": 1,
      "name": "ПОД-001",
      "quantity": 5,
      "detail": {
        "id": 1,
        "article": "ART-123",
        "name": "Столешница",
        "material": "Дуб",
        "size": "120x80x3",
        "totalNumber": 10,
        "isCompletedForSegment": false,
        "readyForProcessing": 5,
        "completed": 2
      },
      "currentStepId": 2,
      "currentStepName": "Резка",
      "bufferCell": {
        "id": 1,
        "code": "A1",
        "bufferId": 3,
        "bufferName": "Основной буфер"
      },
      "machine": {
        "id": 1,
        "name": "Станок №1",
        "status": "ACTIVE"
      },
      "currentOperation": {
        "id": 1,
        "status": "IN_PROGRESS",
        "completionStatus": null,
        "startedAt": "2023-06-15T10:30:00Z",
        "completedAt": null,
        "processStep": {
          "id": 2,
          "name": "Резка",
          "sequence": 1
        },
        "operator": {
          "id": 5,
          "username": "operator1",
          "fullName": "Иванов Иван"
        },
        "master": null
      },
      "processingStatus": {
        "isFirstSegmentInRoute": false,
        "hasCompletedPreviousSegments": true,
        "currentSegment": {
          "id": 1,
          "name": "Участок резки"
        },
        "nextSegment": {
          "id": 2,
          "name": "Участок кромки"
        }
      }
    },
    // ... другие поддоны
  ],
  "total": 2
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Деталь или производственный участок с указанным ID не найден

## Описание полей ответов

### Станок (Machine)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор станка |
| name | string | Название станка |
| status | string | Текущий статус станка (ACTIVE, INACTIVE, MAINTENANCE, BROKEN) |
| recommendedLoad | number | Рекомендуемая загрузка станка (количество деталей) |
| noShiftAssignment | boolean | Работает ли станок без сменного задания |
| segmentId | number | ID участка, к которому привязан станок (может быть null) |
| segmentName | string | Название участка (может быть null) |

### Заказ (Order)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор заказа |
| runNumber | string | Номер партии/прогона |
| name | string | Название заказа |
| progress | number | Процент выполнения заказа (0-100) |

### Деталь (Detail)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор детали |
| article | string | Артикул детали |
| name | string | Название детали |
| material | string | Материал изготовления |
| size | string | Размер детали |
| totalNumber | number | Общее количество деталей |
| isCompletedForSegment | boolean | Завершена ли обработка детали для данного участка |
| readyForProcessing | number | Количество деталей, готовых к обработке на данном участке |
| completed | number | Количество завершенных деталей на данном участке |

### Поддон (Pallet)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор поддона |
| name | string | Название/номер поддона |
| quantity | number | Количество деталей на этом поддоне |
| detail | Detail | Информация о детали на поддоне |
| currentStepId | number | ID текущего этапа обработки (может быть null) |
| currentStepName | string | Название текущего этапа обработки (может быть null) |
| bufferCell | BufferCell | Информация о ячейке буфера, где находится поддон (может быть null) |
| machine | MachineInfo | Информация о станке, на котором обрабатывается поддон (может быть null) |
| currentOperation | OperationInfo | Информация о текущей операции над поддоном (может быть null) |
| processingStatus | ProcessingStatus | Информация о прохождении поддоном маршрута обработки |

### Ячейка буфера (BufferCell)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор ячейки |
| code | string | Код ячейки буфера (например, A1) |
| bufferId | number | ID буфера |
| bufferName | string | Название буфера |

### Информация о станке (MachineInfo)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор станка |
| name | string | Название станка |
| status | string | Текущий статус станка |

### Информация об операции (OperationInfo)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор операции |
| status | string | Статус операции (IN_PROGRESS, COMPLETED, ON_MACHINE, BUFFERED) |
| completionStatus | string | Детальный статус выполнения (может быть null) |
| startedAt | string (date) | Дата и время начала операции |
| completedAt | string (date) | Дата и время завершения операции (может быть null) |
| processStep | ProcessStepInfo | Информация об этапе обработки (может быть null) |
| operator | UserInfo | Информация об операторе (может быть null) |
| master | UserInfo | Информация о мастере (может быть null) |

### Информация об этапе процесса (ProcessStepInfo)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор этапа процесса |
| name | string | Название этапа процесса |
| sequence | number | Порядковый номер этапа |

### Информация о пользователе (UserInfo)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор пользователя |
| username | string | Имя пользователя |
| fullName | string | Полное имя пользователя (может быть null) |

### Информация о прохождении маршрута (ProcessingStatus)
| Поле | Тип | Описание |
|------|-----|----------|
| isFirstSegmentInRoute | boolean | Является ли текущий участок первым в маршруте |
| hasCompletedPreviousSegments | boolean | Прошел ли поддон все предыдущие участки |
| currentSegment | SegmentInfo | Информация о текущем участке |
| nextSegment | SegmentInfo | Информация о следующем участке (может быть null) |

### Информация об участке (SegmentInfo)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор участка |
| name | string | Название участка |
