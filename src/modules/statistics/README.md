# Модуль статистики производства

## Описание

Модуль предоставляет API для получения статистики производства по потокам и этапам.

## Endpoints

### 1. Получить список потоков
```
GET /statistics/production-lines
```

**Ответ:**
```json
[
  {
    "lineId": 1,
    "lineName": "Линия 1",
    "lineType": "автоматическая"
  }
]
```

### 2. Получить статистику по потоку
```
GET /statistics/production-line?lineId=1&dateRangeType=DAY&date=2024-01-15&unit=PIECES
```

**Параметры:**
- `lineId` (number, обязательный) - ID потока
- `dateRangeType` (enum, обязательный) - Тип диапазона: `DAY`, `WEEK`, `MONTH`, `YEAR`, `CUSTOM`
- `date` (string, опционально) - Дата для расчета (ISO формат). Используется для DAY, WEEK, MONTH, YEAR
- `startDate` (string, обязательный для CUSTOM) - Начало диапазона
- `endDate` (string, обязательный для CUSTOM) - Конец диапазона
- `unit` (enum, опционально, по умолчанию PIECES) - Единица измерения: `PIECES` или `SQUARE_METERS`

**Ответ:**
```json
[
  {
    "stageId": 1,
    "stageName": "Раскрой",
    "value": 1500,
    "unit": "PIECES"
  },
  {
    "stageId": 2,
    "stageName": "Кромление",
    "value": 1200,
    "unit": "PIECES"
  }
]
```

### 3. Получить статистику по этапу (станки)
```
GET /statistics/stage?lineId=1&stageId=1&dateRangeType=DAY&date=2024-01-15&unit=PIECES
```

**Параметры:**
- `lineId` (number, обязательный) - ID потока
- `stageId` (number, обязательный) - ID этапа
- `dateRangeType` (enum, обязательный) - Тип диапазона: `DAY`, `WEEK`, `MONTH`, `YEAR`, `CUSTOM`
- `date` (string, опционально) - Дата для расчета
- `startDate` (string, обязательный для CUSTOM) - Начало диапазона
- `endDate` (string, обязательный для CUSTOM) - Конец диапазона
- `unit` (enum, опционально, по умолчанию PIECES) - Единица измерения: `PIECES` или `SQUARE_METERS`

**Ответ:**
```json
[
  {
    "machineId": 1,
    "machineName": "Станок 1",
    "value": 500,
    "unit": "PIECES"
  },
  {
    "machineId": 2,
    "machineName": "Станок 2",
    "value": 700,
    "unit": "PIECES"
  }
]
```

## Логика расчета

### Для обычных этапов:
1. Получаем все маршруты, привязанные к потоку
2. Фильтруем этапы маршрута по stageId
3. Находим завершенные `PalletStageProgress` за указанный период
4. Проверяем, что поддон проходил именно этот этап в рамках маршрута потока
5. Суммируем количество деталей (штуки или м²)

### Для финального этапа (упаковка):
1. Получаем завершенные упаковки (`Package` со статусом `COMPLETED`)
2. Проверяем состав упаковки (`PackageComposition`)
3. Считаем количество деталей в упаковках с учетом `quantityPerPackage` и `quantity`
4. Для м² используем `finishedLength` и `finishedWidth`

### Для станков:
1. Получаем `MachineAssignment` для конкретного станка
2. Фильтруем по `routeStageId` (этапы маршрута потока)
3. Считаем обработанные поддоны за период
4. Суммируем количество (штуки или м²)

## Примеры использования

### День
```
GET /statistics/production-line?lineId=1&dateRangeType=DAY&date=2024-01-15&unit=PIECES
```

### Неделя
```
GET /statistics/production-line?lineId=1&dateRangeType=WEEK&date=2024-01-15&unit=PIECES
```

### Месяц
```
GET /statistics/production-line?lineId=1&dateRangeType=MONTH&date=2024-01-15&unit=SQUARE_METERS
```

### Год
```
GET /statistics/production-line?lineId=1&dateRangeType=YEAR&date=2024-01-15&unit=PIECES
```

### Произвольный диапазон
```
GET /statistics/production-line?lineId=1&dateRangeType=CUSTOM&startDate=2024-01-01&endDate=2024-01-31&unit=PIECES
```
