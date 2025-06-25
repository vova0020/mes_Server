# Модуль упаковки (Packaging Module)

Этот модуль предоставляет API для работы с упаковками, деталями и поддонами в системе MES.

## Контроллеры

### PackagePartsController (`/packaging/parts`)

Контроллер для работы с деталями в упаковках.

#### Эндпоинты:

- `GET /packaging/parts/by-package/:packageId` - Получение всех деталей упаковки
- `GET /packaging/parts/by-package/:packageId/part/:partId` - Получение конкретной детали из упаковки
- `GET /packaging/parts/statistics/:packageId` - Получение статистики по деталям упаковки

### PartPalletsController (`/packaging/pallets`)

Контроллер для работы с поддонами деталей.

#### Эндпоинты:

- `GET /packaging/pallets/by-part/:partId` - Получени�� всех поддонов детали
- `GET /packaging/pallets/by-part/:partId/pallet/:palletId` - Получение конкретного поддона детали
- `GET /packaging/pallets/statistics/:partId` - Получение статистики по поддонам детали

## API для поддонов

### Получение поддонов по ID детали

```http
GET /packaging/pallets/by-part/{partId}
```

#### Параметры запроса:
- `page` (optional) - Номер страницы (по умолчанию: 1)
- `limit` (optional) - Количество элементов на странице (по умолчанию: 10)
- `palletName` (optional) - Фильтр по названию поддона
- `onlyInCells` (optional) - Показать только поддоны, находящиеся в ячейках

#### Пример ответа:
```json
{
  "partInfo": {
    "partId": 1,
    "partCode": "PART001",
    "partName": "Деталь 1",
    "status": "IN_PROGRESS",
    "totalQuantity": 100,
    "isSubassembly": false,
    "readyForMainFlow": true,
    "size": "100x50x25",
    "material": {
      "materialId": 1,
      "materialName": "Сталь A36",
      "article": "ST-A36-001",
      "unit": "кг"
    },
    "route": {
      "routeId": 1,
      "routeName": "Основной маршрут"
    }
  },
  "palletsCount": 3,
  "pallets": [
    {
      "palletId": 1,
      "palletName": "PALLET001",
      "currentCell": {
        "cellId": 1,
        "cellCode": "A1-01",
        "status": "OCCUPIED",
        "capacity": 10,
        "currentLoad": 5,
        "buffer": {
          "bufferId": 1,
          "bufferName": "Буфер входящих",
          "location": "Зона A"
        }
      },
      "placedAt": "2024-01-15T10:30:00Z",
      "machineAssignments": [
        {
          "assignmentId": 1,
          "machineId": 1,
          "machineName": "Станок CNC-001",
          "assignedAt": "2024-01-15T09:00:00Z",
          "completedAt": "2024-01-15T10:00:00Z"
        }
      ],
      "stageProgress": [
        {
          "routeStageId": 1,
          "stageName": "Обработка",
          "status": "COMPLETED",
          "completedAt": "2024-01-15T10:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

### Получение конкретного поддона

```http
GET /packaging/pallets/by-part/{partId}/pallet/{palletId}
```

#### Пример ответа:
```json
{
  "palletId": 1,
  "palletName": "PALLET001",
  "currentCell": {
    "cellId": 1,
    "cellCode": "A1-01",
    "status": "OCCUPIED",
    "capacity": 10,
    "currentLoad": 5,
    "buffer": {
      "bufferId": 1,
      "bufferName": "Буфер входящих",
      "location": "Зона A"
    }
  },
  "placedAt": "2024-01-15T10:30:00Z",
  "machineAssignments": [...],
  "stageProgress": [...]
}
```

### Получение статистики по поддонам

```http
GET /packaging/pallets/statistics/{partId}
```

#### Пример ответа:
```json
{
  "totalPallets": 5,
  "palletsInCells": 3,
  "palletsNotInCells": 2,
  "stageProgressByStatus": {
    "PENDING": 2,
    "IN_PROGRESS": 1,
    "COMPLETED": 2
  }
}
```

## Особенности реализации

### Информация о текущей ячейке поддона

Система отслеживает текущее местоположение поддона через таблицу `pallets_buffer_cells`. Поддон считается находящимся в ячейке, если:
- Есть запись в `pallets_buffer_cells` с `removedAt = null`
- Берется последняя запись по времени размещения (`placedAt`)

### Фильтрация

- `palletName` - поиск по названию поддона (регистронезависимый, частичное совпадение)
- `onlyInCells` - показывает только поддоны, которые сейчас находятся в ячейках буферов

### Пагинация

Все эндпоинты поддерживают пагинацию через параметры `page` и `limit`.

## Связанные модели

- `Part` - деталь
- `Pallet` - поддон
- `BufferCell` - ячейка буфера
- `Buffer` - буфер
- `PalletBufferCell` - размещение поддона в ячейке
- `MachineAssignment` - назначение станка для поддона
- `PalletStageProgress` - прогресс поддона по этапам маршрута