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

### 3. Получение заказов и деталей для участка

**Описание:** Возвращает все заказы и детали, которые требуют обработки на конкретном производственном участке. Возвращаются только те детали, которые должны пройти участок (технологический этап), связанный с участком.

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
  ],
  "details": [
    {
      "id": 1,
      "article": "ART-123",
      "name": "Столешница",
      "material": "Дуб",
      "size": "120x80x3",
      "totalNumber": 10,
      "isCompletedForSegment": false
    },
    // ... другие детали
  ]
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Производственный участок с указанным ID не найден

### 4. Получение поддонов для детали

**Описание:** Возвращает все поддоны, связанные с конкретной деталью.

**URL:** `GET /machines-no-shifts/detail/pallets`

**Параметры запроса:**
- `detailId` (query) - ID детали (число)

**Пример запроса:**
```
GET /machines-no-shifts/detail/pallets?detailId=1
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
        "isCompletedForSegment": false
      },
      "currentStepId": 2,
      "currentStepName": "Резка",
      "bufferCell": {
        "id": 1,
        "code": "A1",
        "bufferName": "Основной буфер"
      }
    },
    // ... другие поддоны
  ]
}
```

**Коды ответов:**
- `200 OK` - Запрос выполнен успешно
- `404 Not Found` - Деталь с указанным ID не найдена

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
| id | number | Уникальный и��ентификатор заказа |
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

### Ячейка буфера (BufferCell)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор ячейки |
| code | string | Код ячейки буфера (например, A1) |
| bufferName | string | Название буфера |