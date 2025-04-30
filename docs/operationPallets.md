
# Справочник по API операций с поддонами

## 1. Получение информации о поддонах

### 1.1. Получение поддонов по ID детали

**Запрос:**
- **URL**: `GET /pallets/detail/:detailId`
- **Параметры пути**: 
  - `detailId` - ID детали (число)

**Ответ:**
```json
{
  "pallets": [
    {
      "id": 1,
      "name": "Поддон A1",
      "quantity": 20,
      "detailId": 1,
      "bufferCell": {
        "id": 1,
        "code": "A1",
        "bufferId": 1,
        "bufferName": "Основной буфер"
      },
      "machine": {
        "id": 1,
        "name": "Станок №1",
        "status": "ACTIVE"
      }
    }
  ],
  "total": 1
}
```

### 1.2. Получение поддона по ID

**Запрос:**
- **URL**: `GET /pallets/:id`
- **Параметры пути**: 
  - `id` - ID поддона (число)

**Ответ:**
```json
{
  "id": 1,
  "name": "Поддон A1",
  "quantity": 20,
  "detailId": 1,
  "bufferCell": {
    "id": 1,
    "code": "A1",
    "bufferId": 1,
    "bufferName": "Основной буфер"
  },
  "machine": {
    "id": 1,
    "name": "Станок №1",
    "status": "ACTIVE"
  }
}
```

## 2. Управление операциями с поддонами

### 2.1. Назначение поддона на станок

**Запрос:**
- **URL**: `POST /pallet-operations/assign-to-machine`
- **Тело запроса**:
```json
{
  "palletId": 1,
  "machineId": 1,
  "processStepId": 1,
  "operatorId": 2 // Опционально
}
```

**Ответ:**
```json
{
  "message": "Поддон успешно назначен на станок",
  "operation": {
    "id": 1,
    "status": "IN_PROGRESS",
    "startedAt": "2023-05-15T10:30:00.000Z",
    "quantity": 20,
    "productionPallet": {
      "id": 1,
      "name": "Поддон A1"
    },
    "machine": {
      "id": 1,
      "name": "Станок №1",
      "status": "ACTIVE"
    },
    "processStep": {
      "id": 1,
      "name": "Раскрой"
    },
    "operator": {
      "id": 2,
      "username": "operatorUser",
      "details": {
        "fullName": "Оператор Завода"
      }
    }
  }
}
```

**Важно:**
- Если поддон находится в буфере, он будет автоматически удален из ячейки буфера.
- Если для данного поддона и этапа процесса уже существует приостановленная операция (status = BUFFERED), она будет возобновлена.
- Если для поддона уже есть активная операция, будет возвращена ошибка.

### 2.2. Перемещение поддона в буфер (приостановка операции)

**Запрос:**
- **URL**: `POST /pallet-operations/move-to-buffer`
- **Тело запроса**:
```json
{
  "operationId": 1,
  "bufferCellId": 1
}
```

**Ответ:**
```json
{
  "message": "Поддон успешно перемещен в буфер",
  "operation": {
    "id": 1,
    "status": "BUFFERED",
    "startedAt": "2023-05-15T10:30:00.000Z",
    "productionPallet": {
      "id": 1,
      "name": "Поддон A1"
    },
    "processStep": {
      "id": 1,
      "name": "Раскрой"
    }
  }
}
```

**Важно:**
- Только операции в статусе IN_PROGRESS могут быть приостановлены
- Ячейка буфера должна быть в статусе AVAILABLE

### 2.3. Завершение операции

**Запрос:**
- **URL**: `POST /pallet-operations/complete`
- **Тело запроса**:
```json
{
  "operationId": 1,
  "masterId": 3 // Опционально
}
```

**Ответ:**
```json
{
  "message": "Операция успешно завершена",
  "operation": {
    "id": 1,
    "status": "COMPLETED",
    "startedAt": "2023-05-15T10:30:00.000Z",
    "completedAt": "2023-05-15T12:30:00.000Z",
    "quantity": 20,
    "productionPallet": {
      "id": 1,
      "name": "Поддон A1"
    },
    "machine": {
      "id": 1,
      "name": "Станок №1",
      "status": "ACTIVE"
    },
    "processStep": {
      "id": 1,
      "name": "Раскрой"
    },
    "operator": {
      "id": 2,
      "username": "operatorUser",
      "details": {
        "fullName": "Оператор Завода"
      }
    },
    "master": {
      "id": 3,
      "username": "masterUser",
      "details": {
        "fullName": "Мастер Производства"
      }
    }
  }
}
```

**Важно:**
- Только операции в статусе IN_PROGRESS могут быть завершены

## 3. Получение информации об операциях

### 3.1. Получение активных операций

**Запрос:**
- **URL**: `GET /pallet-operations/active`

**Ответ:**
```json
[
  {
    "id": 1,
    "status": "IN_PROGRESS",
    "startedAt": "2023-05-15T10:30:00.000Z",
    "quantity": 20,
    "machine": {
      "id": 1,
      "name": "Станок №1",
      "status": "ACTIVE"
    },
    "processStep": {
      "id": 1,
      "name": "Раскрой"
    },
    "productionPallet": {
      "id": 1,
      "name": "Поддон A1",
      "detail": {
        "id": 1,
        "article": "A1",
        "name": "Деталь A1"
      }
    },
    "operator": {
      "id": 2,
      "username": "operatorUser",
      "details": {
        "fullName": "Оператор Завода"
      }
    }
  }
]
```

### 3.2. Получение операций в буфере

**Запрос:**
- **URL**: `GET /pallet-operations/buffered`

**Ответ:**
```json
[
  {
    "id": 2,
    "status": "BUFFERED",
    "startedAt": "2023-05-15T10:30:00.000Z",
    "quantity": 15,
    "processStep": {
      "id": 2,
      "name": "Присадка"
    },
    "productionPallet": {
      "id": 2,
      "name": "Поддон A2",
      "detail": {
        "id": 2,
        "article": "A2",
        "name": "Деталь A2"
      },
      "bufferCell": {
        "id": 1,
        "code": "A1",
        "buffer": {
          "id": 1,
          "name": "Основной буфер"
        }
      }
    }
  }
]
```

### 3.3. Получение истории операций для поддона

**Запрос:**
- **URL**: `GET /pallet-operations/history/:palletId`
- **Параметры пути**: 
  - `palletId` - ID поддона (число)

**Ответ:**
```json
{
  "palletId": 1,
  "palletName": "Поддон A1",
  "detailId": 1,
  "operations": [
    {
      "id": 3,
      "status": "IN_PROGRESS",
      "startedAt": "2023-05-15T14:30:00.000Z",
      "quantity": 20,
      "processStep": {
        "id": 3,
        "name": "Поклейка"
      },
      "machine": {
        "id": 1,
        "name": "Станок №1",
        "status": "ACTIVE"
      },
      "operator": {
        "id": 2,
        "username": "operatorUser",
        "details": {
          "fullName": "Оператор Завода"
        }
      }
    },
    {
      "id": 2,
      "status": "COMPLETED",
      "startedAt": "2023-05-15T12:30:00.000Z",
      "completedAt": "2023-05-15T14:00:00.000Z",
      "quantity": 20,
      "processStep": {
        "id": 2,
        "name": "Присадка"
      },
      "machine": {
        "id": 1,
        "name": "Станок №1",
        "status": "ACTIVE"
      },
      "operator": {
        "id": 2,
        "username": "operatorUser",
        "details": {
          "fullName": "Оператор Завода"
        }
      },
      "master": {
        "id": 3,
        "username": "masterUser",
        "details": {
          "fullName": "Мастер Производства"
        }
      }
    },
    {
      "id": 1,
      "status": "COMPLETED",
      "startedAt": "2023-05-15T10:30:00.000Z",
      "completedAt": "2023-05-15T12:00:00.000Z",
      "quantity": 20,
      "processStep": {
        "id": 1,
        "name": "Раскрой"
      },
      "machine": {
        "id": 1,
        "name": "Станок №1",
        "status": "ACTIVE"
      },
      "operator": {
        "id": 2,
        "username": "operatorUser",
        "details": {
          "fullName": "Оператор Завода"
        }
      },
      "master": {
        "id": 3,
        "username": "masterUser",
        "details": {
          "fullName": "Мастер Производства"
        }
      }
    }
  ]
}
```

## 4. Коды ошибок и их обработка

### 4.1. Ошибки типа 404 (Not Found)
- Поддон с ID {palletId} не найден
- Станок с ID {machineId} не найден
- Этап процесса с ID {processStepId} не найден
- Операция с ID {operationId} не найдена
- Ячейка буфера с ID {bufferCellId} не найдена

### 4.2. Ошибки типа 400 (Bad Request)
- Станок {machine.name} (ID: {machineId}) не готов к работе. Текущий статус: {machine.status}
- Поддон {pallet.name} (ID: {palletId}) уже находится в обработке (операция ID: {existingOperation.id})
- Только активные операции можно приостановить. Текущий статус: {operation.status}
- Ячейка буфера {bufferCell.code} недоступна. Текущий статус: {bufferCell.status}
- Только активные операции можно завершить. Текущий статус: {operation.status}

### 4.3. Ошибки типа 500 (Internal Server Error)
- Произошла ошибка при назначении поддона на станок
- Произошла ошибка при перемещении поддона в буфер
- Произошла ошибка при завершении операции
- Произошла ошибка при получении активных операций
- Произошла ошибка при получении операций в буфере
- Произошла ошибка при получении истории операций поддона

## 5. Типичные сценарии использования API

### 5.1. Полный цикл обработки поддона
1. Назначить поддон на станок для этапа "Раскрой" (`/pallet-operations/assign-to-machine`)
2. Завершить операцию раскроя (`/pallet-operations/complete`)
3. Назначить поддон на станок для этапа "Присадка" (`/pallet-operations/assign-to-machine`)
4. Приостановить операцию и переместить в буфер (`/pallet-operations/move-to-buffer`)
5. Позже возобновить операцию, назначив поддон снова на станок (`/pallet-operations/assign-to-machine`)
6. Завершить операцию присадки (`/pallet-operations/complete`)
7. Назначить поддон на станок для этапа "Поклейка" (`/pallet-operations/assign-to-machine`)
8. Завершить операцию поклейки (`/pallet-operations/complete`)

### 5.2. Мониторинг операций
1. Получить список всех активных операций (`/pallet-operations/active`)
2. Получить список всех операций в буфере (`/pallet-operations/buffered`)
3. Для определенного поддона получить историю операций (`/pallet-operations/history/:palletId`)
